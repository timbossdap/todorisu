// ============================================================
// EVENT LISTENERS & NAVIGATION CONTROLS
// ============================================================
// Week navigation
$("prevWeekBtn").addEventListener("click", () => {
  selectedWeekStart.setDate(selectedWeekStart.getDate() - 7);
  renderUpcomingView();
});

$("nextWeekBtn").addEventListener("click", () => {
  selectedWeekStart.setDate(selectedWeekStart.getDate() + 7);
  renderUpcomingView();
});

$("todayWeekBtn").addEventListener("click", () => {
  selectedWeekStart = getMonday(new Date());
  renderUpcomingView();
});

// Overdue collapse toggle
$("toggleOverdueBtn").addEventListener("click", () => {
  isOverdueCollapsed = !isOverdueCollapsed;
  $("toggleOverdueBtn").classList.toggle("collapsed", isOverdueCollapsed);
  $("overdueTaskList").classList.toggle("hidden", isOverdueCollapsed);
});

// Reschedule Overdue button
$("rescheduleBtn").addEventListener("click", () => {
  $("rescheduleModal").classList.remove("hidden");
});
$("closeRescheduleModal").addEventListener("click", () => {
  $("rescheduleModal").classList.add("hidden");
});

document.querySelectorAll(".reschedule-option").forEach(btn => {
  btn.addEventListener("click", async () => {
    const target = btn.dataset.target;
    const newDate = new Date();
    if (target === "tomorrow") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (target === "nextweek") {
      newDate.setDate(newDate.getDate() + ((1 + 7 - newDate.getDay()) % 7 || 7));
    }
    newDate.setHours(9, 0, 0, 0);

    const overdueTasks = tasks.filter(t => !t.completed && isOverdue(t.due_at));
    for (const t of overdueTasks) {
      t.due_at = newDate.toISOString();
      await sb.from("tasks").update({ due_at: t.due_at }).eq("id", t.id);
    }
    $("rescheduleModal").classList.add("hidden");
    render();
  });
});

// Display Dropdown menu
$("displayBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("displayDropdown").classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!$("displayDropdown").contains(e.target) && e.target !== $("displayBtn")) {
    $("displayDropdown").classList.add("hidden");
  }
});

$("displayShowCalendar").checked = showCalendarEvents;
$("displayShowCalendar").addEventListener("change", (e) => {
  showCalendarEvents = e.target.checked;
  localStorage.setItem("tasks_show_calendar", showCalendarEvents ? "true" : "false");
  render();
});

$("displayShowCompleted").checked = showCompletedTasks;
$("displayShowCompleted").addEventListener("change", (e) => {
  showCompletedTasks = e.target.checked;
  render();
});

$("displayManageCalendar").addEventListener("click", () => {
  $("displayDropdown").classList.add("hidden");
  openCalendarModal();
});

// Calendar Modal
function openCalendarModal() {
  $("calendarModal").classList.remove("hidden");
  $("modalTimetableToggle").checked = CalendarManager.isTimetableEnabled();
  renderConnectedFeeds();
}
$("closeCalendarModal").addEventListener("click", () => $("calendarModal").classList.add("hidden"));

$("modalTimetableToggle").addEventListener("change", (e) => {
  CalendarManager.setTimetableEnabled(e.target.checked);
});

$("addFeedBtn").addEventListener("click", async () => {
  const url = $("calendarFeedUrl").value.trim();
  if (!url) return;
  await CalendarManager.addFeed(url);
  $("calendarFeedUrl").value = "";
  renderConnectedFeeds();
});

$("calendarFileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = CalendarManager.parseIcs(text);
  const feedId = "file_" + Date.now();
  const feeds = CalendarManager.getFeeds();
  feeds.push({ id: feedId, name: file.name, url: feedId });
  CalendarManager.saveFeeds(feeds);
  localStorage.setItem("tasks_cache_" + feedId, JSON.stringify(parsed));
  renderConnectedFeeds();
});

function renderConnectedFeeds() {
  const list = $("connectedFeedsList");
  list.innerHTML = "";
  const feeds = CalendarManager.getFeeds();
  if (feeds.length === 0) {
    list.innerHTML = `<li style="color:#777; font-size:12px;">No external calendar feeds added.</li>`;
    return;
  }
  feeds.forEach(f => {
    const li = document.createElement("li");
    li.className = "feed-item";
    li.innerHTML = `
      <span class="feed-name">${f.name}</span>
      <button class="feed-delete-btn" data-id="${f.id}">✕</button>
    `;
    li.querySelector(".feed-delete-btn").addEventListener("click", () => {
      CalendarManager.removeFeed(f.id);
      renderConnectedFeeds();
    });
    list.appendChild(li);
  });
}

// Quick Add Global Bar
$("quickAddBtn").addEventListener("click", () => {
  $("quickAdd").classList.remove("hidden");
  $("quickAddInput").focus();
});
$("standardInlineAddBtn").addEventListener("click", () => {
  $("quickAdd").classList.remove("hidden");
  $("quickAddInput").focus();
});
$("quickAddCancel").addEventListener("click", () => $("quickAdd").classList.add("hidden"));
$("quickAddSave").addEventListener("click", saveQuickAdd);
$("quickAddInput").addEventListener("keydown", (e) => { if (e.key === "Enter") saveQuickAdd(); });
$("quickAddInput").addEventListener("input", renderSmartPreview);

function saveQuickAdd() {
  const raw = $("quickAddInput").value.trim();
  if (!raw) return;
  const parsed = parseSmartInput(raw);
  const title = parsed.cleanTitle || raw;

  const manualTags = $("quickAddTags").value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const tags = [...new Set([...(parsed.tags || []), ...manualTags])];

  const due_at = parsed.dueDate
    ? parsed.dueDate.toISOString()
    : ($("quickAddDate").value ? new Date($("quickAddDate").value).toISOString() : null);
  const has_time = parsed.dueDate ? parsed.hasTime : !!$("quickAddDate").value;

  addTask({
    title,
    project: parsed.project || $("quickAddProject").value,
    due_at, has_time,
    priority: parsed.priority || parseInt($("quickAddPriority").value, 10),
    recurrence_rule: parsed.recurrence || $("quickAddRecurrence").value || null,
    tags,
  });

  $("quickAddInput").value = "";
  $("quickAddDate").value = "";
  $("quickAddTags").value = "";
  $("quickAddRecurrence").value = "";
  $("quickAddPriority").value = "4";
  $("smartPreview").classList.add("hidden");
  $("quickAdd").classList.add("hidden");
}

$("toggleCompleted").addEventListener("click", () => {
  showCompletedTasks = !showCompletedTasks;
  $("displayShowCompleted").checked = showCompletedTasks;
  render();
});

