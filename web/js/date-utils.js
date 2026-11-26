// ============================================================
// DATE HELPERS & FILTERING
// ============================================================
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr), now = new Date();
  return d.toDateString() === now.toDateString();
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr), now = new Date();
  now.setHours(0, 0, 0, 0);
  const taskDate = new Date(dateStr);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < now;
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1), d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function formatDayHeader(date) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthShort = date.toLocaleString(undefined, { month: "short" });
  const dayNum = date.getDate();
  const weekday = date.toLocaleString(undefined, { weekday: "long" });

  if (isSameDay(date, now)) {
    return `${monthShort} ${dayNum} · Today · ${weekday}`;
  } else if (isSameDay(date, tomorrow)) {
    return `${monthShort} ${dayNum} · Tomorrow · ${weekday}`;
  } else {
    return `${monthShort} ${dayNum} · ${weekday}`;
  }
}

const TAG_COLOR_MAP = {
  "read": "#9e9e9e",
  "exams/tests": "#d9704f",
  "homework": "#4caf50",
  "hobby": "#e0a458",
};
const TAG_COLOR_FALLBACKS = ["#2196f3", "#9c27b0", "#009688", "#e91e63", "#ff5722"];
function getTagColor(tag) {
  const key = (tag || "").toLowerCase();
  if (TAG_COLOR_MAP[key]) return TAG_COLOR_MAP[key];
  let hash = 0;
  for (const c of key) hash += c.charCodeAt(0);
  return TAG_COLOR_FALLBACKS[hash % TAG_COLOR_FALLBACKS.length];
}

function getProjects() {
  return [...new Set(tasks.map(t => t.project || "Inbox"))].filter(p => p !== "Inbox").sort();
}

function getTags() {
  const all = tasks.flatMap(t => t.tags || []);
  return [...new Set(all)].sort();
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/**
 * Build the HTML for a list of calendar events inside `.calendar-events-grid`.
 */
function renderCalendarEventsGrid(events) {
  return `
    <div class="calendar-events-grid">
      ${events.map(evt => evt.isPastGroup ? `
        <div class="past-events-summary"><span class="past-events-bars">|||</span> <span>${evt.count} past events</span></div>
      ` : `
        <div class="calendar-event-item">
          <span class="event-stripe ${evt.stripe || "red"}"></span>
          ${evt.isOutlook ? `<span class="outlook-tag">Outlook</span>` : ""}
          ${evt.time ? `<span class="event-time">${escapeHtml(evt.time)}</span>` : ""}
          <span class="event-summary" title="${escapeHtml(evt.location ? `${evt.title} (${evt.location})` : evt.title)}">${escapeHtml(evt.title)}</span>
        </div>
      `).join("")}
    </div>
  `;
}
