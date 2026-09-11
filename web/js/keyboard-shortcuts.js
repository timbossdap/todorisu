// Keyboard shortcuts: 'q' for quick add, Cmd+K / '/' for search, 'Esc' to close, 'G then ...' for navigation
let lastKeyTime = 0;
let pendingKeyG = false;
let pendingKeyO = false;

document.addEventListener("keydown", (e) => {
  const tag = document.activeElement.tagName;
  const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);

  if (e.key === "Escape") {
    $("quickAdd").classList.add("hidden");
    $("calendarModal").classList.add("hidden");
    $("rescheduleModal").classList.add("hidden");
    $("displayDropdown").classList.add("hidden");
    closeSearch();
    closeTaskEdit();
    closeSettings();
    closeProfileDropdown();
    return;
  }

  if (inInput) return;

  if (e.key === "q") {
    e.preventDefault();
    $("quickAdd").classList.remove("hidden");
    $("quickAddInput").focus();
    return;
  }

  if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
    e.preventDefault();
    openSearch();
    return;
  }

  const now = Date.now();

  // Handle "O then S" (Settings), "O then P" (Profile/Account)
  if (e.key.toLowerCase() === "o") {
    pendingKeyO = true;
    pendingKeyG = false;
    lastKeyTime = now;
    return;
  }

  if (pendingKeyO && now - lastKeyTime < 1200) {
    pendingKeyO = false;
    const k = e.key.toLowerCase();
    if (k === "s") {
      e.preventDefault();
      openSettings("notifications");
      return;
    } else if (k === "p") {
      e.preventDefault();
      openSettings("account");
      return;
    }
  } else {
    pendingKeyO = false;
  }

  // Handle "G then H", "G then I", "G then A", etc.
  if (e.key.toLowerCase() === "g") {
    pendingKeyG = true;
    pendingKeyO = false;
    lastKeyTime = now;
    return;
  }

  if (pendingKeyG && now - lastKeyTime < 1200) {
    pendingKeyG = false;
    const k = e.key.toLowerCase();
    if (k === "h" || k === "u") {
      e.preventDefault();
      currentView = "upcoming";
      currentProject = null;
      currentTag = null;
      currentFilter = null;
      recordRecentView("Upcoming");
      render();
    } else if (k === "i") {
      e.preventDefault();
      currentView = "inbox";
      currentProject = null;
      currentTag = null;
      currentFilter = null;
      recordRecentView("Inbox");
      render();
    } else if (k === "t") {
      e.preventDefault();
      currentView = "today";
      currentProject = null;
      currentTag = null;
      currentFilter = null;
      recordRecentView("Today");
      render();
    } else if (k === "v") {
      e.preventDefault();
      currentView = "filters";
      currentProject = null;
      currentTag = null;
      currentFilter = null;
      recordRecentView("Filters & Labels");
      render();
    } else if (k === "a") {
      e.preventDefault();
      currentView = "reporting";
      recordRecentView("Reporting");
      render();
    }
  } else {
    pendingKeyG = false;
  }
});

