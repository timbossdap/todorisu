# Todorisu — Application Documentation

Todorisu is a personal Todoist-style task manager built around three layers:

1. **Web App (PWA)** — Vanilla HTML/CSS/JavaScript frontend in `web/`, using Supabase for auth and data persistence, `chrono-node` for natural-language date parsing, and a service worker (`web/sw.js`) for offline shell caching and web notifications.
2. **Supabase Backend** — PostgreSQL `tasks` table with Row Level Security (RLS) policies in `supabase/`.
3. **Android Companion App** — Kotlin WebView + background `WorkManager` / `AlarmManager` app in `android/` for persistent native reminders.

---

## 1. Project Structure

```text
todorisu/
├── README.md                  # Quick-start setup guide
├── DOCUMENTATION.md           # This documentation file
├── supabase/
│   ├── schema.sql             # Full tasks table schema, RLS policies, and index
│   ├── migration_v2.sql       # Migration adding tags, recurrence_rule, has_time
│   └── migration_v3.sql       # Migration adding completed_at for Reporting
├── web/
│   ├── index.html             # Main app shell (auth screen, sidebar, views, modals)
│   ├── style.css              # Application styles & Material 3 CSS variable bindings
│   ├── theme.js               # Material 3 light/dark/system mode & 7 color schemes
│   ├── config.js              # SUPABASE_URL and SUPABASE_ANON_KEY
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker (cache: tasks-v8)
│   ├── outlook-addin.html     # Outlook taskpane add-in UI
│   ├── manifest.xml           # Static Outlook OfficeApp manifest
│   ├── idle-game.html         # Standalone idle game popout ("Browse templates")
│   └── js/                    # Modular frontend scripts (loaded in order by index.html)
│       ├── state.js           # Supabase client, global state, getMonday(), switchToView()
│       ├── calendar-manager.js# Outlook & custom iCal/Webcal ICS parser and sync
│       ├── date-utils.js      # Date predicates, tag colors, escapeHtml(), calendar grid helper
│       ├── notifications.js   # Service worker registration & Notification API timers
│       ├── tasks-data.js      # CRUD against Supabase, recurrence advancement, nextOccurrence()
│       ├── date-picker.js     # Custom Todoist-style date/time picker popover
│       ├── smart-input.js     # Natural-language parser (chrono-node + tags/projects/priority/recurrence)
│       ├── task-edit.js       # Task edit drawer, recurring delete modal, taskRow() renderer
│       ├── view-upcoming.js   # 7-day Upcoming view, week strip, overdue section, inline add
│       ├── view-standard.js   # Today, Inbox, Project, Tag, and Filter task list views
│       ├── view-filters.js    # Filters & Labels view
│       ├── view-reporting.js  # Completed tasks history grouped by day with project/date filters
│       ├── render-core.js     # Main render() dispatcher, sidebar badges, project/tag lists
│       ├── nav-controls.js    # Week navigation, overdue reschedule, display dropdown, quick add, nav wiring
│       ├── profile-settings.js# Profile dropdown, Settings modal tabs, Account & 2FA, Outlook manifest export
│       ├── sidebar.js         # Desktop sidebar collapse & mobile drawer toggle
│       ├── search.js          # Cmd+K / '/' command palette search modal
│       ├── export.js          # CSV export of completed tasks from Reporting view
│       ├── keyboard-shortcuts.js # Global keyboard shortcuts (q, /, Cmd+K, Esc, G+..., O+...)
│       └── auth.js            # Email/password auth, Google OAuth, AndroidBridge token handoff
└── android/
    └── app/src/main/java/com/yourname/todolist/
        ├── Constants.kt       # Supabase URL/key, Web App URL, notification channels
        ├── MainActivity.kt    # WebView host + AndroidBridge JS interface
        ├── SupabaseApi.kt     # Direct REST calls to Supabase for background sync
        ├── TokenStore.kt      # Encrypted/local auth token storage
        ├── SyncWorker.kt      # Periodic WorkManager job checking due tasks
        ├── AlarmReceiver.kt   # AlarmManager broadcast receiver firing native notifications
        ├── BootReceiver.kt    # Reschedules alarms after device reboot
        └── NotificationHelper.kt # Notification channel setup and rendering
```

---

## 2. Database Schema (`supabase/schema.sql`)

All tasks live in a single `tasks` table with Row Level Security enabled (`auth.uid() = user_id` for `select`, `insert`, `update`, and `delete`):

| Column | Type | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | — | Foreign key to `auth.users` |
| `title` | `text` | — | Task title |
| `notes` | `text` | `''` | Optional task notes/description |
| `project` | `text` | `'Inbox'` | Project name |
| `priority` | `int` | `4` | `1` (highest / red) to `4` (lowest) |
| `due_at` | `timestamptz` | `null` | Due date/time |
| `reminder_minutes_before` | `int` | `0` | Minutes before `due_at` to notify |
| `has_time` | `boolean` | `false` | Distinguishes date-only tasks from timed tasks |
| `tags` | `text[]` | `'{}'` | Array of tag strings (without `@`) |
| `recurrence_rule` | `text` | `null` | e.g. `daily`, `weekday`, `weekly`, `biweekly`, `monthly`, `bimonthly`, `yearly`, `every:<N>:<unit>` |
| `completed` | `boolean` | `false` | Completion state |
| `completed_at` | `timestamptz` | `null` | Completion timestamp (used by Reporting view) |
| `position` | `int` | `0` | Ordering field |
| `created_at` | `timestamptz` | `now()` | Creation timestamp |

