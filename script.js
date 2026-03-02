// Unregister any existing service workers to prevent caching
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
    });
}

// Clear browser cache for this domain
function clearBrowserCache() {
    if (caches) {
        // Delete all caches for this domain
        caches.keys().then(function(names) {
            for (let name of names) {
                caches.delete(name);
            }
        });
    }
}

// Clear cache when the page loads
clearBrowserCache();

// AdSense Configuration
const ADSENSE_CONFIG = {
    publisherId: 'ca-pub-XXXXXXXXXXXXXXXXX', // TODO: Replace with your AdSense Publisher ID
    enabled: false // Set to true after getting AdSense approval
};

// Load Google AdSense script
function loadAdSense() {
    if (!ADSENSE_CONFIG.enabled) {
        console.log('AdSense is disabled in config');
        return;
    }

    try {
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        script.setAttribute('data-ad-client', ADSENSE_CONFIG.publisherId);
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onerror = () => {
            console.warn('Failed to load AdSense script');
        };
        document.head.appendChild(script);
        console.log('AdSense script loaded');
    } catch (error) {
        console.error('Error loading AdSense:', error);
    }
}

// Initialize AdSense ads after page loads
function initializeAds() {
    if (!ADSENSE_CONFIG.enabled || typeof window.adsbygoogle === 'undefined') {
        return;
    }

    try {
        const ads = document.querySelectorAll('.adsbygoogle');
        ads.forEach((ad) => {
            if (!ad.hasAttribute('data-adsbygoogle-status')) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        });
    } catch (error) {
        console.error('Error initializing ads:', error);
    }
}

// Show banner ad containers when AdSense is enabled
function showBannerAds() {
    if (!ADSENSE_CONFIG.enabled) {
        return;
    }

    const topAd = document.getElementById('top-banner-ad');
    const bottomAd = document.getElementById('bottom-banner-ad');

    if (topAd) {
        topAd.style.display = 'block';
        // Update the ad client ID in the ad unit
        const topAdIns = topAd.querySelector('.adsbygoogle');
        if (topAdIns) {
            topAdIns.setAttribute('data-ad-client', ADSENSE_CONFIG.publisherId);
        }
    }

    if (bottomAd) {
        bottomAd.style.display = 'block';
        // Update the ad client ID in the ad unit
        const bottomAdIns = bottomAd.querySelector('.adsbygoogle');
        if (bottomAdIns) {
            bottomAdIns.setAttribute('data-ad-client', ADSENSE_CONFIG.publisherId);
        }
    }

    // Initialize the ads
    setTimeout(() => initializeAds(), 100);
}

// State management
const state = {
    allEvents: [],
    filteredEvents: [],
    eventTypes: new Set(),
    currentPage: 1,
    eventsPerPage: 9,
    isLoading: true,
    hasError: false,
    errorMessage: '',
    searchTerm: '',
    selectedType: 'all',
    statsMinimized: localStorage.getItem('statsMinimized') === 'true',
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth()
};

// DOM elements
const eventsContainer = document.getElementById('events');
const statusElement = document.getElementById('status');
const lastUpdatedElement = document.getElementById('last-updated');
const searchElement = document.getElementById('search');
const searchButton = document.getElementById('search-btn');
const clearSearchButton = document.getElementById('clear-search');
const backupButton = document.getElementById('backup-btn');
const backupStatusElement = document.getElementById('backup-status');
const paginationElement = document.getElementById('pagination');
const prevButton = document.getElementById('prev-btn');
const nextButton = document.getElementById('next-btn');
const pageInfoElement = document.getElementById('page-info');
const calendarNavElement = document.getElementById('calendar-nav');
// DOM elements for statistics
const statsContainer = document.getElementById('stats-container');
const marAlagoCountElement = document.getElementById('maralago-count');
const golfCountElement = document.getElementById('golf-count');
const lidHoursElement = document.getElementById('lid-hours');
const lidAvgElement = document.getElementById('lid-avg');
const daysInOfficeCountElement = document.getElementById('days-in-office-count');
const statsToggleButton = document.getElementById('stats-toggle');

// Auto backup state
let autoBackupEnabled = localStorage.getItem('autoBackupEnabled') === 'true';

