// ============================================================
// SEARCH / COMMAND PALETTE MODAL (Matching Todoist Screenshot)
// ============================================================
let searchSelectedIndex = 0;
let searchCurrentItems = [];

function openSearch() {
  $("searchModal").classList.remove("hidden");
  $("searchInput").value = "";
  searchSelectedIndex = 0;
  renderSearchResults("");
  $("searchInput").focus();
}

function closeSearch() {
  $("searchModal").classList.add("hidden");
}

function updateSearchSelection() {
  const items = document.querySelectorAll("#searchResults .search-item");
  items.forEach((it, idx) => {
    const isSel = idx === searchSelectedIndex;
    it.classList.toggle("selected", isSel);
    if (isSel) {
      it.scrollIntoView({ block: "nearest" });
    }
  });
}

function renderSearchResults(query) {
  const list = $("searchResults");
  list.innerHTML = "";
  searchCurrentItems = [];
  const q = query.trim().toLowerCase();

  const iconUpcoming = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
  const iconInbox = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`;
  const iconToday = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><text x="7" y="18" font-size="8" font-weight="bold" fill="currentColor">11</text></svg>`;
  const iconHome = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
  const iconFilters = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;

  function addItem({ icon, title, badge, meta, onSelect }) {
    const item = document.createElement("div");
    const itemIndex = searchCurrentItems.length;
    item.className = "search-item" + (itemIndex === searchSelectedIndex ? " selected" : "");

    let metaHtml = "";
    if (meta) {
      metaHtml = `<div class="search-result-meta">${meta}</div>`;
    }
    let badgeHtml = "";
    if (badge) {
      badgeHtml = `<div class="search-badge">${badge}</div>`;
    }

    item.innerHTML = `
      <div class="search-item-left">
        <span class="search-item-icon">${icon}</span>
        <span class="search-item-title">${title}</span>
      </div>
      ${metaHtml || badgeHtml}
    `;

    const selectAction = () => {
      closeSearch();
      onSelect();
    };

    item.addEventListener("mouseenter", () => {
      searchSelectedIndex = itemIndex;
      updateSearchSelection();
    });

    item.addEventListener("click", selectAction);

    list.appendChild(item);
    searchCurrentItems.push({ el: item, onSelect: selectAction });
  }

  function addGroupTitle(text) {
    const titleEl = document.createElement("div");
    titleEl.className = "search-group-title";
    titleEl.textContent = text;
    list.appendChild(titleEl);
  }

  if (q.length === 0) {
    // Recently viewed section
    addGroupTitle("Recently viewed");

    addItem({
      icon: iconUpcoming,
      title: "Upcoming",
      onSelect: () => {
        currentView = "upcoming";
        currentProject = null;
        currentTag = null;
        currentFilter = null;
        recordRecentView("Upcoming");
        render();
      }
    });

    addItem({
      icon: iconInbox,
      title: "Inbox",
      onSelect: () => {
        currentView = "inbox";
        currentProject = null;
        currentTag = null;
        currentFilter = null;
        recordRecentView("Inbox");
        render();
      }
    });

    addItem({
      icon: iconToday,
      title: "Today",
      onSelect: () => {
        currentView = "today";
        currentProject = null;
        currentTag = null;
        currentFilter = null;
        recordRecentView("Today");
        render();
      }
    });

    // Navigation section
    addGroupTitle("Navigation");

    addItem({
      icon: iconHome,
      title: "Go to home",
      badge: `<kbd>G</kbd> then <kbd>H</kbd>`,
      onSelect: () => {
        currentView = "upcoming";
        currentProject = null;
        currentTag = null;
        currentFilter = null;
        recordRecentView("Upcoming");
        render();
      }
    });

    addItem({
      icon: iconInbox,
      title: "Go to Inbox",
      badge: `<kbd>G</kbd> then <kbd>i</kbd>`,
      onSelect: () => {
        currentView = "inbox";
        currentProject = null;
        currentTag = null;
        currentFilter = null;
        recordRecentView("Inbox");
        render();
      }
    });

    addItem({
      icon: iconToday,
      title: "Go to Today",
      badge: `<kbd>G</kbd> then <kbd>T</kbd>`,
      onSelect: () => {
        currentView = "today";
        currentProject = null;
        currentTag = null;
        currentFilter = null;
        recordRecentView("Today");
        render();
      }
    });

    addItem({
      icon: iconUpcoming,
      title: "Go to Upcoming",
      badge: `<kbd>G</kbd> then <kbd>U</kbd>`,
      onSelect: () => {
        currentView = "upcoming";
        currentProject = null;
        currentTag = null;
        currentFilter = null;
        recordRecentView("Upcoming");
        render();
      }
    });

    addItem({
      icon: iconFilters,
      title: "Go to Filters & Labels",
      badge: `<kbd>G</kbd> then <kbd>V</kbd>`,
      onSelect: () => {
        currentView = "filters";
        currentProject = null;
        currentTag = null;
        currentFilter = null;
        recordRecentView("Filters & Labels");
        render();
      }
    });
  } else {
    // Filter tasks
    const matchedTasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.notes || "").toLowerCase().includes(q) ||
      (t.project || "").toLowerCase().includes(q) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(q))
    ).slice(0, 15);

    // Filter navigation
    const navOptions = [
      { key: "home", title: "Go to home", view: "upcoming", icon: iconHome, badge: "<kbd>G</kbd> then <kbd>H</kbd>" },
      { key: "inbox", title: "Go to Inbox", view: "inbox", icon: iconInbox, badge: "<kbd>G</kbd> then <kbd>i</kbd>" },
      { key: "today", title: "Go to Today", view: "today", icon: iconToday, badge: "<kbd>G</kbd> then <kbd>T</kbd>" },
      { key: "upcoming", title: "Go to Upcoming", view: "upcoming", icon: iconUpcoming, badge: "<kbd>G</kbd> then <kbd>U</kbd>" },
      { key: "filters", title: "Go to Filters & Labels", view: "filters", icon: iconFilters, badge: "<kbd>G</kbd> then <kbd>V</kbd>" },
      { key: "labels", title: "Go to Filters & Labels", view: "filters", icon: iconFilters, badge: "<kbd>G</kbd> then <kbd>V</kbd>" },
      { key: "reporting", title: "Go to Reporting", view: "reporting", icon: iconUpcoming, badge: "" },
      { key: "settings", title: "Go to Settings", view: "settings", icon: iconHome, badge: "" },
    ];
    const matchedNav = navOptions.filter(n => n.key.includes(q) || n.title.toLowerCase().includes(q));

    if (matchedTasks.length > 0) {
      addGroupTitle("Tasks");
      matchedTasks.forEach(t => {
        const overdue = !t.completed && isOverdue(t.due_at);
        let metaParts = [];
        if (t.project && t.project !== "Inbox") metaParts.push(`<span># ${t.project}</span>`);
        if (t.due_at) {
          metaParts.push(`<span style="color:${overdue ? "var(--app-primary)" : "var(--app-text-muted)"}">
            ${isToday(t.due_at) ? "Today" : new Date(t.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>`);
        }
        if (t.completed) metaParts.push(`<span style="color:#4caf50">✓ Done</span>`);

        addItem({
          icon: `<span class="task-check" data-priority="${t.priority || 4}" style="margin:0;pointer-events:none;"></span>`,
          title: t.title,
          meta: metaParts.join(""),
          onSelect: () => {
            openTaskEdit(t.id);
          }
        });
      });
    }

    if (matchedNav.length > 0) {
      addGroupTitle("Navigation");
      matchedNav.forEach(n => {
        addItem({
          icon: n.icon,
          title: n.title,
          badge: n.badge,
          onSelect: () => {
            currentView = n.view;
            currentProject = null;
            currentTag = null;
            currentFilter = null;
            recordRecentView(n.title.replace("Go to ", ""));
            render();
          }
        });
      });
    }

    if (matchedTasks.length === 0 && matchedNav.length === 0) {
      list.innerHTML = `<div style="color:var(--app-text-muted);padding:16px 18px;font-size:13px;">No results found for "${query}"</div>`;
    }
  }

  // Ensure index is within bounds
  if (searchSelectedIndex >= searchCurrentItems.length) {
    searchSelectedIndex = 0;
  }
  updateSearchSelection();
}

$("searchBtn").addEventListener("click", openSearch);
$("searchInput").addEventListener("input", (e) => {
  searchSelectedIndex = 0;
  renderSearchResults(e.target.value);
});
$("searchModal").addEventListener("click", (e) => {
  if (e.target === $("searchModal")) closeSearch();
});

$("searchInput").addEventListener("keydown", (e) => {
  if (searchCurrentItems.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    searchSelectedIndex = (searchSelectedIndex + 1) % searchCurrentItems.length;
    updateSearchSelection();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    searchSelectedIndex = (searchSelectedIndex - 1 + searchCurrentItems.length) % searchCurrentItems.length;
    updateSearchSelection();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (searchCurrentItems[searchSelectedIndex]) {
      searchCurrentItems[searchSelectedIndex].onSelect();
    }
  } else if (e.key === "Escape") {
    closeSearch();
  }
});

