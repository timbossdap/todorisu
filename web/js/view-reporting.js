// ============================================================
// REPORTING VIEW RENDERER (Completed Tasks History)
// ============================================================
let reportingProjectFilterVal = "all";
let reportingDateFilterVal = "all"; // "all" | "today" | "7days" | "30days"

function renderReportingView() {
  const container = $("reportingGroupsContainer");
  if (!container) return;
  container.innerHTML = "";

  // 1. Gather ONLY real completed tasks
  let completed = tasks.filter(t => t.completed);

  // 2. Filter by project
  if (reportingProjectFilterVal !== "all") {
    completed = completed.filter(t => (t.project || "Inbox").toLowerCase() === reportingProjectFilterVal.toLowerCase());
  }

  // 3. Filter by date
  const now = new Date();
  if (reportingDateFilterVal === "today") {
    completed = completed.filter(t => {
      const d = getTaskCompletionDate(t);
      return isSameDay(d, now);
    });
  } else if (reportingDateFilterVal === "7days") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    completed = completed.filter(t => getTaskCompletionDate(t) >= sevenDaysAgo);
  } else if (reportingDateFilterVal === "30days") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    completed = completed.filter(t => getTaskCompletionDate(t) >= thirtyDaysAgo);
  }

  // Update filter pill UI labels
  const projLabel = $("reportingProjectLabel");
  if (projLabel) {
    projLabel.textContent = reportingProjectFilterVal === "all" ? "# All projects" : `# ${reportingProjectFilterVal}`;
  }

  const dateLabel = $("reportingDateLabel");
  if (dateLabel) {
    const dateNames = { all: "Any date", today: "Today", "7days": "Past 7 days", "30days": "Past 30 days" };
    dateLabel.textContent = dateNames[reportingDateFilterVal] || "Any date";
  }

  const countBadge = $("reportingCompletedCountText");
  if (countBadge) {
    countBadge.textContent = `Completed (${completed.length})`;
  }

  // 4. Handle empty state with clean message (no placeholder tasks!)
  if (completed.length === 0) {
    container.innerHTML = `
      <div class="reporting-empty-state">
        <div class="reporting-empty-icon">✓</div>
        <div class="reporting-empty-title">No completed tasks yet</div>
        <div class="reporting-empty-sub">
          ${reportingProjectFilterVal !== "all" || reportingDateFilterVal !== "all"
            ? "No completed tasks match your selected filters."
            : "When you check off tasks, your completed history will appear here grouped by date."}
        </div>
      </div>
    `;
    return;
  }

  // 5. Sort by completed_at descending (newest first)
  completed.sort((a, b) => {
    const da = getTaskCompletionDate(a);
    const db = getTaskCompletionDate(b);
    return db - da;
  });

  // 6. Group by day of completion
  const groups = new Map();
  completed.forEach(t => {
    const d = getTaskCompletionDate(t);
    const key = d.toDateString();
    if (!groups.has(key)) groups.set(key, { date: d, items: [] });
    groups.get(key).items.push(t);
  });

  // 7. Render each group
  groups.forEach(({ date, items }) => {
    const group = document.createElement("div");
    group.className = "reporting-group";

    const header = document.createElement("div");
    header.className = "reporting-group-header";
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    let dayLabel;
    if (isSameDay(date, now)) dayLabel = "Today · " + date.toLocaleString(undefined, { weekday: "long" });
    else if (isSameDay(date, yesterday)) dayLabel = "Yesterday · " + date.toLocaleString(undefined, { weekday: "long" });
    else dayLabel = date.toLocaleString(undefined, { month: "short" }) + " " + date.getDate() + " · " + date.toLocaleString(undefined, { weekday: "long" });

    header.innerHTML = `<span>${dayLabel}</span><span class="reporting-count-num">${items.length}</span>`;
    group.appendChild(header);

    items.forEach(t => {
      const row = document.createElement("div");
      row.className = "reporting-item";

      // Left: avatar + action + chip
      const left = document.createElement("div");
      left.className = "reporting-item-left";

      const avatarWrap = document.createElement("div");
      avatarWrap.className = "reporting-avatar-wrap";
      const userNameEl = $("userName");
      const initials = (userNameEl?.textContent || "U").charAt(0).toUpperCase();
      avatarWrap.innerHTML = `
        <div class="reporting-avatar">${initials}</div>
        <div class="reporting-check-badge">✓</div>
      `;

      const action = document.createElement("span");
      action.className = "reporting-action-text";
      action.textContent = "You completed";

      const chip = document.createElement("button");
      chip.className = "reporting-task-chip";
      chip.title = "Click to mark active again";
      chip.innerHTML = `<span>✓</span><span>${escapeReportingHtml(t.title)}</span>`;
      chip.addEventListener("click", () => {
        // Toggle task back to active
        toggleTask(t.id);
      });

      left.appendChild(avatarWrap);
      left.appendChild(action);
      left.appendChild(chip);

      // Right: project + relative time
      const right = document.createElement("div");
      right.className = "reporting-item-right";
      const proj = t.project && t.project !== "Inbox" ? t.project : "";
      if (proj) {
        const projEl = document.createElement("span");
        projEl.className = "reporting-project-label";
        projEl.textContent = `# ${proj}`;
        right.appendChild(projEl);
      }

      const timeEl = document.createElement("span");
      timeEl.className = "reporting-time-ago";
      const taskDate = getTaskCompletionDate(t);
      const diffMs = Date.now() - taskDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMins < 1) timeEl.textContent = "Just now";
      else if (diffMins < 60) timeEl.textContent = `${diffMins}m ago`;
      else if (diffHrs < 24) timeEl.textContent = `${diffHrs}h ago`;
      else if (diffDays === 1) timeEl.textContent = "Yesterday";
      else timeEl.textContent = `${diffDays} days ago`;

      right.appendChild(timeEl);

      row.appendChild(left);
      row.appendChild(right);
      group.appendChild(row);
    });

    container.appendChild(group);
  });
}

function getTaskCompletionDate(t) {
  if (t.completed_at) {
    const d = new Date(t.completed_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (t.due_at) {
    const d = new Date(t.due_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (t.created_at) {
    const d = new Date(t.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function escapeReportingHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Wire Reporting Filter Interactivity
document.addEventListener("DOMContentLoaded", () => {
  wireReportingFilters();
});
if (document.readyState !== "loading") {
  wireReportingFilters();
}

function wireReportingFilters() {
  // Project filter button: click to cycle projects
  const projBtn = $("reportingProjectFilter");
  if (projBtn && !projBtn.dataset.wired) {
    projBtn.dataset.wired = "true";
    projBtn.addEventListener("click", () => {
      const allProjects = ["all", ...new Set(tasks.map(t => t.project || "Inbox"))];
      const curIdx = allProjects.indexOf(reportingProjectFilterVal);
      const nextIdx = (curIdx + 1) % allProjects.length;
      reportingProjectFilterVal = allProjects[nextIdx];
      renderReportingView();
    });
  }

  // Date filter button: click to cycle date windows
  const dateBtn = $("reportingDateFilter");
  if (dateBtn && !dateBtn.dataset.wired) {
    dateBtn.dataset.wired = "true";
    dateBtn.addEventListener("click", () => {
      const dateOptions = ["all", "today", "7days", "30days"];
      const curIdx = dateOptions.indexOf(reportingDateFilterVal);
      const nextIdx = (curIdx + 1) % dateOptions.length;
      reportingDateFilterVal = dateOptions[nextIdx];
      renderReportingView();
    });
  }
}