// Format date for display
function formatDate(dateString) {
    // Add time (noon) to ensure consistent timezone handling
    const date = new Date(`${dateString}T12:00:00`);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format date for section headers
function formatDateForSection(dateString) {
    // Add time (noon) to ensure consistent timezone handling
    const date = new Date(`${dateString}T12:00:00`);
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format time for display
function formatTime(timeString) {
    if (!timeString) return 'Time not specified';
    
    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
    const date = new Date(`2000-01-01T${timeString}`);
    return date.toLocaleTimeString('en-US', options);
}

// Get source class name based on event type
function getSourceClassName(type) {
    if (!type) return '';
    
    const sourceType = type.toLowerCase();
    if (sourceType.includes('press briefing')) return 'source-press-briefing';
    if (sourceType.includes('official schedule')) return 'source-official-schedule';
    if (sourceType.includes('pool call time')) return 'source-pool-call-time';
    if (sourceType.includes('potus_schedule')) return 'source-potus-schedule';
    if (sourceType.includes('pool report')) return 'source-pool-report';
    if (sourceType.includes('axios')) return 'source-axios';
    
    return '';
}

// Format source name for display
function formatSourceName(type) {
    if (!type) return 'Unspecified Source';
    
    if (type.toLowerCase().includes('potus_schedule')) return '@POTUS_Schedule';
    
    // Convert camelCase or underscores to spaces and capitalize
    return type
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
        .trim();
}

// Create event card
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    
    // Format time display
    const startTimeStr = formatTime(event.timeStart);
    const endTimeStr = event.timeEnd ? formatTime(event.timeEnd) : '';
    const timeDisplay = endTimeStr ? `${startTimeStr} - ${endTimeStr}` : startTimeStr;
    
    // Get source information
    const sourceClassName = getSourceClassName(event.type);
    const sourceName = formatSourceName(event.type);

    card.innerHTML = `
        <div class="event-date">
            <div class="event-time">${timeDisplay}</div>
        </div>
        ${sourceClassName ? `<div class="event-source ${sourceClassName}">${sourceName}</div>` : ''}
        <div class="event-details">
            <div class="event-location">${event.location || 'Location not specified'}</div>
            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
            ${event.url ? `<a href="${event.url}" target="_blank" class="event-link">More information</a>` : ''}
            ${!sourceClassName ? `<div class="event-source-tag">Source: ${sourceName}</div>` : ''}
        </div>
    `;

    return card;
}

// Filter events based on current filters
function filterEvents() {
    state.filteredEvents = state.allEvents.filter(event => {
        // Search filter
        const searchLower = state.searchTerm.toLowerCase();
        const searchMatch = !state.searchTerm || 
            (event.title && event.title.toLowerCase().includes(searchLower)) ||
            (event.description && event.description.toLowerCase().includes(searchLower)) ||
            (event.location && event.location.toLowerCase().includes(searchLower));
        
        return searchMatch;
    });

    state.currentPage = 1;
    renderCalendar();
}

// Clear search and reset filters
function clearSearch() {
    searchElement.value = '';
    state.searchTerm = '';
    filterEvents();
}

// Save current data to localStorage
function backupData(silent = false) {
    try {
        const dataToSave = {
            events: state.allEvents,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        };
        
        localStorage.setItem('presidentCalendarBackup', JSON.stringify(dataToSave));
        
        if (!silent) {
            showBackupStatus('✓ Data saved successfully!', 'success');
            
            setTimeout(() => {
                backupStatusElement.textContent = '';
                backupStatusElement.className = 'backup-status';
            }, 3000);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
        if (!silent) {
            showBackupStatus('❌ Failed to save data', 'error');
        }
        return false;
    }
}

// Toggle auto-backup functionality
function toggleAutoBackup() {
    autoBackupEnabled = !autoBackupEnabled;
    localStorage.setItem('autoBackupEnabled', autoBackupEnabled);
    updateBackupButtonState();
    
    if (autoBackupEnabled) {
        showBackupStatus('Auto backup enabled', 'success');
        backupData(true);
    } else {
        showBackupStatus('Auto backup disabled', 'info');
    }
}

// Update backup button appearance based on state
function updateBackupButtonState() {
    if (autoBackupEnabled) {
        backupButton.classList.add('active');
        backupButton.textContent = 'Auto Backup: ON';
    } else {
        backupButton.classList.remove('active');
        backupButton.textContent = 'Auto Backup: OFF';
    }
}

// Perform auto backup if enabled
function performAutoBackupIfEnabled() {
    if (autoBackupEnabled && state.allEvents.length > 0) {
        backupData(true);
    }
}

// Show backup status message
function showBackupStatus(message, type = 'info') {
    backupStatusElement.textContent = message;
    backupStatusElement.className = `backup-status ${type}`;
}

// Load data from localStorage (if available)
function loadBackupData() {
    try {
        const savedData = localStorage.getItem('presidentCalendarBackup');
        
        if (!savedData) {
            return null;
        }
        
        return JSON.parse(savedData);
    } catch (error) {
        console.error('Error loading backup data:', error);
        return null;
    }
}

// Render calendar month grid
// Render a scrollable list of search results in place of the calendar grid
function renderSearchResults() {
    eventsContainer.classList.add('search-mode');
    const results = state.filteredEvents;
    const term = state.searchTerm;

    let html = '<div class="search-results">';

    if (results.length === 0) {
        html += `<div class="search-results-empty">No results for "<strong>${term}</strong>"</div>`;
        html += '</div>';
        eventsContainer.innerHTML = html;
        return;
    }

    html += `<div class="search-results-header">${results.length} result${results.length !== 1 ? 's' : ''} for "<strong>${term}</strong>"</div>`;

    results.forEach((event, idx) => {
        const color = getSourceColor(event.type);
        const sourceName = formatSourceName(event.type);
        const dateDisplay = event.date ? formatDateForSection(event.date) : '';
        const timeStr = event.timeStart ? formatTime(event.timeStart) : '';
        const title = getEventDisplayTitle(event);

        html += `<button class="search-result-item" data-idx="${idx}">` +
            `<div class="search-result-color" style="background-color:${color};"></div>` +
            `<div class="search-result-body">` +
            `<div class="search-result-date">${dateDisplay}</div>` +
            `<div class="search-result-title">${title}</div>` +
            (timeStr ? `<div class="search-result-time">${timeStr}</div>` : '') +
            (event.location ? `<div class="search-result-loc">${event.location}</div>` : '') +
            `</div>` +
            `<span class="search-result-badge" style="background-color:${color};">${sourceName}</span>` +
            `</button>`;
    });

    html += '</div>';
    eventsContainer.innerHTML = html;

    eventsContainer.querySelectorAll('.search-result-item').forEach(btn => {
        const idx = parseInt(btn.dataset.idx, 10);
        btn.addEventListener('click', () => showEventModal(results[idx]));
    });
}

function renderCalendar() {
    // When a search is active, show a scrollable results list instead of the grid
    if (state.searchTerm) {
        renderSearchResults();
        return;
    }

    eventsContainer.classList.remove('search-mode');
    eventsContainer.innerHTML = '';

    const year = state.calendarYear;
    const month = state.calendarMonth;

    // Update month label
    const monthLabel = document.getElementById('cal-month-label');
    if (monthLabel) {
        monthLabel.textContent = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Build eventsByDate map for this month only
    const eventsByDate = {};
    state.filteredEvents.forEach(event => {
        if (!event.date) return;
        const dateKey = event.date.split('T')[0];
        const parts = dateKey.split('-');
        if (parseInt(parts[0], 10) !== year || parseInt(parts[1], 10) - 1 !== month) return;
        if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
        eventsByDate[dateKey].push(event);
    });

    const todayStr = getTodayString();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totalCells = firstDayOfWeek + daysInMonth;
    const totalWeeks = Math.ceil(totalCells / 7);

    let html = '<div class="cal-grid">';

    // Header row
    html += '<div class="cal-header-row">';
    dayNames.forEach(d => { html += `<div class="cal-header-cell">${d}</div>`; });
    html += '</div>';

    // Body — one .cal-week div per row so CSS can distribute height equally
    html += '<div class="cal-body">';

    for (let week = 0; week < totalWeeks; week++) {
        html += '<div class="cal-week">';
        for (let dow = 0; dow < 7; dow++) {
            const cellNum = week * 7 + dow;
            const day = cellNum - firstDayOfWeek + 1;

            if (day < 1 || day > daysInMonth) {
                html += '<div class="cal-day cal-day--empty"></div>';
                continue;
            }

            const mm = String(month + 1).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            const dateKey = `${year}-${mm}-${dd}`;
            const isToday = dateKey === todayStr;
            const dayEvents = eventsByDate[dateKey] || [];

            html += `<div class="cal-day${isToday ? ' cal-day--today' : ''}">`;
            html += `<span class="cal-day-number${isToday ? ' cal-day-number--today' : ''}">${day}</span>`;
            html += '<div class="cal-events-list">';

            const maxPills = 3;
            const visibleEvents = dayEvents.slice(0, maxPills);
            const overflow = dayEvents.length - maxPills;

            visibleEvents.forEach((event, idx) => {
                const color = getSourceColor(event.type);
                const timeSuffix = event.timeStart ? ' ' + formatTime(event.timeStart) : '';
                const label = getEventDisplayTitle(event) + timeSuffix;
                const safeLabel = label.replace(/"/g, '&quot;');
                html += `<button class="cal-event-pill" data-date="${dateKey}" data-idx="${idx}" style="--event-color:${color};" title="${safeLabel}">` +
                    `<span class="cal-event-dot" style="background-color:${color};"></span>` +
                    `<span class="cal-pill-text">${label}</span>` +
                    `</button>`;
            });

            if (overflow > 0) {
                html += `<button class="cal-more-btn" data-date="${dateKey}">+${overflow} more</button>`;
            }

            html += '</div></div>';
        }
        html += '</div>'; // close .cal-week
    }

    html += '</div></div>'; // close .cal-body and .cal-grid
    eventsContainer.innerHTML = html;

    // Measure where #events starts and set an explicit pixel height so
    // the CSS height:100% chain (.cal-grid → .cal-body → .cal-week flex:1)
    // has a definite parent height to distribute from.
    sizeCalendarToViewport();

    // Attach pill click listeners
    eventsContainer.querySelectorAll('.cal-event-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const dateKey = btn.dataset.date;
            const idx = parseInt(btn.dataset.idx, 10);
            showEventModal((eventsByDate[dateKey] || [])[idx]);
        });
    });

    // Attach overflow click listeners
    eventsContainer.querySelectorAll('.cal-more-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showDayOverflowModal(btn.dataset.date, eventsByDate[btn.dataset.date] || []);
        });
    });
}

