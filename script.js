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
    selectedType: 'all'
};

// DOM elements
const eventsContainer = document.getElementById('events');
const statusElement = document.getElementById('status');
const filtersContainer = document.getElementById('filters');
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
const datePicker = document.getElementById('date-picker');
const goToDateButton = document.getElementById('go-to-date-btn');
// DOM elements for statistics
const statsContainer = document.getElementById('stats-container');
const marAlagoCountElement = document.getElementById('maralago-count');
const weekdayGolfCountElement = document.getElementById('weekday-golf-count');
const diplomatsCountElement = document.getElementById('diplomats-count');
const lidHoursElement = document.getElementById('lid-hours');
const lidAvgElement = document.getElementById('lid-avg');
const daysInOfficeCountElement = document.getElementById('days-in-office-count');

// List of federal holidays for 2024-2025
const federalHolidays = [
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
    '2025-01-01', // New Year's Day
    '2025-01-20', // Martin Luther King Jr. Day
    '2025-02-17', // Presidents Day
    '2025-05-26', // Memorial Day
    '2025-06-19', // Juneteenth
    '2025-07-04', // Independence Day
];

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
    renderEvents();
    updatePagination();
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

// Render events to DOM
function renderEvents() {
    eventsContainer.innerHTML = '';
    
    if (state.filteredEvents.length === 0) {
        const noEvents = document.createElement('div');
        noEvents.textContent = 'No events found matching your criteria.';
        noEvents.style.textAlign = 'center';
        noEvents.style.gridColumn = '1 / -1';
        noEvents.style.padding = '40px 20px';
        noEvents.style.color = 'var(--muted-text-color)';
        eventsContainer.appendChild(noEvents);
        return;
    }

    const startIndex = (state.currentPage - 1) * state.eventsPerPage;
    const endIndex = startIndex + state.eventsPerPage;
    const currentPageEvents = state.filteredEvents.slice(startIndex, endIndex);
    
    // Group events by date for better organization
    const eventsByDate = {};
    
    currentPageEvents.forEach(event => {
        if (!event.date) return;
        
        const dateKey = event.date.split('T')[0]; // Get just the date part
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
    });
    
    // Sort dates in reverse chronological order (newest first)
    const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(b) - new Date(a));
    
    // Render events grouped by date
    sortedDates.forEach(dateKey => {
        // Create date section header
        const dateHeader = document.createElement('h2');
        dateHeader.className = 'event-date-section';
        dateHeader.textContent = formatDateForSection(dateKey);
        eventsContainer.appendChild(dateHeader);
        
        // Sort events within each date by time in REVERSE order (latest first)
        const sortedEvents = eventsByDate[dateKey].sort((a, b) => {
            if (!a.timeStart) return 1;
            if (!b.timeStart) return -1;
            return b.timeStart.localeCompare(a.timeStart); // Reverse order
        });
        
        // Create event list for this date
        const dateEventsList = document.createElement('div');
        dateEventsList.className = 'event-list';
        
        // Add each event card
        sortedEvents.forEach(event => {
            dateEventsList.appendChild(createEventCard(event));
        });
        
        eventsContainer.appendChild(dateEventsList);
    });
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(state.filteredEvents.length / state.eventsPerPage);
    
    pageInfoElement.textContent = `Page ${state.currentPage} of ${totalPages || 1}`;
    prevButton.disabled = state.currentPage <= 1;
    nextButton.disabled = state.currentPage >= totalPages;
    
    paginationElement.style.display = totalPages > 1 ? 'flex' : 'none';
}

// Navigate to specific date
function navigateToDate(dateString) {
    // Find the page containing the selected date
    const selectedDate = new Date(dateString + 'T00:00:00');
    let targetPage = 1;
    let foundDate = false;

    // Loop through pages to find the one containing the selected date
    const totalPages = Math.ceil(state.filteredEvents.length / state.eventsPerPage);
    for (let page = 1; page <= totalPages; page++) {
        const startIndex = (page - 1) * state.eventsPerPage;
        const endIndex = startIndex + state.eventsPerPage;
        const pageEvents = state.filteredEvents.slice(startIndex, endIndex);

        // Check if any event on this page matches the selected date
        for (const event of pageEvents) {
            const eventDate = new Date(event.date + 'T00:00:00');
            if (eventDate.toDateString() === selectedDate.toDateString()) {
                targetPage = page;
                foundDate = true;
                break;
            }
        }
        if (foundDate) break;
    }

    if (!foundDate) {
        alert('No events found for the selected date');
        return;
    }

    // Navigate to the target page
    state.currentPage = targetPage;
    renderEvents();
    updatePagination();
    scrollToEventsContainer();

    // Highlight the date section (temporary visual feedback)
    setTimeout(() => {
        const dateSection = document.querySelector('.event-date-section');
        if (dateSection) {
            dateSection.style.transition = 'background-color 0.3s ease';
            dateSection.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            setTimeout(() => {
                dateSection.style.backgroundColor = '';
            }, 1000);
        }
    }, 100);
}

