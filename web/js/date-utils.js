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

function getProjects() {
  return [...new Set(tasks.map(t => t.project || "Inbox"))].filter(p => p !== "Inbox").sort();
}

function getTags() {
  const all = tasks.flatMap(t => t.tags || []);
  return [...new Set(all)].sort();
}
