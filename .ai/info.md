# Todorisu Architecture & Codebase Map

This document outlines the modular structure of the Todorisu codebase, detailing what every file does, where it is located, and how the modules interact.

---

## 1. Project Directory Structure

```text
todorisu/
├── .ai/
│   └── info.md                  # Codebase documentation and file catalog (this file)
├── android/                     # Native Android wrapper (Capacitor/WebView integration)
├── supabase/                    # Supabase database migrations, schemas, and RLS policies
│   ├── migration.sql
│   └── migration_v2.sql
├── web/                         # Todorisu Web App (HTML5 / CSS / Modular JS PWA)
│   ├── config.js                # Supabase configuration (URL & Anon Key)
│   ├── index.html               # Main single-page HTML layout & UI views
│   ├── manifest.json            # PWA manifest
│   ├── style.css                # Comprehensive dark theme & responsive UI styles
│   ├── sw.js                    # Service Worker caching assets for offline PWA support
│   ├── theme.js                 # Theme toggler (Dark / Light mode preferences)
│   └── js/                      # Modular JavaScript files (decoupled from monolithic app.js)
│       ├── auth.js              # Authentication (Supabase Auth & session lifecycle)
│       ├── calendar-manager.js  # iCal/ICS feeds and timetable schedule manager
│       ├── date-utils.js        # Date manipulation, overdue checks, tag/project extractors
│       ├── export.js            # CSV export generator for completed tasks
│       ├── keyboard-shortcuts.js# Global keyboard shortcuts (q, /, Cmd+K, G/O combos)
│       ├── nav-controls.js      # Navigation listeners, quick-add modal, week controls
│       ├── notifications.js     # Web Notifications API scheduler & SW registration
│       ├── profile-settings.js  # Profile dropdown and settings modal tabs
│       ├── render-core.js       # Main view coordinator and badge counter updater
│       ├── search.js            # Command palette (Cmd+K) & global quick-search modal
│       ├── sidebar.js           # Sidebar collapse toggle and mobile drawer
│       ├── smart-input.js       # Natural language parser (Chrono date, priority, tags, project)
│       ├── state.js             # Shared reactive state, DOM helper, client instances
│       ├── task-edit.js         # Task editing drawer and task row DOM generator
│       ├── tasks-data.js        # Supabase CRUD data operations for tasks
│       ├── view-filters.js      # Filters & Labels view renderer
│       ├── view-reporting.js    # Activity & completed task reporting view renderer
│       ├── view-standard.js     # Standard task list view renderer (Today, Inbox, Projects)
│       └── view-upcoming.js     # 7-day strip & timetable schedule upcoming view renderer
```

---

## 2. Modular JavaScript Files (`web/js/`)

The application logic was modularized into 19 focused JavaScript files loaded in dependency order:

### `web/js/state.js`
- **Purpose**: Initializes global state variables, DOM selector shorthand, and Supabase client instance.
- **Key Exports & Globals**:
  - `sb`: Supabase client instance created from `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
  - `currentUser`: Currently logged-in user object or `null`.
  - `tasks`: Global in-memory array of task objects.
  - `currentView`: Current active view (`"upcoming"`, `"today"`, `"inbox"`, `"reporting"`, `"filters"`, `"project"`, `"tag"`).
  - `currentProject`, `currentTag`, `currentFilter`: Active filter contexts.
  - `selectedWeekStart`: Anchor date for the 7-day upcoming week strip.
  - `showCalendarEvents`, `showCompletedTasks`, `isOverdueCollapsed`: UI toggle states.
  - `$`: Element lookup shorthand: `document.getElementById(id)`.
  - `getMonday(d)`: Returns Monday timestamp for any date.
  - `recordRecentView(name)`: Adds view name to recent history array.

### `web/js/calendar-manager.js`
- **Purpose**: Manages remote iCalendar (ICS) feeds, timetable schedules, and caching.
- **Key Functions**:
  - `CalendarManager.isTimetableEnabled()`, `setTimetableEnabled(enabled)`: Timetable settings.
  - `CalendarManager.getFeeds()`, `saveFeeds(feeds)`, `addFeed(url, name)`, `removeFeed(id)`: Feed persistence.
  - `CalendarManager.syncFeed(url)`: Fetches and parses ICS with CORS proxy fallback.
  - `CalendarManager.parseIcs(icsText)`: Parses VEVENT blocks (summary, dtstart, dtend, rrule).
  - `CalendarManager.getTimetableEventsForDate(date)`: Generates school/work class schedule blocks.
  - `CalendarManager.getEventsForDate(date)`: Aggregates timetable and synced calendar feed events.

### `web/js/date-utils.js`
- **Purpose**: Date comparisons, relative headers, and task metadata aggregators.
- **Key Functions**:
  - `isToday(dateStr)`: Checks if a date string is today.
  - `isOverdue(dateStr)`: Checks if an uncompleted task date is in the past.
  - `isSameDay(date1, date2)`: Compares two dates ignoring time.
  - `formatDayHeader(date)`: Generates strings like `"Sep 11 · Today · Friday"`.
  - `getProjects()`: Returns a unique sorted array of project names from existing tasks.
  - `getTags()`: Returns a unique sorted array of `#tags` across all tasks.