// Initialize search functionality
function initializeFilters() {
    // Set up event listeners
    searchButton.addEventListener('click', () => {
        state.searchTerm = searchElement.value.trim();
        filterEvents();
    });

    searchElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.searchTerm = searchElement.value.trim();
            filterEvents();
        }
    });
    
    // Clear search button functionality
    clearSearchButton.addEventListener('click', clearSearch);
    
    // Toggle clear button visibility based on search input
    searchElement.addEventListener('input', () => {
        if (searchElement.value.trim() !== '') {
            clearSearchButton.style.display = 'block';
        } else {
            clearSearchButton.style.display = 'none';
        }
    });
    
    // Initially hide the clear button if search is empty
    clearSearchButton.style.display = searchElement.value.trim() !== '' ? 'block' : 'none';

    // Set up backup button functionality
    backupButton.addEventListener('click', toggleAutoBackup);
    
    // Initialize backup button state
    updateBackupButtonState();

    // Helper function to scroll to events container smoothly
    const scrollToEventsContainer = () => {
        const yOffset = -20; // Add a small offset for visual padding
        const y = eventsContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({
            top: y,
            behavior: 'smooth'
        });
    };

    prevButton.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderEvents();
            updatePagination();
            scrollToEventsContainer();
        }
    });

    nextButton.addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredEvents.length / state.eventsPerPage);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            renderEvents();
            updatePagination();
            scrollToEventsContainer();
        }
    });

    // Set up date navigation
    goToDateButton.addEventListener('click', () => {
        const selectedDate = datePicker.value;
        if (selectedDate) {
            navigateToDate(selectedDate);
        }
    });

    datePicker.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && datePicker.value) {
            navigateToDate(datePicker.value);
        }
    });

    // Set date picker min/max based on available events
    if (state.allEvents.length > 0) {
        const dates = state.allEvents.map(event => event.date);
        const minDate = dates.reduce((a, b) => a < b ? a : b);
        const maxDate = dates.reduce((a, b) => a > b ? a : b);
        datePicker.min = minDate;
        datePicker.max = maxDate;
    }
}

// Update UI based on loading/error state
function updateStatus() {
    if (state.isLoading) {
        statusElement.className = 'status-message loading';
        statusElement.textContent = 'Loading events...';
        statusElement.style.display = 'block';
        filtersContainer.style.display = 'none';
        paginationElement.style.display = 'none';
    } else if (state.hasError) {
        statusElement.className = 'status-message error';
        statusElement.textContent = state.errorMessage || 'An error occurred while loading events.';
        statusElement.style.display = 'block';
        filtersContainer.style.display = 'none';
        paginationElement.style.display = 'none';
    } else {
        statusElement.style.display = 'none';
        filtersContainer.style.display = 'flex';
        updatePagination();
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
        renderEvents();
        if (!state.hasError) {
            calculateEventStatistics();
            performAutoBackupIfEnabled();
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

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    try {
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
});

// create a function that counts days since January 20, 2025
function daysSince2025() {
    const today = new Date();
    const inaugurationDay = new Date(2025, 0, 20); // January 20, 2025
    const timeDifference = today - inaugurationDay;
    return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
}

// Function to check if a date is a weekend
function isWeekend(dateString) {
    const date = new Date(dateString + 'T12:00:00');
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

// Function to check if a date is a federal holiday
function isHoliday(dateString) {
    return federalHolidays.includes(dateString);
}

// Function to check if text contains golf club references
function containsGolfClubReference(text) {
    const golfKeywords = [
        'golf club',
        'golf course',
        'bedminster',
        'trump golf'
    ];
    
    const lowerText = text.toLowerCase();
    return golfKeywords.some(keyword => lowerText.includes(keyword));
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

// Calculate event statistics
function calculateEventStatistics() {
    // Initialize counters
    let marALagoDays = 0;
    let weekdayGolfDays = 0;
    let diplomatDays = 0;
    
    // Create a Set to track unique days for each category
    const marALagoDates = new Set();
    const weekdayGolfDates = new Set();
    const diplomatDates = new Set();
    
    // Analyze all events
    state.allEvents.forEach(event => {
        const dateKey = event.date.split('T')[0]; // Get just the date part
        
        // Check for Mar-a-Lago mentions (case insensitive)
        const locationLower = (event.location || '').toLowerCase();
        const descriptionLower = (event.description || '').toLowerCase();
        const titleLower = (event.title || '').toLowerCase();
        
        if (
            locationLower.includes('mar-a-lago') || 
            locationLower.includes('mar a lago') ||
            descriptionLower.includes('mar-a-lago') || 
            descriptionLower.includes('mar a lago') ||
            titleLower.includes('mar-a-lago') || 
            titleLower.includes('mar a lago')
        ) {
            marALagoDates.add(dateKey);
        }

        // Check for golf club visits on weekdays (excluding holidays)
        if (
            containsGolfClubReference(locationLower) || 
            containsGolfClubReference(descriptionLower) ||
            containsGolfClubReference(titleLower)
        ) {
            if (!isWeekend(dateKey) && !isHoliday(dateKey)) {
                weekdayGolfDates.add(dateKey);
            }
        }
        
        // Check for foreign diplomat mentions
        if (
            descriptionLower.includes('diplomat') || 
            descriptionLower.includes('ambassador') ||
            descriptionLower.includes('foreign') ||
            descriptionLower.includes('minister') ||
            descriptionLower.includes('president of') ||
            descriptionLower.includes('prime minister') ||
            descriptionLower.includes('taoiseach') ||
            descriptionLower.includes('bilateral') ||
            titleLower.includes('diplomat') || 
            titleLower.includes('ambassador') ||
            titleLower.includes('foreign') ||
            titleLower.includes('minister') ||
            titleLower.includes('bilateral')
        ) {
            diplomatDates.add(dateKey);
        }
    });
    
    // Update counters with the number of unique days
    marALagoDays = marALagoDates.size;
    weekdayGolfDays = weekdayGolfDates.size;
    diplomatDays = diplomatDates.size;
    
    // Calculate lid time statistics
    const lidStats = calculateLidTimeStatistics();
    
    // Update UI with the counts
    marAlagoCountElement.textContent = marALagoDays;
    weekdayGolfCountElement.textContent = weekdayGolfDays;
    diplomatsCountElement.textContent = diplomatDays;
    daysInOfficeCountElement.textContent = daysSince2025();
    
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
    
    // Show the stats container
    statsContainer.style.display = 'flex';
}