// Height is handled by CSS flex within .cal-main; clear any stale inline value
function sizeCalendarToViewport() {
    eventsContainer.style.height = '';
}

// Initialize calendar navigation buttons and modal close
function initializeCalendarNav() {
    document.getElementById('cal-prev-btn').addEventListener('click', () => {
        state.calendarMonth--;
        if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
        renderCalendar();
    });
    document.getElementById('cal-next-btn').addEventListener('click', () => {
        state.calendarMonth++;
        if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
        renderCalendar();
    });
    document.getElementById('cal-today-btn').addEventListener('click', () => {
        state.calendarYear = new Date().getFullYear();
        state.calendarMonth = new Date().getMonth();
        renderCalendar();
    });
    document.getElementById('modal-close').addEventListener('click', closeEventModal);
    document.querySelector('.event-modal-backdrop').addEventListener('click', closeEventModal);

    // Info modal
    const infoModal = document.getElementById('info-modal');
    const openInfoModal = () => { infoModal.style.display = 'flex'; document.body.classList.add('modal-open'); };
    const closeInfoModal = () => { infoModal.style.display = 'none'; document.body.classList.remove('modal-open'); };
    document.getElementById('info-btn').addEventListener('click', openInfoModal);
    document.getElementById('info-modal-close').addEventListener('click', closeInfoModal);
    document.querySelector('.info-modal-backdrop').addEventListener('click', closeInfoModal);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeEventModal();
            closeInfoModal();
        }
    });
    window.addEventListener('resize', sizeCalendarToViewport);
}