### `web/js/tasks-data.js`
- **Purpose**: Data layer communicating with the Supabase `tasks` table.
- **Key Functions**:
  - `loadTasks()`: Fetches all tasks for the signed-in user from Supabase and triggers `render()`.
  - `createTask(data)`: Inserts a new task, adds optimistic UI update, and saves to database.
  - `updateTask(id, data)`: Updates fields on an existing task in Supabase.
  - `toggleTask(id)`: Toggles completion status, updates recurrence if applicable, and syncs to Supabase.
  - `deleteTask(id)`: Deletes a task from memory and database.

### `web/js/smart-input.js`
- **Purpose**: Natural language processing for task input bars using Chrono Node.
- **Key Functions**:
  - `parseSmartInput(raw)`: Parses text for `#project`, `@tag`, `p1-p4` priority, recurrence patterns (`every day`, `every monday`), and date/time strings.
  - `updateSmartPreview(parsed, previewEl)`: Renders live chips for detected metadata below the input.
  - Wires up live typing handlers on quick-add and inline task creator inputs.

### `web/js/task-edit.js`
- **Purpose**: Task details side-panel and individual task item DOM rendering.
- **Key Functions**:
  - `taskRow(t)`: Creates the DOM element for an individual task row (checkbox, priority ring, title, chips, delete action, and notification reminder bell indicator).
  - `openTaskEdit(id)`: Opens side drawer populated with task title, notes, priority, due date, project, tags, and notification reminder settings (presets or custom datetime).
  - `closeTaskEdit()`: Closes and resets the task edit drawer.
  - `saveTaskEdit()`: Commits changes made in edit drawer to Supabase and schedules task notifications.

### `web/js/view-upcoming.js`
- **Purpose**: 7-day upcoming horizontal week strip and day columns matching Todoist layout.
- **Key Functions**:
  - `renderUpcomingView()`: Renders week strip (Mon-Sun), day columns, timetable event ribbons, overdue section, and day-by-day task lists.
  - Inline task addition directly into specific days.

### `web/js/view-standard.js`
- **Purpose**: Standard list view for Today, Inbox, custom Projects, and Tags.
- **Key Functions**:
  - `visibleTasks()`: Filters tasks based on `currentView`, `currentProject`, `currentTag`, and `currentFilter`.
  - `renderStandardView()`: Populates title, Today calendar event card, uncompleted task list, and completed tasks accordion.

### `web/js/view-filters.js`
- **Purpose**: "Filters & Labels" overview page with assigned tasks, priority 1 counts, and label badges.
- **Key Functions**:
  - `renderFiltersView()`: Counts tasks per filter and label, renders interactive filter rows.
  - Add custom label dialog and collapse toggle handlers.

### `web/js/view-reporting.js`
- **Purpose**: Activity log view displaying completed tasks grouped by date.
- **Key Functions**:
  - `renderReportingView()`: Groups completed tasks by completion date (Today, Yesterday, date), with user initials, time ago, and clickable un-complete chip.

### `web/js/render-core.js`
- **Purpose**: Central UI dispatcher coordinating all view switches and counter badges.
- **Key Functions**:
  - `render()`: Updates sidebar badges (Today count, Inbox count), generates sidebar project and tag buttons, sets active navigation state, and delegates rendering to the active view renderer (`renderUpcomingView`, `renderReportingView`, `renderFiltersView`, or `renderStandardView`).

