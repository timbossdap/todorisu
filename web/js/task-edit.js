// ============================================================
// TASK EDIT PANEL
// ============================================================
function openTaskEdit(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  editingTaskId = id;

  // Title & description
  $("taskEditTitle").value = t.title || "";
  $("taskEditNotes").value = t.notes || "";

  // Priority
  $("taskEditPriority").value = String(t.priority || 4);

  // Recurrence
  $("taskEditRecurrence").value = t.recurrence_rule || "";

  // Tags
  $("taskEditTags").value = (t.tags || []).join(", ");

  // Due date & time
  if (t.due_at) {
    const d = new Date(t.due_at);
    const pad = n => String(n).padStart(2, "0");
    $("taskEditDue").value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    $("taskEditDue").value = "";
  }

  // Reminder / Notification
  const remSel = $("taskEditReminder");
  const remCustom = $("taskEditReminderCustom");
  const notifWarn = $("taskEditNotifPermissionWarning");
  if (remSel) {
    if (t.reminder_at) {
      remSel.value = "custom";
      if (remCustom) {
        remCustom.classList.remove("hidden");
        const d = new Date(t.reminder_at);
        const pad = n => String(n).padStart(2, "0");
        remCustom.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    } else if (t.reminder_minutes_before !== null && t.reminder_minutes_before !== undefined && t.reminder_minutes_before !== -1 && t.reminder_minutes_before !== "none") {
      remSel.value = String(t.reminder_minutes_before);
      if (remCustom) remCustom.classList.add("hidden");
    } else {
      remSel.value = "none";
      if (remCustom) remCustom.classList.add("hidden");
    }

    if (notifWarn) {
      const hasReminder = remSel.value !== "none";
      const notGranted = typeof Notification !== "undefined" && Notification.permission !== "granted";
      notifWarn.classList.toggle("hidden", !(hasReminder && notGranted));
    }
  }

  // Project selector
  const projSel = $("taskEditProject");
  projSel.innerHTML = `<option value="Inbox">Inbox</option>` +
    getProjects().map(p => `<option value="${p}"${(t.project || "Inbox") === p ? " selected" : ""}>${p}</option>`).join("");
  projSel.value = t.project || "Inbox";

  // Check button
  const chk = $("taskEditCheck");
  chk.className = "task-check" + (t.completed ? " checked" : "");
  chk.dataset.priority = t.priority || 4;

  // Show
  $("taskEditPanel").classList.remove("hidden");
  $("taskEditOverlay").classList.remove("hidden");
  $("taskEditTitle").focus();
}

function closeTaskEdit() {
  $("taskEditPanel").classList.add("hidden");
  $("taskEditOverlay").classList.add("hidden");
  editingTaskId = null;
}

async function saveTaskEdit() {
  if (!editingTaskId) return;
  const t = tasks.find(x => x.id === editingTaskId);
  if (!t) return;

  const newTitle = $("taskEditTitle").value.trim();
  if (!newTitle) {
    $("taskEditTitle").focus();
    return;
  }

  t.title = newTitle;
  t.notes = $("taskEditNotes").value.trim();
  t.priority = parseInt($("taskEditPriority").value, 10) || 4;
  t.recurrence_rule = $("taskEditRecurrence").value || null;
  t.project = $("taskEditProject").value || "Inbox";
  t.tags = $("taskEditTags").value.split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean);

  const dueVal = $("taskEditDue").value;
  if (dueVal) {
    const d = new Date(dueVal);
    t.due_at = d.toISOString();
    t.has_time = d.getHours() !== 0 || d.getMinutes() !== 0;
  } else {
    t.due_at = null;
    t.has_time = false;
  }

  // Reminder / Notification
  const remSel = $("taskEditReminder");
  const remCustom = $("taskEditReminderCustom");
  if (remSel) {
    const val = remSel.value;
    if (val === "custom") {
      t.reminder_minutes_before = null;
      t.reminder_at = remCustom && remCustom.value ? new Date(remCustom.value).toISOString() : null;
    } else if (val === "none") {
      t.reminder_minutes_before = null;
      t.reminder_at = null;
    } else {
      t.reminder_minutes_before = parseInt(val, 10);
      t.reminder_at = null;
    }
  }

  if (typeof scheduleWebNotification === "function") {
    scheduleWebNotification(t);
  }

  closeTaskEdit();
  render();

  try {
    const payload = {
      title: t.title,
      notes: t.notes,
      priority: t.priority,
      recurrence_rule: t.recurrence_rule,
      project: t.project,
      tags: t.tags,
      due_at: t.due_at,
      has_time: t.has_time,
      reminder_minutes_before: t.reminder_minutes_before,
    };
    const res = await sb.from("tasks").update(payload).eq("id", t.id);
    if (res && res.error) {
      delete payload.reminder_minutes_before;
      await sb.from("tasks").update(payload).eq("id", t.id);
    }
  } catch (err) {
    console.warn("Failed to update task in Supabase:", err);
  }
}

