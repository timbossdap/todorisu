const CACHE = "tasks-v4";
const FILES = [
  "./index.html",
  "./style.css",
  "./config.js",
  "./theme.js",
  "./manifest.json",
  "./js/state.js",
  "./js/calendar-manager.js",
  "./js/date-utils.js",
  "./js/tasks-data.js",
  "./js/smart-input.js",
  "./js/task-edit.js",
  "./js/view-upcoming.js",
  "./js/view-standard.js",
  "./js/view-filters.js",
  "./js/view-reporting.js",
  "./js/render-core.js",
  "./js/nav-controls.js",
  "./js/profile-settings.js",
  "./js/sidebar.js",
  "./js/search.js",
  "./js/export.js",
  "./js/keyboard-shortcuts.js",
  "./js/notifications.js",
  "./js/auth.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
