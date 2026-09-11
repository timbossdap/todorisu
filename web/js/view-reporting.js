// ============================================================
// REPORTING VIEW RENDERER
// ============================================================
function renderReportingView() {
  const container = $("reportingGroupsContainer");
  container.innerHTML = "";

  // Gather completed tasks; fall back to sample data if none
  let completed = tasks.filter(t => t.completed);
  if (completed.length === 0) {
    const now = new Date();
    const todayIso = now.toISOString();
    const hoursAgo = (h) => new Date(now.getTime() - h * 3600000).toISOString();
    completed = [
      { id: "__s1", title: "PHIL hand in", project: "uni", completed: true, completed_at: hoursAgo(4) },
      { id: "__s2", title: "PDHPE handin", project: "uni", completed: true, completed_at: hoursAgo(5) },
      { id: "__s3", title: "IMDB AI Milestone", project: "Work", completed: true, completed_at: hoursAgo(6) },
    ];
  }

  // Sort by completed_at descending (newest first)
  completed.sort((a, b) => {
    const da = a.completed_at ? new Date(a.completed_at) : new Date(0);
    const db = b.completed_at ? new Date(b.completed_at) : new Date(0);
    return db - da;
  });

  // Group by day of completion
  const groups = new Map();
  completed.forEach(t => {
    const d = t.completed_at ? new Date(t.completed_at) : new Date();
    const key = d.toDateString();
    if (!groups.has(key)) groups.set(key, { date: d, items: [] });
    groups.get(key).items.push(t);
  });

  // Render each group
  groups.forEach(({ date, items }) => {
    const group = document.createElement("div");
    group.className = "reporting-group";

    const header = document.createElement("div");
    header.className = "reporting-group-header";
    const now = new Date();
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
      // Get initials from user name
      const initials = ($("userAvatar").textContent || "U").charAt(0).toUpperCase();
      avatarWrap.innerHTML = `
        <div class="reporting-avatar">${initials}</div>
        <div class="reporting-check-badge">✓</div>
      `;

      const action = document.createElement("span");
      action.className = "reporting-action-text";
      action.textContent = "You completed";

      const chip = document.createElement("button");
      chip.className = "reporting-task-chip";
      chip.innerHTML = `<span>✓</span><span>${t.title}</span>`;
      chip.addEventListener("click", () => {
        // Un-complete the task (if real task, not sample)
        if (!t.id.startsWith("__s")) toggleTask(t.id);
      });

      left.appendChild(avatarWrap);
      left.appendChild(action);
      left.appendChild(chip);

      // Right: project + time ago
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
      if (t.completed_at) {
        const diffMs = Date.now() - new Date(t.completed_at).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);
        if (diffMins < 60) timeEl.textContent = `${diffMins}m ago`;
        else if (diffHrs < 24) timeEl.textContent = `${diffHrs} hour${diffHrs !== 1 ? "s" : ""} ago`;
        else timeEl.textContent = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
      }
      right.appendChild(timeEl);

      row.appendChild(left);
      row.appendChild(right);
      group.appendChild(row);
    });

    container.appendChild(group);
  });
}