// Return a meaningful display label for a calendar event pill or modal
// The API data has no title/summary/name fields, so we derive it from
// description → location → source type (mirroring how createEventCard works)
function getEventDisplayTitle(event) {
    return event.description || event.location || formatSourceName(event.type) || 'Event';
}

// Return hex color for a given event source type
function getSourceColor(type) {
    if (!type) return '#64748b';
    const t = type.toLowerCase();
    if (t.includes('press briefing')) return '#ef4444';
    if (t.includes('official schedule')) return '#3b82f6';
    if (t.includes('pool call time')) return '#8b5cf6';
    if (t.includes('potus_schedule')) return '#10b981';
    if (t.includes('pool report')) return '#f59e0b';
    if (t.includes('axios')) return '#ec4899';
    return '#64748b';
}

// Return today's date as YYYY-MM-DD (timezone-safe)
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Show event detail modal
function showEventModal(event) {
    if (!event) return;
    const modal = document.getElementById('event-modal');
    const body = document.getElementById('modal-body');
    const color = getSourceColor(event.type);
    const sourceName = formatSourceName(event.type);
    const startTimeStr = event.timeStart ? formatTime(event.timeStart) : '';
    const endTimeStr = event.timeEnd ? formatTime(event.timeEnd) : '';
    const timeDisplay = endTimeStr ? `${startTimeStr} \u2013 ${endTimeStr}` : startTimeStr;
    const dateDisplay = event.date ? formatDateForSection(event.date) : '';

    const modalTitle = getEventDisplayTitle(event);
    // Only show description separately if it differs from the derived title
    const showDescription = event.description && event.description !== modalTitle;

    body.innerHTML = `
        <div class="modal-source-badge" style="background-color:${color};">${sourceName}</div>
        <div class="modal-title">${modalTitle}</div>
        <div class="modal-meta">
            ${timeDisplay ? `<span class="modal-time">${timeDisplay}</span>` : ''}
            ${event.location ? `<span class="modal-location">${event.location}</span>` : ''}
        </div>
        ${dateDisplay ? `<div class="modal-date">${dateDisplay}</div>` : ''}
        ${showDescription ? `<div class="modal-description">${event.description}</div>` : ''}
        ${event.url ? `<a href="${event.url}" target="_blank" rel="noopener noreferrer" class="modal-link">More information \u2192</a>` : ''}
    `;

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

// Show all events for a day as a clickable list in the modal
function showDayOverflowModal(dateKey, events) {
    const modal = document.getElementById('event-modal');
    const body = document.getElementById('modal-body');
    const dateDisplay = formatDateForSection(dateKey);

    const itemsHtml = events.map((event, idx) => {
        const color = getSourceColor(event.type);
        const timeStr = event.timeStart ? formatTime(event.timeStart) : '';
        return `
            <div class="modal-day-event-item" data-idx="${idx}">
                <div class="modal-day-event-color" style="background-color:${color};"></div>
                <div>
                    <div class="modal-day-event-title">${getEventDisplayTitle(event)}</div>
                    ${timeStr ? `<div class="modal-day-event-time">${timeStr}</div>` : ''}
                    ${event.location ? `<div class="modal-day-event-loc">${event.location}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    body.innerHTML = `
        <div class="modal-title">${dateDisplay}</div>
        <div class="modal-day-event-list">${itemsHtml}</div>
    `;

    body.querySelectorAll('.modal-day-event-item').forEach((item, idx) => {
        item.addEventListener('click', () => showEventModal(events[idx]));
    });

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

// Close the event detail modal
function closeEventModal() {
    document.getElementById('event-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Initialize search functionality
function initializeFilters() {
    let searchDebounceTimer = null;

    // Real-time search: update results as the user types (debounced 200ms)
    searchElement.addEventListener('input', () => {
        clearSearchButton.style.display = searchElement.value.trim() !== '' ? 'block' : 'none';
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            state.searchTerm = searchElement.value.trim();
            filterEvents();
        }, 200);
    });

    // Also run immediately on Enter / button click (cancels pending debounce)
    searchButton.addEventListener('click', () => {
        clearTimeout(searchDebounceTimer);
        state.searchTerm = searchElement.value.trim();
        filterEvents();
    });

    searchElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchDebounceTimer);
            state.searchTerm = searchElement.value.trim();
            filterEvents();
        }
    });

    // Clear search button functionality
    clearSearchButton.addEventListener('click', clearSearch);

    // Initially hide the clear button if search is empty
    clearSearchButton.style.display = searchElement.value.trim() !== '' ? 'block' : 'none';

    // Set up backup button functionality
    backupButton.addEventListener('click', toggleAutoBackup);

    // Initialize backup button state
    updateBackupButtonState();

    // Initialize calendar navigation and modal
    initializeCalendarNav();
}

