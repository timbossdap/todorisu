// ============================================================
// STANDARD TASK VIEW (Today, Inbox, Projects, Tags)
// ============================================================
function visibleTasks() {
  let list = tasks.filter(t => showCompletedTasks || !t.completed);
  if (currentFilter === "assigned") return list;
  if (currentFilter === "priority1") return list.filter(t => t.priority === 1);
  if (currentTag) return list.filter(t => (t.tags || []).includes(currentTag));
  if (currentProject) return list.filter(t => (t.project || "Inbox") === currentProject);
  if (currentView === "today") return list.filter(t => isToday(t.due_at) || isOverdue(t.due_at));
  if (currentView === "inbox") return list.filter(t => (t.project || "Inbox") === "Inbox");
  return list;
}

function renderStandardView() {
  $("viewTitle").textContent = currentFilter
    ? (currentFilter === "priority1" ? "Priority 1" : "Assigned to me")
    : currentTag
    ? `@${currentTag}`
    : currentProject || (
      currentView === "today" ? "Today" : currentView === "inbox" ? "Inbox" : "Tasks"
    );
  $("viewDate").textContent = currentView === "today" && !currentProject && !currentTag && !currentFilter
    ? new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";

  // Show calendar box on Today view if enabled
  const todayBox = $("todayCalendarCard");
  if (currentView === "today" && showCalendarEvents) {
    const events = CalendarManager.getEventsForDate(new Date());
    if (events.length > 0) {
      todayBox.classList.remove("hidden");
      todayBox.innerHTML = `
        <div class="calendar-events-grid">
          ${events.map(evt => evt.isPastGroup ? `
            <div class="past-events-summary"><span class="past-events-bars">|||</span> <span>${evt.count} past events</span></div>
          ` : `
            <div class="calendar-event-item">
              <span class="event-stripe ${evt.stripe || 'red'}"></span>
              ${evt.time ? `<span class="event-time">${evt.time}</span>` : ''}
              <span class="event-summary">${evt.title}</span>
            </div>
          `).join("")}
        </div>
      `;
    } else {
      todayBox.classList.add("hidden");
    }
  } else {
    todayBox.classList.add("hidden");
  }

  const visible = visibleTasks();
  const uncompleted = visible.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  $("taskList").innerHTML = "";
  $("emptyState").classList.toggle("hidden", uncompleted.length > 0);
  uncompleted.sort((a, b) => (a.due_at || "").localeCompare(b.due_at || "")).forEach(t => $("taskList").appendChild(taskRow(t)));

  $("completedList").innerHTML = "";
  completed.forEach(t => $("completedList").appendChild(taskRow(t)));
  $("completedList").classList.toggle("hidden", !showCompletedTasks);
  $("toggleCompleted").textContent = showCompletedTasks ? "Hide completed" : "Show completed";
}

