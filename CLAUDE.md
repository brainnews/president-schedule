# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static website that tracks and displays the U.S. President's schedule by fetching data from a Cloudflare Worker API. The site includes statistics tracking for Mar-a-Lago visits, Trump property visits, and "lid time" (time when the President is unavailable to press).

## Architecture

### Core Structure

The application is a vanilla JavaScript single-page application (SPA) with no build system or framework. All code runs directly in the browser.

- **Entry Point**: `index.html` - Main schedule viewer
- **Sub-page**: `maralago/index.html` - Mar-a-Lago specific statistics
- **Application Logic**: `script.js` - All JavaScript functionality
- **Styling**: `styles.css` - Dark theme UI with CSS custom properties

### Dynamic Resource Loading

Both HTML pages implement a sophisticated cache-busting system:
- In production: Fetches the latest git commit hash from GitHub API and appends it as a version query parameter (`?v=commit_sha`)
- In development: Uses timestamp for cache busting
- Resources (CSS/JS) are loaded dynamically via JavaScript rather than static `<link>` and `<script>` tags
- The system clears service workers and browser caches on load to prevent stale data

### Data Flow

1. **Data Source**: Cloudflare Worker at `https://where-is-the-president.miles-gilbert.workers.dev/`
2. **Backup System**: Events are stored in localStorage for offline access via auto-backup feature
3. **Fallback**: If the API fails, the app attempts to load from localStorage backup
4. **State Management**: Global `state` object in `script.js` manages all application state

### Key Functions

- `initializeApp()` - Main entry point called from index.html after script loads
- `initializeMarALagoPage()` - Entry point for the Mar-a-Lago subpage
- `fetchCalendarData()` - Fetches and processes event data from the API
- `calculateEventStatistics()` - Computes all statistics (golf days, lid time, travel costs, etc.)
- `renderEvents()` - Groups events by date and renders them in reverse chronological order
- `backupData()` / `loadBackupData()` - Handles localStorage persistence

### Statistics Calculation

The app calculates several metrics:

1. **Days in Office**: Counts days since January 20, 2025
2. **Mar-a-Lago Travel Cost**: Counts trips (gaps > 1 day between visits) × $3.4M per round trip
3. **Trump Property Visits**: Counts weekday (non-holiday) visits to any Trump-owned property
4. **Lid Hours**: Tracks "full lid called" events and calculates total/average time from lid call to midnight

### Event Data Structure

Events are normalized to this structure:
```javascript
{
  date: "YYYY-MM-DD",
  timeStart: "HH:MM",
  timeEnd: "HH:MM" | null,
  title: string,
  location: string,
  description: string,
  type: string,  // Source identifier
  url: string | null
}
```

### UI Components

- **Event Cards**: Display individual events with time, location, description, and source badges
- **Statistics Dashboard**: Collapsible stats container with toggle (state persisted to localStorage)
- **Search/Filter**: Text search across event titles, descriptions, and locations
- **Pagination**: 9 events per page (main), 10 events per page (Mar-a-Lago)
- **Auto Backup**: Optional feature to save data to localStorage on every visit

## Development

### Running Locally

Open `index.html` directly in a browser or use a local server:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve

# PHP
php -S localhost:8000
```

The app detects local development and uses timestamp-based cache busting instead of GitHub API calls.

### File Structure

```
/
├── index.html           # Main page
├── script.js            # All application logic
├── styles.css           # All styles (CSS custom properties for theming)
├── images/
│   └── donald-trump-playing-golf-may-2023.png
├── maralago/
│   └── index.html       # Mar-a-Lago subpage (loads parent script.js)
├── CNAME               # GitHub Pages custom domain
└── .gitattributes
```

### State Management

The global `state` object tracks:
- `allEvents`: All fetched events
- `filteredEvents`: Events matching current search/filters
- `currentPage`: Current pagination page
- `eventsPerPage`: Number of events per page
- `searchTerm`: Current search query
- `statsMinimized`: Whether stats are collapsed (persisted to localStorage)
- `isLoading`, `hasError`: UI state flags

### LocalStorage Keys

- `presidentCalendarBackup`: JSON object with events, lastUpdated timestamp, and version
- `autoBackupEnabled`: Boolean flag for auto-backup feature
- `statsMinimized`: Boolean flag for stats visibility preference

## Important Implementation Details

### Date Handling

All dates include "T12:00:00" timestamp to ensure consistent timezone handling across browsers. The app manually constructs date strings to avoid timezone conversion issues.

### Event Sorting

- Events are sorted newest-first (reverse chronological)
- Within each day, events are sorted by time in reverse order (latest first)

### Source Badges

Event sources are color-coded:
- Press Briefing: Red (#ef4444)
- Official Schedule: Blue (#3b82f6)
- Pool Call Time: Purple (#8b5cf6)
- @POTUS_Schedule: Green (#10b981)
- Pool Report: Orange (#f59e0b)
- Axios: Pink (#ec4899)

### Trump Properties List

The `calculateEventStatistics()` function maintains comprehensive lists of Trump-owned properties including golf clubs, hotels, and other properties. This list is used to identify visits for the "Trump Property Visits" statistic.
