# DO NOT USE, THIS IS AI GENERATED AND FOR PERSONAL USE, I WILL NOT BE ACCEPTING ANY ERROR REPORTS

# Tasks — setup guide

Three parts, in this order: **Supabase** (free database + login) → **Web app** (free hosting) → **Android app** (native reminders).

## 1. Supabase (free backend)

1. Go to supabase.com → New project (free tier). Wait ~2 min for it to spin up.
2. Project → SQL Editor → New query → paste the contents of `supabase/schema.sql` → Run.
3. Project Settings → API → copy the **Project URL** and the **anon public** key.
4. Project → Authentication → Providers → make sure **Email** is enabled (it is by default).
   - Optional: Authentication → Settings → turn OFF "Confirm email" if you don't want to click a confirmation link the first time you sign up.

### Already set up Supabase before? Run the migration
If you ran the original `schema.sql` before tags/repeating tasks/themes were added, open SQL Editor and run `supabase/migration_v2.sql` (adds `tags`, `recurrence_rule`, `has_time` columns).
If you want server-side completed timestamp tracking for the **Reporting** view, also run `supabase/migration_v3.sql` (adds `completed_at` timestamptz column). Fresh setups can skip these — the updated `schema.sql` already includes all columns.

## 2. Web app (free hosting via GitHub Pages)

1. Open `web/config.js` and paste in your Supabase URL + anon key from step 1.3.
2. Create a new **public** GitHub repository (e.g. `my-tasks`).
3. Upload everything inside the `web/` folder to the repo root (drag-and-drop on github.com works fine, or `git push`).
4. Repo → Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `root` → Save.
5. Wait a minute, then your app is live at:
   `https://YOUR_USERNAME.github.io/my-tasks/`
6. Open that URL, create an account, add a task or two to confirm it works.

You can stop here and just use it as a website/PWA (Android: open the site in Chrome → ⋮ menu → "Add to Home screen" for an app-like icon). Continue below for real native notifications.

## 3. Android app (native, persistent reminders)

1. Install **Android Studio** (free): developer.android.com/studio
2. Open Android Studio → Open → select the `android/` folder from this project.
3. Let it sync (first sync downloads Gradle + dependencies, takes a few minutes).
4. Open `app/src/main/java/com/yourname/todolist/Constants.kt` and fill in:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` — same values as `web/config.js`
   - `WEB_APP_URL` — your GitHub Pages URL from step 2.5
5. (Optional) Rename the package from `com.yourname.todolist` to your own, using Android Studio: right-click the package in the project tree → Refactor → Rename. Also update `applicationId` and `namespace` in `app/build.gradle` and the manifest package references if you do this. It's fine to leave it as-is for personal use.
6. Plug in your Android phone (enable Developer Options → USB debugging), or use an emulator.
7. Click the green ▶ Run button. The app installs and opens.
8. Sign in with the same account you created in step 2.6. Grant the notification permission when Android asks.
9. To get a real installable file: Build menu → Build Bundle(s)/APK(s) → Build APK(s). Android Studio shows a "locate" link to the generated `.apk` — copy that to your phone (or any Android device) to install it directly, no Play Store needed. You'll need to allow "install unknown apps" for whichever app you use to open the file.

### How the reminders actually work
The Android app doesn't just show the website in a window — it also talks to Supabase directly in the background (via Android's WorkManager, checking every 15 minutes, plus right after you sign in and right after a reboot) and schedules native Android alarms for upcoming due dates. Those alarms use `AlarmManager`, the same mechanism native alarm-clock apps use, so they fire even if the app is closed or the phone was restarted. This is meaningfully more reliable than browser notifications, though Android's battery optimization can still occasionally delay a notification by a few minutes on some phones — if that happens, go to Settings → Apps → Tasks → Battery → set to "Unrestricted".

### A note on limits
This is a solid personal-use setup, not a polished commercial app — e.g. there's no password reset flow yet, and the reminder time is exactly the due time (no "remind me 30 min before" UI yet, though the database column `reminder_minutes_before` already supports it if you want to add that control later). Happy to extend either piece if you run into something you want changed.

## What's new: themes, smart dates, tags, repeating tasks

- **Settings page** (sidebar → Settings): light/dark/system mode, plus 7 Material You–style color schemes. Preference is saved per-device (localStorage), applied instantly, and works the same inside the Android WebView.
- **Smart quick-add**: type naturally, e.g. `Pay rent tomorrow 5pm every month @bills #Home`. It detects the due date/time (via the chrono-node library), recurrence (`every day`, `every weekday`, `every week`, `every month`, `every 3 days`), tags (`@word`), project (`#word`), and priority (`p1`–`p4`) — stripping them from the title and showing a live chip preview. The dropdowns below stay there as a manual fallback/override.
- **Tags**: shown as `@tag` chips on tasks, filterable from the sidebar.
- **Repeating tasks**: checking one off advances it to its next due date instead of completing it for good — the Android sync worker picks up the new date automatically on its next check.

Since the web app now loads two more CDN scripts (chrono-node, and it already used supabase-js), it needs an internet connection to load initially — after that the service worker caches the app shell for offline use.
