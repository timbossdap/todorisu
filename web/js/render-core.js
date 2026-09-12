// ============================================================
// RENDER MAIN VIEWS
// ============================================================
function render() {
  document.querySelectorAll(".nav-item[data-view]").forEach(b =>
    b.classList.toggle("active", b.dataset.view === currentView && !currentProject && !currentTag && !currentFilter));
  if (typeof updateMobileNavActive === "function") updateMobileNavActive();

  // Today & Inbox count badges
  const todayCount = tasks.filter(t => !t.completed && (isToday(t.due_at) || isOverdue(t.due_at))).length;
  $("countToday").textContent = todayCount || "";
  const inboxCount = tasks.filter(t => !t.completed && (t.project || "Inbox") === "Inbox").length;
  $("countInbox").textContent = inboxCount || "";
  $("todayIconDay").textContent = new Date().getDate();

  // Populate projects list
  const projectList = $("projectList");
  projectList.innerHTML = "";
  const projColors = ["#dc4c3e", "#2196f3", "#4caf50", "#ff9800", "#9c27b0", "#009688"];
  getProjects().forEach((p, idx) => {
    const btn = document.createElement("button");
    btn.className = "nav-item project-item" + (currentProject === p ? " active" : "");
    const color = projColors[idx % projColors.length];
    btn.innerHTML = `<span class="project-dot" style="background:${color}"></span><span class="nav-label">${p}</span>`;
    btn.addEventListener("click", () => {
      currentProject = p;
      currentTag = null;
      currentFilter = null;
      currentView = "project";
      recordRecentView(p);
      render();
    });
    projectList.appendChild(btn);
  });

  // Populate tags list
  const tagList = $("tagList");
  tagList.innerHTML = "";
  getTags().forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "nav-item project-item" + (currentTag === tag ? " active" : "");
    btn.innerHTML = `<span class="nav-label">@${tag}</span>`;
    btn.addEventListener("click", () => {
      currentTag = tag;
      currentProject = null;
      currentFilter = null;
      currentView = "tag";
      recordRecentView("@" + tag);
      render();
    });
    tagList.appendChild(btn);
  });

  // Populate quick add projects
  const qp = $("quickAddProject");
  qp.innerHTML = `<option value="Inbox">Inbox</option>` + getProjects().map(p => `<option value="${p}">${p}</option>`).join("");

  // Switch view containers
  const isReporting = currentView === "reporting";
  $("displayBtn").classList.toggle("hidden", isReporting);
  $("exportBtn").classList.toggle("hidden", !isReporting);

  const allViewElements = ["upcomingView", "standardTaskView", "reportingView", "filtersView"];
  allViewElements.forEach(id => {
    const el = $(id);
    if (el) el.classList.add("hidden");
  });

  const todayTasks = tasks.filter(t => {
    if (!t.due_at) return false;
    const d = new Date(t.due_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const menuGoalSub = $("menuUserTasksCount");
  if (menuGoalSub) {
    menuGoalSub.textContent = `${todayCompleted}/5 tasks`;
  }

  if (currentView === "upcoming") {
    $("upcomingView").classList.remove("hidden");
    renderUpcomingView();
  } else if (currentView === "reporting") {
    $("reportingView").classList.remove("hidden");
    renderReportingView();
  } else if (currentView === "filters") {
    $("filtersView").classList.remove("hidden");
    renderFiltersView();
  } else {
    $("standardTaskView").classList.remove("hidden");
    renderStandardView();
  }
}
