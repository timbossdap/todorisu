// ============================================================
// UPCOMING VIEW RENDERER (Matching the Screenshot!)
// ============================================================
function renderUpcomingView() {
  // Month Label: e.g. "September 2026"
  const midWeekDate = new Date(selectedWeekStart);
  midWeekDate.setDate(midWeekDate.getDate() + 3);
  const monthYearStr = midWeekDate.toLocaleString(undefined, { month: "long", year: "numeric" });
  $("upcomingMonthLabel").textContent = monthYearStr;

  // 7-Day Horizontal Week Strip
  const strip = $("upcomingWeekStrip");
  strip.innerHTML = "";
  const now = new Date();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(selectedWeekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dayCol = document.createElement("div");
    dayCol.className = "week-strip-col";
    const dayIsToday = isSameDay(dayDate, now);

    dayCol.innerHTML = `
      <div class="col-day-name">${dayNames[i]}</div>
      <div class="col-day-num ${dayIsToday ? 'is-today' : ''}">${dayDate.getDate()}</div>
    `;

    dayCol.addEventListener("click", () => {
      document.querySelectorAll(".week-strip-col").forEach(c => c.classList.remove("selected"));
      dayCol.classList.add("selected");
      const targetSec = document.getElementById("day_sec_" + dayDate.toISOString().slice(0, 10));
      if (targetSec) targetSec.scrollIntoView({ behavior: "smooth" });
    });

    strip.appendChild(dayCol);
  }

  // Overdue Section
  const overdueTasks = tasks.filter(t => !t.completed && isOverdue(t.due_at));
  const overdueSection = $("overdueSection");
  const overdueList = $("overdueTaskList");

  if (overdueTasks.length > 0) {
    overdueSection.classList.remove("hidden");
    $("toggleOverdueBtn").classList.toggle("collapsed", isOverdueCollapsed);
    overdueList.classList.toggle("hidden", isOverdueCollapsed);
    overdueList.innerHTML = "";
    overdueTasks.forEach(t => overdueList.appendChild(taskRow(t)));
  } else {
    overdueSection.classList.add("hidden");
  }

  // Day-by-Day Sections
  const daysContainer = $("upcomingDaysContainer");
  daysContainer.innerHTML = "";

  // Render 7 days of the selected week (or start from today if on current week)
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(selectedWeekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dateKey = dayDate.toISOString().slice(0, 10);

    const daySection = document.createElement("div");
    daySection.className = "day-section";
    daySection.id = "day_sec_" + dateKey;

    // Header
    const header = document.createElement("div");
    header.className = "day-header";
    header.innerHTML = `<span class="day-header-title">${formatDayHeader(dayDate)}</span>`;
    daySection.appendChild(header);

    // Calendar Events Box
    const calendarEvents = CalendarManager.getEventsForDate(dayDate);
    if (calendarEvents.length > 0 && showCalendarEvents) {
      const isCollapsed = collapsedCalendarDays[dateKey];
      const calBox = document.createElement("div");
      calBox.className = "day-calendar-box";

      // Top right collapse chevron
      const collapseBtn = document.createElement("button");
      collapseBtn.className = "calendar-box-collapse-btn";
      collapseBtn.textContent = isCollapsed ? "⌵" : "^";
      collapseBtn.addEventListener("click", () => {
        collapsedCalendarDays[dateKey] = !collapsedCalendarDays[dateKey];
        renderUpcomingView();
      });

      const calHeader = document.createElement("div");
      calHeader.className = "calendar-box-header";
      calHeader.appendChild(document.createElement("div"));
      calHeader.appendChild(collapseBtn);
      calBox.appendChild(calHeader);

      if (!isCollapsed) {
        const eventsGrid = document.createElement("div");
        eventsGrid.className = "calendar-events-grid";

        calendarEvents.forEach(evt => {
          if (evt.isPastGroup) {
            const pastRow = document.createElement("div");
            pastRow.className = "past-events-summary";
            pastRow.innerHTML = `<span class="past-events-bars">|||</span> <span>${evt.count} past events</span>`;
            eventsGrid.appendChild(pastRow);
          } else {
            const row = document.createElement("div");
            row.className = "calendar-event-item";
            const stripeClass = evt.stripe || "red";
            row.innerHTML = `
              <span class="event-stripe ${stripeClass}"></span>
              ${evt.time ? `<span class="event-time">${evt.time}</span>` : ''}
              <span class="event-summary">${evt.title}</span>
            `;
            eventsGrid.appendChild(row);
          }
        });
        calBox.appendChild(eventsGrid);
      }
      daySection.appendChild(calBox);
    }

    // Tasks for this Day
    const dayTasks = tasks.filter(t => !t.completed && t.due_at && isSameDay(t.due_at, dayDate));
    if (dayTasks.length > 0) {
      const taskUl = document.createElement("ul");
      taskUl.className = "task-list";
      dayTasks.forEach(t => taskUl.appendChild(taskRow(t)));
      daySection.appendChild(taskUl);
    }

    // Inline "+ Add task" button under this day
    const inlineAddRow = document.createElement("div");
    inlineAddRow.className = "inline-add-row";
    const addBtn = document.createElement("button");
    addBtn.className = "inline-add-task-btn";
    addBtn.innerHTML = `<span class="plus-red">+</span> <span>Add task</span>`;
    addBtn.addEventListener("click", () => {
      openInlineAdd(daySection, dayDate);
    });
    inlineAddRow.appendChild(addBtn);
    daySection.appendChild(inlineAddRow);

    daysContainer.appendChild(daySection);
  }
}

// Inline task creation under a day
function openInlineAdd(daySection, targetDate) {
  // Close any existing inline add
  const existing = document.querySelector(".inline-quick-add");
  if (existing) existing.remove();

  const wrap = document.createElement("div");
  wrap.className = "quick-add inline-quick-add";
  wrap.innerHTML = `
    <input type="text" class="inline-input" placeholder='e.g. "Meeting at 2pm #Work !high"' autofocus />
    <div class="quick-add-actions">
      <button class="btn-primary inline-save">Add task</button>
      <button class="btn-ghost inline-cancel">Cancel</button>
    </div>
  `;

  const input = wrap.querySelector(".inline-input");
  const saveBtn = wrap.querySelector(".inline-save");
  const cancelBtn = wrap.querySelector(".inline-cancel");

  const save = () => {
    const raw = input.value.trim();
    if (!raw) return;
    const parsed = parseSmartInput(raw);
    const dueDate = parsed.dueDate || new Date(targetDate);
    if (!parsed.dueDate) dueDate.setHours(9, 0, 0, 0);

    addTask({
      title: parsed.cleanTitle || raw,
      project: parsed.project || "Inbox",
      due_at: dueDate.toISOString(),
      has_time: parsed.hasTime,
      priority: parsed.priority || 4,
      recurrence_rule: parsed.recurrence || null,
      tags: parsed.tags || [],
    });
    wrap.remove();
  };

  saveBtn.addEventListener("click", save);
  cancelBtn.addEventListener("click", () => wrap.remove());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") wrap.remove();
  });

  daySection.appendChild(wrap);
  input.focus();
}