### `web/js/nav-controls.js`
- **Purpose**: User navigation, quick-add dialog, reschedule modal, and display settings.
- **Key Functions**:
  - Wires up week navigation buttons (`prevWeekBtn`, `nextWeekBtn`, `todayWeekBtn`).
  - Wires up sidebar view buttons (`upcoming`, `inbox`, `today`, `filters`, `reporting`).
  - Quick-add modal submit, escape, and shortcut handlers.
  - Overdue reschedule modal presets (Today, Tomorrow, Next Week).

### `web/js/profile-settings.js`
- **Purpose**: User profile dropdown and comprehensive modal settings interface.
- **Key Functions**:
  - `toggleProfileDropdown(show)`, `closeProfileDropdown()`: User menu controls.
  - `openSettings(tab)`, `closeSettings()`, `renderSettingsTab(tab)`: Settings modal supporting tabs:
    - Account (name, email, password change)
    - Notifications (desktop notifications, digest)
    - Appearance (theme toggle: Dark, Light, Auto)
    - Calendar & Timetable (timetable toggle, custom ICS feed manager)

### `web/js/sidebar.js`
- **Purpose**: Sidebar collapse / burger menu for desktop and mobile drawer toggle.
- **Key Functions**:
  - Handles `#sidebarCollapseBtn` and `#menuBtn` interactions for responsive viewport layouts.

### `web/js/search.js`
- **Purpose**: Command palette modal (Cmd+K or `/`).
- **Key Functions**:
  - `openSearch()`, `closeSearch()`: Modal display controls.
  - `renderSearchResults(query)`: Fuzzy-searches tasks, navigation views, and commands with keyboard navigation (Up/Down/Enter).

### `web/js/export.js`
- **Purpose**: CSV export functionality for completed tasks in the reporting view.
- **Key Functions**:
  - Gathers completed tasks, formats CSV headers and escaped columns, triggers browser file download.

### `web/js/keyboard-shortcuts.js`
- **Purpose**: Global keyboard event listener for rapid navigation and actions.
- **Key Mappings**:
  - `q`: Quick Add task.
  - `/` or `Cmd+K` / `Ctrl+K`: Open command palette / search modal.
  - `Escape`: Close any open modal / drawer / dropdown.
  - `G then H` or `G then U`: Navigate to Upcoming view.
  - `G then I`: Navigate to Inbox.
  - `G then T`: Navigate to Today.
  - `G then V`: Navigate to Filters & Labels.
  - `G then A`: Navigate to Reporting.
  - `O then S`: Open Settings (Notifications).
  - `O then P`: Open Settings (Account).

### `web/js/notifications.js`
- **Purpose**: Web Notifications API integration and Service Worker registration.
- **Key Functions**:
  - Registers `sw.js` for PWA offline caching.
  - `scheduleWebNotification(task)`: Sets browser notification timer for tasks due within 24 hours.

### `web/js/auth.js`
- **Purpose**: Supabase user authentication, session listener, and initial bootstrap.
- **Key Functions**:
  - Handles email/password sign-in and sign-up form submissions.
  - `onSignedIn(session)`: Initializes user profile UI, triggers `loadTasks()`, and runs `render()`.
  - `handleSignOut()`: Clears session and reloads.
  - AndroidBridge communication for mobile native token sharing.
  - Immediately restores existing session on app load.

---

## 3. Load Order & Script Dependencies

In `web/index.html`, scripts are imported in order of dependency:

```html
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/chrono-node@1.4.8/dist/chrono.min.js"></script>
<script src="theme.js"></script>
<!-- Modular Application Scripts -->
<script src="js/state.js"></script>
<script src="js/calendar-manager.js"></script>
<script src="js/date-utils.js"></script>
<script src="js/notifications.js"></script>
<script src="js/tasks-data.js"></script>
<script src="js/smart-input.js"></script>
<script src="js/task-edit.js"></script>
<script src="js/view-upcoming.js"></script>
<script src="js/view-standard.js"></script>
<script src="js/view-filters.js"></script>
<script src="js/view-reporting.js"></script>
<script src="js/render-core.js"></script>
<script src="js/nav-controls.js"></script>
<script src="js/profile-settings.js"></script>
<script src="js/sidebar.js"></script>
<script src="js/search.js"></script>
<script src="js/export.js"></script>
<script src="js/keyboard-shortcuts.js"></script>
<script src="js/auth.js"></script>
```

> **Note**: `auth.js` is loaded last so all view renderers, data handlers, and state variables are initialized before `onSignedIn()` calls `loadTasks()` and `render()`.