Index: `tasks_due_at_idx` on `(user_id, due_at) where completed = false`.

---

## 3. Web App Features & Architecture

### Views (`render-core.js`)
- **Upcoming (`view-upcoming.js`)**: 7-day horizontal week strip, collapsible Overdue section with bulk reschedule (`Today`, `Tomorrow`, `Next Week`), per-day calendar event cards, task lists, and inline `+ Add task`.
- **Today / Inbox / Projects / Tags / Filters (`view-standard.js`)**: Standard list view with optional Today calendar card, sorted uncompleted tasks, and toggleable completed tasks section.
- **Filters & Labels (`view-filters.js`)**: Built-in filters (`Assigned to me`, `Priority 1`) and custom/task-derived `@label` rows with active task counts.
- **Reporting (`view-reporting.js`)**: Completed task history grouped by completion day, filterable by project and date window (`Any date`, `Today`, `Past 7 days`, `Past 30 days`), with CSV export (`export.js`).

### Smart Quick-Add (`smart-input.js`)
Parses natural-language input before saving:
- **Priority**: `p1`–`p4`, `!1`–`!4`, `!urgent`, `!high`, `!med`, `!low`
- **Tags**: `@tagname` or `tag:tagname`
- **Project**: `#ProjectName` or `project:Name`
- **Recurrence**: `daily` / `every day`, `every weekday`, `weekly` / `every week`, `biweekly` / `fortnightly`, `monthly`, `bimonthly`, `quarterly`, `yearly`, `every <N> days|weeks|months|years`, or `every <weekday>`
- **Dates & Times**: Parsed via `chrono-node` (including shorthands like `tod`, `tmrw`/`tmw`, `eod`)

### Recurring Tasks (`tasks-data.js` & `task-edit.js`)
- **Completing** a recurring task inserts a completed copy (`completed: true`, `completed_at: now`) for Reporting history and advances the recurring task's `due_at` via `nextOccurrence()`.
- **Deleting** a recurring task prompts a confirmation modal (`deleteRecurringModal`) to either skip the current occurrence (`deleteTaskOccurrence`) or delete the entire series (`deleteTaskSeries`).

### Calendar & Outlook Integration (`calendar-manager.js`)
- Supports **Microsoft Outlook** published `.ics` / `webcal://` links and custom iCal feeds.
- Fetches feeds directly with multi-proxy CORS fallbacks (`allorigins.win`, `corsproxy.io`, `api.codetabs.com`).
- Includes an RFC 5545 `VEVENT` parser with line unfolding and `RRULE` recurrence expansion (`DAILY`, `WEEKLY` with `BYDAY`, `MONTHLY`, `YEARLY`, `INTERVAL`, `UNTIL`).
- Auto-syncs connected Outlook calendars on startup and every 15 minutes.

### Themes & Personalization (`theme.js` & `profile-settings.js`)
- `ThemeManager` persists `tasks_theme_prefs` (`mode`: `system` | `light` | `dark`, `scheme`: `red`, `purple`, `blue`, `green`, `orange`, `teal`, `pink`) in `localStorage` and applies `--md-*` CSS custom properties immediately on load.
- Settings modal supports Notifications, Theme, Calendars, Integrations (including dynamic `manifest.xml` download for the Outlook Add-in), Account (avatar upload, display name, email/password update, Supabase TOTP 2FA, OAuth identity linking, JSON data export, account deletion), General, and Productivity (persisted `tasks_daily_goal`).

### Keyboard Shortcuts (`keyboard-shortcuts.js`)
| Shortcut | Action |
| :--- | :--- |
| `q` | Open Quick Add |
| `/` or `Cmd+K` / `Ctrl+K` | Open Command Palette Search |
| `Esc` | Close active modals, drawers, dropdowns, or search |
| `G` then `H` / `U` | Go to Upcoming |
| `G` then `I` | Go to Inbox |
| `G` then `T` | Go to Today |
| `G` then `V` | Go to Filters & Labels |
| `G` then `A` | Go to Reporting |
| `O` then `S` | Open Settings (Notifications) |
| `O` then `P` | Open Settings (Account) |

---

## 4. Configuration & Deployment

1. **Supabase**: Run `supabase/schema.sql` in the Supabase SQL Editor. Enable Email (and optionally Google OAuth) under Authentication → Providers.
2. **Web App**: Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `web/config.js`, then host `web/` on any static host (e.g., GitHub Pages).
3. **Android App**: Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `WEB_APP_URL` in `android/app/src/main/java/com/yourname/todolist/Constants.kt`, then build/run from Android Studio.
