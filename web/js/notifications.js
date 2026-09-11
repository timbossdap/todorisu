// ============================================================
// WEB NOTIFICATIONS & REMINDERS
// ============================================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

const activeNotificationTimers = new Map();

function cancelWebNotification(taskId) {
  if (activeNotificationTimers.has(taskId)) {
    clearTimeout(activeNotificationTimers.get(taskId));
    activeNotificationTimers.delete(taskId);
  }
}

function scheduleWebNotification(task) {
  if (!task || !task.id) return;
  cancelWebNotification(task.id);

  if (task.completed) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  let targetTimeMs = null;
  let bodyText = "Due now";

  // Check custom reminder timestamp first
  if (task.reminder_at) {
    targetTimeMs = new Date(task.reminder_at).getTime();
    bodyText = "Reminder for this task";
  } else if (task.reminder_minutes_before !== null && task.reminder_minutes_before !== undefined && task.reminder_minutes_before !== -1 && task.reminder_minutes_before !== "none") {
    if (!task.due_at) return;
    const mins = parseInt(task.reminder_minutes_before, 10);
    targetTimeMs = new Date(task.due_at).getTime() - (mins * 60 * 1000);
    if (mins === 0) {
      bodyText = "Due now";
    } else if (mins < 60) {
      bodyText = `Due in ${mins} minute${mins === 1 ? "" : "s"}`;
    } else if (mins < 1440) {
      const hrs = Math.floor(mins / 60);
      bodyText = `Due in ${hrs} hour${hrs === 1 ? "" : "s"}`;
    } else {
      const days = Math.floor(mins / 1440);
      bodyText = `Due in ${days} day${days === 1 ? "" : "s"}`;
    }
  } else if (task.due_at) {
    // Default notification at due date/time if set
    targetTimeMs = new Date(task.due_at).getTime();
    bodyText = "Due now";
  }

  if (!targetTimeMs || isNaN(targetTimeMs)) return;

  const ms = targetTimeMs - Date.now();
  // Only schedule if within next 7 days and in the future
  if (ms <= 0 || ms > 7 * 24 * 60 * 60 * 1000) return;

  const timerId = setTimeout(() => {
    try {
      const projLabel = task.project && task.project !== "Inbox" ? ` · #${task.project}` : "";
      const n = new Notification(task.title || "Todorisu Task Reminder", {
        body: `${bodyText}${projLabel}`,
        tag: task.id,
      });
      n.onclick = () => {
        window.focus();
        if (typeof openTaskEdit === "function") {
          openTaskEdit(task.id);
        }
      };
    } catch (err) {
      console.warn("Notification dispatch failed:", err);
    }
    activeNotificationTimers.delete(task.id);
  }, ms);

  activeNotificationTimers.set(task.id, timerId);
}

function scheduleAllWebNotifications() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!Array.isArray(tasks)) return;
  tasks.filter(t => !t.completed).forEach(scheduleWebNotification);
}