// Update UI based on loading/error state
function updateStatus() {
    if (state.isLoading) {
        statusElement.className = 'status-message loading';
        statusElement.textContent = 'Loading events...';
        statusElement.style.display = 'block';
        if (calendarNavElement) calendarNavElement.style.display = 'none';
    } else if (state.hasError) {
        statusElement.className = 'status-message error';
        statusElement.textContent = state.errorMessage || 'An error occurred while loading events.';
        statusElement.style.display = 'block';
        if (calendarNavElement) calendarNavElement.style.display = 'none';
    } else {
        statusElement.style.display = 'none';
        if (calendarNavElement) calendarNavElement.style.display = 'flex';
    }
}

// Fetch and process data
async function fetchCalendarData() {
    try {
        state.isLoading = true;
        updateStatus();

        // Try to fetch online data first
        let data;
        let usingBackup = false;
        
        try {
            // Use the Cloudflare Worker URL
            const workerUrl = 'https://where-is-the-president.miles-gilbert.workers.dev/';
            
            const response = await fetch(workerUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }

            const rawText = await response.text();
            
            // Try to parse the JSON
            try {
                data = JSON.parse(rawText);
            } catch (jsonError) {
                throw new Error(`Failed to parse JSON: ${jsonError.message}`);
            }
        } catch (fetchError) {
            console.warn("Failed to fetch online data, trying backup:", fetchError);
            
            // Try to load from backup
            const backupData = loadBackupData();
            
            if (backupData && backupData.events && backupData.events.length > 0) {
                console.log("Using backup data from:", backupData.lastUpdated);
                data = { data: backupData.events };
                usingBackup = true;
            } else {
                // If no backup is available, rethrow the original error
                throw fetchError;
            }
        }
        
        // Check if data has the expected structure
        if (!data) {
            throw new Error("Invalid data format received");
        }
        
        // If using backup data, show a message to the user
        if (usingBackup) {
            const backupMessage = document.createElement('div');
            backupMessage.className = 'status-message warning';
            backupMessage.textContent = 'Using locally saved data. Connect to the internet for the latest information.';
            eventsContainer.prepend(backupMessage);
        }
        
        // Process the data, being more flexible with the structure
        const events = [];
        
        // Check for different possible data structures
        if (data && Array.isArray(data)) {
            events.push(...data);
        } else if (data && data.data && Array.isArray(data.data)) {
            events.push(...data.data);
        } else if (data && typeof data === 'object') {
            Object.values(data).forEach(value => {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (item && typeof item === 'object' && (item.title || item.date)) {
                            events.push(item);
                        }
                    });
                }
            });
        }
        
        if (events.length === 0) {
            throw new Error("No events found in the data");
        }
        
        // Filter out events without dates and normalize
        state.allEvents = events
            .filter(event => event.date || event.startDate || event.start)
            .map(event => {
                // Normalize the data structure
                const normalizedEvent = {
                    date: event.date || event.startDate || event.start,
                    timeStart: event.timeStart || event.time || (event.startTime ? event.startTime : null),
                    timeEnd: event.timeEnd || event.endTime || null,
                    title: event.title || event.summary || event.name || "Untitled Event",
                    location: event.location || event.venue || "",
                    description: event.description || event.details || "",
                    type: event.type || event.source || event.category || "",
                    url: event.url || event.link || ""
                };
                
                // Ensure the date is valid and has correct day of week
                try {
                    // Add time (noon) to ensure consistent timezone handling
                    let dateStr = normalizedEvent.date;
                    if (!dateStr.includes('T')) {
                        dateStr = `${dateStr}T12:00:00`;
                    }
                    
                    const eventDate = new Date(dateStr);
                    // If the date is valid, make sure we use the correct format
                    if (!isNaN(eventDate.getTime())) {
                        // Store the date in consistent format with manual UTC handling
                        // to avoid timezone issues
                        const year = eventDate.getFullYear();
                        const month = String(eventDate.getMonth() + 1).padStart(2, '0');
                        const day = String(eventDate.getDate()).padStart(2, '0');
                        normalizedEvent.date = `${year}-${month}-${day}`;
                    }
                } catch (e) {
                    console.warn("Error processing date:", normalizedEvent.date);
                }
                
                return normalizedEvent;
            });
        
        // Sort by date, newest first
        state.allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Extract event types
        state.allEvents.forEach(event => {
            if (event.type) {
                state.eventTypes.add(event.type);
            }
        });
        
        state.filteredEvents = [...state.allEvents];
        
        // Update last updated timestamp
        if (data.meta && data.meta.last_updated) {
            const lastUpdated = new Date(data.meta.last_updated);
            lastUpdatedElement.textContent = `Last updated: ${lastUpdated.toLocaleString()}`;
        } else {
            lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleString()}`;
        }
        
        // Initialize UI
        initializeFilters();
        renderCalendar();
        if (!state.hasError) {
            calculateEventStatistics();
            performAutoBackupIfEnabled();
            // Show banner ads if AdSense is enabled
            showBannerAds();
        }

    } catch (error) {
        console.error('Error fetching calendar data:', error);
        state.hasError = true;
        state.errorMessage = error.message;
    } finally {
        state.isLoading = false;
        updateStatus();
    }
}

// Initialize stats container state
function initializeStatsContainer() {
    if (statsContainer && statsToggleButton) {
        if (state.statsMinimized) {
            statsContainer.classList.add('minimized');
            statsToggleButton.querySelector('.toggle-icon').textContent = '▶';
        }

        statsToggleButton.addEventListener('click', () => {
            state.statsMinimized = !state.statsMinimized;
            localStorage.setItem('statsMinimized', state.statsMinimized);
            
            if (state.statsMinimized) {
                statsContainer.classList.add('minimized');
                statsToggleButton.querySelector('.toggle-icon').textContent = '▶';
            } else {
                statsContainer.classList.remove('minimized');
                statsToggleButton.querySelector('.toggle-icon').textContent = '▼';
            }
        });
    }
}

// Initialize the application
function initializeApp() {
    try {
        // Load AdSense script
        loadAdSense();

        initializeStatsContainer();
        fetchCalendarData();

        // If auto backup is enabled, save data after loading
        if (autoBackupEnabled && state.allEvents.length > 0) {
            setTimeout(() => backupData(true), 2000);
        }
    } catch(e) {
        console.error("Error initializing application:", e);
        const errorElement = document.createElement('div');
        errorElement.className = 'status-message error';
        errorElement.textContent = 'There was an error initializing the application. Please try refreshing the page.';
        document.querySelector('.container').prepend(errorElement);
    }
}

// create a function that counts days since January 20, 2025
function daysSince2025() {
    const today = new Date();
    const inaugurationDay = new Date(2025, 0, 20); // January 20, 2025
    const timeDifference = today - inaugurationDay;
    return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
}


// Calculate lid time statistics
function calculateLidTimeStatistics() {
    // Initialize counters and trackers
    let totalDaysWithLid = 0;
    let totalLidHours = 0;
    let averageLidTime = 0;
    
    // Create a Map to track lid times by date
    const lidTimesByDate = new Map();
    
    // Group events by date to find the last "full lid called" event for each day
    const eventsByDate = {};
    state.allEvents.forEach(event => {
        if (!event.date) return;
        // Extract just the date part (YYYY-MM-DD)
        const dateKey = event.date.split('T')[0];
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
    });
    
    // Process each day to find "full lid called" events
    Object.keys(eventsByDate).forEach(dateKey => {
        const dayEvents = eventsByDate[dateKey];
        
        // Find the full lid event if any
        const fullLidEvent = dayEvents.find(event => 
            event.description && 
            event.description.toLowerCase().includes('full lid called')
        );
        
        if (fullLidEvent && fullLidEvent.timeStart) {
            const [hours, minutes] = fullLidEvent.timeStart.split(':').map(Number);
            const minutesFromMidnight = hours * 60 + minutes;
            
            // Calculate lid time (minutes from lid call to midnight)
            const minutesToMidnight = 24 * 60 - minutesFromMidnight;
            const hoursToMidnight = minutesToMidnight / 60;
            
            // Store the lid time for this date
            lidTimesByDate.set(dateKey, {
                lidTime: hoursToMidnight,
                lidCallTime: fullLidEvent.time_formatted || `${hours}:${minutes.toString().padStart(2, '0')}`
            });
            
            // Update totals
            totalDaysWithLid++;
            totalLidHours += hoursToMidnight;
        }
    });
    
    // Calculate average lid time
    if (totalDaysWithLid > 0) {
        averageLidTime = totalLidHours / totalDaysWithLid;
    }
    
    // Return the statistics
    return {
        totalDaysWithLid,
        totalLidHours,
        averageLidHours: averageLidTime,
        lidTimesByDate
    };
}

// Format currency for display
function formatCurrency(amount) {
    if (amount >= 1000000) {
        return '$' + (amount / 1000000).toFixed(1) + 'M';
    }
    return '$' + amount.toLocaleString('en-US');
}

// Calculate event statistics
function calculateEventStatistics() {
    // Initialize counters
    let marALagoTrips = 0;
    let golfDays = 0;
    
    // Cost per round trip to Mar-a-Lago
    const COST_PER_TRIP = 3400000; // $3.4 million
    
    // Create a Set to track unique days for each category
    const marALagoDates = new Set();
    const golfDates = new Set();
    let lastMarALagoDate = null; // Track the last Mar-a-Lago visit to count trips

    // US Federal Holidays (2024)
    const holidays = new Set([
        '2024-01-01', // New Year's Day
        '2024-01-15', // Martin Luther King Jr. Day
        '2024-02-19', // Presidents Day
        '2024-05-27', // Memorial Day
        '2024-06-19', // Juneteenth
        '2024-07-04', // Independence Day
        '2024-09-02', // Labor Day
        '2024-10-14', // Columbus Day
        '2024-11-11', // Veterans Day
        '2024-11-28', // Thanksgiving Day
        '2024-12-25', // Christmas Day
    ]);
    
    // Sort events by date for trip counting
    const sortedEvents = [...state.allEvents].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );
    
    // Analyze all events
    sortedEvents.forEach(event => {
        const dateKey = event.date.split('T')[0]; // Get just the date part
        const eventDate = new Date(`${dateKey}T12:00:00`);
        const isWeekend = eventDate.getDay() === 0 || eventDate.getDay() === 6;
        
        // Check for Mar-a-Lago mentions (case insensitive)
        const locationLower = (event.location || '').toLowerCase();
        const descriptionLower = (event.description || '').toLowerCase();
        const titleLower = (event.title || '').toLowerCase();
        
        const isMarALagoEvent = 
            locationLower.includes('mar-a-lago') || 
            locationLower.includes('mar a lago') ||
            descriptionLower.includes('mar-a-lago') || 
            descriptionLower.includes('mar a lago') ||
            titleLower.includes('mar-a-lago') || 
            titleLower.includes('mar a lago');

        if (isMarALagoEvent) {
            marALagoDates.add(dateKey);
            
            // Count trips when there's a gap of more than 1 day between Mar-a-Lago visits
            if (lastMarALagoDate) {
                const daysBetween = Math.floor(
                    (eventDate - new Date(lastMarALagoDate + 'T12:00:00')) / (1000 * 60 * 60 * 24)
                );
                if (daysBetween > 1) {
                    marALagoTrips++; // Count as a new trip
                }
            } else {
                marALagoTrips++; // First trip
            }
            lastMarALagoDate = dateKey;
        }

        // Check for Trump property visits on weekdays
        if (!isWeekend && !holidays.has(dateKey)) {
            // Trump Properties
            const trumpProperties = {
                golfClubs: [
                    // US Golf Clubs
                    'trump international golf club palm beach',
                    'trump national golf club jupiter',
                    'trump national golf club washington',
                    'trump national doral',
                    'trump national golf club colts neck',
                    'trump national golf club westchester',
                    'trump national golf club hudson valley',
                    'trump national golf club bedminster',
                    'trump national golf club philadelphia',
                    'trump national golf club los angeles',
                    'trump national golf club charlotte',
                    // International Golf Clubs
                    'trump international golf links aberdeen',
                    'trump international golf links doonbeg',
                    'trump turnberry',
                ],
                hotels: [
                    // Hotels
                    'albemarle estate',
                    'trump winery',
                    'trump international hotel tower new york',
                    'trump international hotel tower chicago',
                    'trump international hotel washington',
                    'trump international hotel las vegas',
                ],
                otherProperties: [
                    // Commercial Properties
                    '40 wall street',
                    'trump tower',
                    'niketown',
                    // Other Properties
                    'trump vineyard estates',
                    'mar-a-lago',
                    'mar a lago',
                    'estates at trump national los angeles',
                    'le chateau des palmiers',
                    'seven springs',
                    'macleod house',
                ],
                // Common variations and shorthand references
                commonVariations: [
                    'trump national',
                    'trump international',
                    'trump golf',
                    'trump hotel',
                    'trump estate',
                    'trump club',
                    'bedminster',
                    'doral',
                    'turnberry',
                    'doonbeg',
                ]
            };

            // Check all property categories
            const isAtTrumpProperty = [
                ...trumpProperties.golfClubs,
                ...trumpProperties.hotels,
                ...trumpProperties.otherProperties,
                ...trumpProperties.commonVariations
            ].some(property => 
                locationLower.includes(property) || 
                descriptionLower.includes(property) || 
                titleLower.includes(property)
            );

            if (isAtTrumpProperty) {
                golfDates.add(dateKey);
            }
        }
    });
    
    // Add one final trip if there were any Mar-a-Lago visits (return trip)
    if (lastMarALagoDate) {
        marALagoTrips++;
    }
    
    // Calculate total Mar-a-Lago travel cost
    const totalTravelCost = marALagoTrips * COST_PER_TRIP;
    
    // Update counters with the number of unique days
    marALagoTrips = marALagoDates.size;
    golfDays = golfDates.size;
    
    // Calculate lid time statistics
    const lidStats = calculateLidTimeStatistics();
    
    // Update UI with the counts
    if (marAlagoCountElement) {
        marAlagoCountElement.textContent = formatCurrency(totalTravelCost);
    }
    if (golfCountElement) {
        golfCountElement.textContent = golfDays;
    }
    if (daysInOfficeCountElement) {
        daysInOfficeCountElement.textContent = daysSince2025();
    }
    
    // Update lid statistics if elements exist
    if (lidHoursElement) {
        lidHoursElement.textContent = Math.round(lidStats.totalLidHours);
    }
    
    if (lidAvgElement) {
        // Format the average time nicely (hours and minutes)
        const avgHours = Math.floor(lidStats.averageLidHours);
        const avgMinutes = Math.round((lidStats.averageLidHours - avgHours) * 60);
        lidAvgElement.textContent = `Avg: ${avgHours}h ${avgMinutes}m per day`;
    }
    
}

// Initialize the Mar-a-Lago specific page
async function initializeMarALagoPage() {
    // Check if we're on the Mar-a-Lago page
    if (!document.getElementById('maralago-count')) {
        return;
    }

    // Reset state properties instead of reassigning the state object
    state.allEvents = [];
    state.filteredEvents = [];
    state.currentPage = 1;
    state.eventsPerPage = 10;
    state.totalPages = 1;
    state.isLoading = false;
    state.error = null;

    // Initialize DOM elements
    const statusElement = document.getElementById('status');
    const lastUpdatedElement = document.getElementById('last-updated');
    const daysInOfficeElement = document.getElementById('days-in-office-count');

    try {
        // Show loading state
        if (statusElement) {
            statusElement.textContent = 'Loading data...';
            statusElement.className = 'status-message loading';
        }

        // Update days in office count
        if (daysInOfficeElement) {
            daysInOfficeElement.textContent = daysSince2025();
        }

        // Fetch events using the Cloudflare Worker URL
        const workerUrl = 'https://where-is-the-president.miles-gilbert.workers.dev/';
        const response = await fetch(workerUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Process the data, being more flexible with the structure
        let events = [];
        
        // Check for different possible data structures
        if (data && Array.isArray(data)) {
            events = data;
        } else if (data && data.data && Array.isArray(data.data)) {
            events = data.data;
        } else if (data && typeof data === 'object') {
            Object.values(data).forEach(value => {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (item && typeof item === 'object' && (item.title || item.date)) {
                            events.push(item);
                        }
                    });
                }
            });
        }
        
        if (events.length === 0) {
            throw new Error("No events found in the data");
        }
        
        // Filter for Mar-a-Lago events
        state.allEvents = events.filter(event => {
            const locationLower = (event.location || '').toLowerCase();
            const descriptionLower = (event.description || '').toLowerCase();
            const titleLower = (event.title || '').toLowerCase();
            
            return locationLower.includes('mar-a-lago') || 
                   locationLower.includes('mar a lago') ||
                   descriptionLower.includes('mar-a-lago') || 
                   descriptionLower.includes('mar a lago') ||
                   titleLower.includes('mar-a-lago') || 
                   titleLower.includes('mar a lago');
        });

        // Sort events by date (newest first)
        state.allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Set filtered events
        state.filteredEvents = state.allEvents;
        
        // Calculate and display statistics
        calculateMarALagoStatistics();
        
        // Update last updated timestamp
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleString()}`;
        }
        
        // Hide loading state and show content
        if (statusElement) {
            statusElement.style.display = 'none';
        }
        // Show Mar-a-Lago page ad if AdSense is enabled
        if (ADSENSE_CONFIG.enabled) {
            const maralagoAd = document.getElementById('maralago-banner-ad');
            if (maralagoAd) {
                maralagoAd.style.display = 'block';
                const adIns = maralagoAd.querySelector('.adsbygoogle');
                if (adIns) {
                    adIns.setAttribute('data-ad-client', ADSENSE_CONFIG.publisherId);
                }
                setTimeout(() => initializeAds(), 100);
            }
        }

    } catch (error) {
        console.error('Error loading events:', error);
        if (statusElement) {
            statusElement.textContent = 'Error loading data. Please try again later.';
            statusElement.className = 'status-message error';
        }
    }
}