$("taskEditClose").addEventListener("click", closeTaskEdit);
$("taskEditCancel").addEventListener("click", closeTaskEdit);
$("taskEditOverlay").addEventListener("click", closeTaskEdit);
$("taskEditSave").addEventListener("click", saveTaskEdit);

$("taskEditCheck").addEventListener("click", async () => {
  if (editingTaskId) {
    await toggleTask(editingTaskId);
    const t = tasks.find(x => x.id === editingTaskId);
    if (t) {
      $("taskEditCheck").className = "task-check" + (t.completed ? " checked" : "");
    }
  }
});

$("taskEditDelete").addEventListener("click", async () => {
  if (editingTaskId) {
    const id = editingTaskId;
    closeTaskEdit();
    await deleteTask(id);
  }
});

$("taskEditTitle").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    saveTaskEdit();
  } else if (e.key === "Escape") {
    closeTaskEdit();
  }
});

const remSelEl = $("taskEditReminder");
const remCustomEl = $("taskEditReminderCustom");
const notifWarnEl = $("taskEditNotifPermissionWarning");
const enableNotifBtnEl = $("taskEditEnableNotifBtn");

if (remSelEl) {
  remSelEl.addEventListener("change", async () => {
    const isCustom = remSelEl.value === "custom";
    if (remCustomEl) {
      remCustomEl.classList.toggle("hidden", !isCustom);
      if (isCustom && !remCustomEl.value && $("taskEditDue").value) {
        remCustomEl.value = $("taskEditDue").value;
      }
    }

    if (remSelEl.value !== "none" && typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        const res = await Notification.requestPermission();
        if (notifWarnEl) notifWarnEl.classList.toggle("hidden", res === "granted");
      } else if (Notification.permission === "denied") {
        if (notifWarnEl) notifWarnEl.classList.remove("hidden");
      } else {
        if (notifWarnEl) notifWarnEl.classList.add("hidden");
      }
    } else if (notifWarnEl) {
      notifWarnEl.classList.add("hidden");
    }
  });
}

if (enableNotifBtnEl) {
  enableNotifBtnEl.addEventListener("click", async (e) => {
    e.preventDefault();
    if (typeof Notification !== "undefined") {
      const res = await Notification.requestPermission();
      if (notifWarnEl) notifWarnEl.classList.toggle("hidden", res === "granted");
      if (res === "granted" && typeof scheduleAllWebNotifications === "function") {
        scheduleAllWebNotifications();
      }
    }
  });
}

// Single task row renderer (matching Todoist style)
function taskRow(t) {
  const li = document.createElement("li");
  li.className = "task-row" + (t.completed ? " completed" : "");

  const check = document.createElement("button");
  check.className = "task-check" + (t.completed ? " checked" : "");
  check.dataset.priority = t.priority || 4;
  check.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleTask(t.id);
  });

  const body = document.createElement("div");
  body.className = "task-body";
  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = t.title;
  body.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  let hasMeta = false;

  if (t.due_at) {
    hasMeta = true;
    const span = document.createElement("span");
    const overdue = isOverdue(t.due_at);
    span.className = "due-tag" + (overdue ? " overdue" : "");
    const d = new Date(t.due_at);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYest = isSameDay(d, yesterday);

    let dateText = isYest ? "Yesterday" : isToday(t.due_at) ? "Today" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (t.has_time) dateText += " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> <span>${dateText}</span>`;
    meta.appendChild(span);
  }

  if ((t.reminder_minutes_before !== null && t.reminder_minutes_before !== undefined && t.reminder_minutes_before !== -1 && t.reminder_minutes_before !== "none") || t.reminder_at) {
    hasMeta = true;
    const notifSpan = document.createElement("span");
    notifSpan.className = "task-meta-notif";
    notifSpan.title = "Notification set";
    notifSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
    meta.appendChild(notifSpan);
  }

  if (t.recurrence_rule) {
    hasMeta = true;
    const span = document.createElement("span");
    span.className = "recur-icon";
    span.textContent = "🔁 " + (getRecurLabel(t.recurrence_rule) || "Repeats");
    meta.appendChild(span);
  }

  if (t.project) {
    hasMeta = true;
    const projSpan = document.createElement("span");
    projSpan.className = "task-project-tag";
    projSpan.innerHTML = `<span>${t.project}</span> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`;
    meta.appendChild(projSpan);
  }

  (t.tags || []).forEach(tag => {
    hasMeta = true;
    const chip = document.createElement("span");
    chip.className = "task-tag-chip";
    chip.textContent = "@" + tag;
    chip.style.setProperty("--tag-color", getTagColor(tag));
    meta.appendChild(chip);
  });

  if (hasMeta) body.appendChild(meta);

  const del = document.createElement("button");
  del.className = "task-delete";
  del.textContent = "✕";
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTask(t.id);
  });

  li.addEventListener("click", (e) => {
    if (e.target.closest(".task-check") || e.target.closest(".task-delete")) return;
    openTaskEdit(t.id);
  });

  li.append(check, body, del);
  return li;
}