// Calculate Mar-a-Lago specific statistics
function calculateMarALagoStatistics() {
    // Initialize counters
    let marALagoTrips = 0;
    let marALagoDays = 0;
    let lastMarALagoDate = null;
    
    // Cost per round trip to Mar-a-Lago
    const COST_PER_TRIP = 3400000; // $3.4 million
    
    // Sort events by date for trip counting
    const sortedEvents = [...state.allEvents].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );
    
    // Create a Set to track unique dates
    const uniqueDates = new Set();
    
    // Analyze all events
    sortedEvents.forEach(event => {
        const dateKey = event.date.split('T')[0]; // Get just the date part
        const eventDate = new Date(`${dateKey}T12:00:00`);
        
        // Add to unique dates set
        uniqueDates.add(dateKey);
        
        // Count trips when there's a gap of more than 1 day between Mar-a-Lago visits
        if (lastMarALagoDate) {
            const daysBetween = Math.floor(
                (eventDate - new Date(lastMarALagoDate + 'T12:00:00')) / (1000 * 60 * 60 * 24)
            );
            if (daysBetween > 1) {
                marALagoTrips++; // Count as a new trip
            }
        } else {
            marALagoTrips++; // First trip
        }
        lastMarALagoDate = dateKey;
    });
    
    // Add one final trip if there were any Mar-a-Lago visits (return trip)
    if (lastMarALagoDate) {
        marALagoTrips++;
    }
    
    // Calculate total travel cost
    const totalTravelCost = marALagoTrips * COST_PER_TRIP;
    
    // Update UI with the counts
    const marALagoCountElement = document.getElementById('maralago-count');
    const marALagoTripsElement = document.getElementById('maralago-trips');
    const marALagoDaysElement = document.getElementById('maralago-days');
    
    if (marALagoCountElement) {
        marALagoCountElement.textContent = formatCurrency(totalTravelCost);
    }
    if (marALagoTripsElement) {
        marALagoTripsElement.textContent = marALagoTrips;
    }
    if (marALagoDaysElement) {
        marALagoDaysElement.textContent = uniqueDates.size;
    }
}