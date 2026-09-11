// ============================================================
// PROFILE DROPDOWN & SETTINGS MODAL
// ============================================================
let currentSettingsTab = "notifications";

function toggleProfileDropdown(show) {
  const menu = $("profileDropdownMenu");
  if (!menu) return;
  const isHidden = menu.classList.contains("hidden");
  const shouldOpen = (show !== undefined) ? show : isHidden;
  if (shouldOpen) {
    menu.classList.remove("hidden");
  } else {
    menu.classList.add("hidden");
  }
}

function closeProfileDropdown() {
  toggleProfileDropdown(false);
}

const userDropdownBtn = $("userDropdownBtn");
if (userDropdownBtn) {
  userDropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleProfileDropdown();
  });
}

const userAvatarEl = $("userAvatar");
if (userAvatarEl) {
  userAvatarEl.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleProfileDropdown();
  });
}

// Close profile dropdown when clicking outside
window.addEventListener("click", (e) => {
  const menu = $("profileDropdownMenu");
  if (menu && !menu.classList.contains("hidden")) {
    if (!menu.contains(e.target) && !e.target.closest(".sidebar-profile")) {
      closeProfileDropdown();
    }
  }
});

// Profile Dropdown Menu Item Actions
const menuItemProfile = $("menuItemProfile");
if (menuItemProfile) {
  menuItemProfile.addEventListener("click", () => {
    closeProfileDropdown();
    openSettings("account");
  });
}

const menuItemSettings = $("menuItemSettings");
if (menuItemSettings) {
  menuItemSettings.addEventListener("click", () => {
    closeProfileDropdown();
    openSettings("notifications");
  });
}

const menuItemAddTeam = $("menuItemAddTeam");
if (menuItemAddTeam) {
  menuItemAddTeam.addEventListener("click", () => {
    closeProfileDropdown();
    openSettings("general");
  });
}

const menuItemReporting = $("menuItemReporting");
if (menuItemReporting) {
  menuItemReporting.addEventListener("click", () => {
    closeProfileDropdown();
    currentView = "reporting";
    recordRecentView("Reporting");
    render();
  });
}

const menuItemPrint = $("menuItemPrint");
if (menuItemPrint) {
  menuItemPrint.addEventListener("click", () => {
    closeProfileDropdown();
    window.print();
  });
}

const menuItemWhatsNew = $("menuItemWhatsNew");
if (menuItemWhatsNew) {
  menuItemWhatsNew.addEventListener("click", () => {
    closeProfileDropdown();
    alert("What's new in Todorisu:\n• Redesigned Profile Card & Modal Settings\n• Command Palette Search (Cmd+K)\n• Quick task drawer and filters view");
  });
}



const menuItemSync = $("menuItemSync");
if (menuItemSync) {
  menuItemSync.addEventListener("click", async () => {
    const syncText = $("syncStatusText");
    if (syncText) syncText.textContent = "Syncing...";
    await loadTasks();
    render();
    setTimeout(() => {
      if (syncText) syncText.textContent = "Just now";
    }, 400);
  });
}

const menuItemLogout = $("menuItemLogout");
if (menuItemLogout) {
  menuItemLogout.addEventListener("click", () => {
    closeProfileDropdown();
    handleSignOut();
  });
}

const menuChangelogBtn = $("menuChangelogBtn");
if (menuChangelogBtn) {
  menuChangelogBtn.addEventListener("click", () => {
    closeProfileDropdown();
    alert("Todorisu v11486 Changelog:\n• Modern Todoist design system\n• Settings popup dialog with tabs");
  });
}

// Settings Modal Controller
function openSettings(tab = "notifications") {
  closeProfileDropdown();
  const modal = $("settingsModal");
  if (modal) modal.classList.remove("hidden");
  switchSettingsTab(tab);
}

function closeSettings() {
  const modal = $("settingsModal");
  if (modal) modal.classList.add("hidden");
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  document.querySelectorAll(".settings-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  const activeBtn = document.querySelector(`.settings-tab-btn[data-tab="${tab}"] span`);
  const title = activeBtn ? activeBtn.textContent : (tab.charAt(0).toUpperCase() + tab.slice(1));
  const titleEl = $("settingsHeaderTitle");
  if (titleEl) titleEl.textContent = title;

  renderSettingsTabContent(tab);
}

// Wire settings sidebar tab clicks
document.querySelectorAll(".settings-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    switchSettingsTab(btn.dataset.tab);
  });
});

const closeSettingsModalBtn = $("closeSettingsModal");
if (closeSettingsModalBtn) {
  closeSettingsModalBtn.addEventListener("click", closeSettings);
}

const settingsModalOverlay = $("settingsModal");
if (settingsModalOverlay) {
  settingsModalOverlay.addEventListener("click", (e) => {
    if (e.target === settingsModalOverlay) closeSettings();
  });
}

const settingsSearchInput = $("settingsSearchInput");
if (settingsSearchInput) {
  settingsSearchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll(".settings-tab-btn").forEach(btn => {
      const text = btn.textContent.toLowerCase();
      btn.style.display = text.includes(q) ? "flex" : "none";
    });
  });
}

const settingsAddTeamBtn = $("settingsAddTeamBtn");
if (settingsAddTeamBtn) {
  settingsAddTeamBtn.addEventListener("click", () => {
    switchSettingsTab("general");
  });
}

// Content renderer for Settings modal tabs
function renderSettingsTabContent(tab) {
  const container = $("settingsContentBody");
  if (!container) return;
  container.innerHTML = "";

  if (tab === "notifications") {
    // Matching Todoist Screenshot 1
    const notifGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
    const bannerHtml = `
      <div class="notif-warning-banner">
        <div class="notif-warning-left">
          <div class="notif-warning-icon">!</div>
          <div class="notif-warning-text">
            Desktop and web notifications are currently ${notifGranted ? "enabled" : "disabled"}. Enable to receive notifications about shared projects and updates.
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" id="desktopNotifToggle" ${notifGranted ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>
    `;

    const projectActions = [
      { id: "assigned", title: "Task assigned to me" },
      { id: "completed", title: "Task completed" },
      { id: "comment", title: "Comment added to task I'm collaborating on" },
      { id: "joined", title: "Collaborator joined project" },
      { id: "left", title: "Collaborator left project" },
      { id: "declined", title: "Collaborator declined invitation" },
      { id: "removed", title: "Collaborator removed from project" }
    ];

    const projectRowsHtml = projectActions.map(action => `
      <div class="notif-table-row">
        <div class="notif-row-info">
          <span class="notif-row-title">${action.title}</span>
        </div>
        <div class="notif-row-checks">
          <div class="todoist-red-box unchecked" data-action="${action.id}" data-type="email" title="Toggle email notification"></div>
          <div class="todoist-red-box" data-action="${action.id}" data-type="mobile" title="Toggle mobile notification">✓</div>
        </div>
      </div>
    `).join("");

    const emailItems = [
      { id: "digest", title: "Daily digest", desc: "A summary of tasks due today and upcoming deadlines." },
      { id: "whatsnew", title: "What's new", desc: "Product updates, feature announcements, and improvements." },
      { id: "tips", title: "Tips and tricks", desc: "Productivity advice, workflow guides, and expert tutorials." }
    ];

    const emailRowsHtml = emailItems.map(item => `
      <div class="notif-email-row">
        <div class="notif-email-info">
          <div class="notif-email-title">${item.title}</div>
          <div class="notif-email-desc">${item.desc}</div>
        </div>
        <label class="switch">
          <input type="checkbox" checked id="emailSwitch_${item.id}">
          <span class="slider"></span>
        </label>
      </div>
    `).join("");

    container.innerHTML = `
      ${bannerHtml}

      <div class="settings-group-heading">Project notifications</div>
      <div class="settings-subtext">Choose which actions within shared projects you'd like to be notified about.</div>

      <div class="notif-table-header">
        <div class="notif-header-item">Email</div>
        <div class="notif-header-item">Mobile</div>
      </div>

      <div class="notif-table-body">
        ${projectRowsHtml}
      </div>

      <div class="settings-group-heading" style="margin-top: 36px;">Account & update emails</div>
      <div class="settings-subtext">Choose the emails you would like to receive from Todoist.</div>

      <div class="notif-emails-body">
        ${emailRowsHtml}
      </div>
    `;

    // Interactive red checkboxes
    container.querySelectorAll(".todoist-red-box").forEach(box => {
      box.addEventListener("click", () => {
        const isUnchecked = box.classList.toggle("unchecked");
        box.textContent = isUnchecked ? "" : "✓";
      });
    });

    // Desktop notification switch
    const notifToggle = $("desktopNotifToggle");
    if (notifToggle) {
      notifToggle.addEventListener("change", async (e) => {
        if (e.target.checked && typeof Notification !== "undefined" && Notification.permission !== "granted") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") {
            e.target.checked = false;
          }
        }
      });
    }
  } else if (tab === "theme") {
    const prefs = ThemeManager.getPrefs();
    container.innerHTML = `
      <div class="settings-group-heading" style="margin-top: 0;">Theme</div>
      <div class="settings-subtext">Personalize your Todorisu experience with light, dark, and custom accent colors.</div>

      <div style="margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px;">Appearance</div>
        <div class="segmented" id="modalModeSegmented">
          <button data-mode="system" class="${prefs.mode === "system" ? "active" : ""}">System</button>
          <button data-mode="light" class="${prefs.mode === "light" ? "active" : ""}">Light</button>
          <button data-mode="dark" class="${prefs.mode === "dark" ? "active" : ""}">Dark</button>
        </div>
      </div>

      <div>
        <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px;">Color Theme</div>
        <div class="swatches" id="modalSchemeSwatches" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
      </div>
    `;

    container.querySelectorAll("#modalModeSegmented button").forEach(btn => {
      btn.addEventListener("click", () => {
        ThemeManager.setMode(btn.dataset.mode);
        renderSettingsTabContent("theme");
      });
    });

    const swatchesContainer = $("modalSchemeSwatches");
    if (swatchesContainer) {
      Object.entries(SCHEMES).forEach(([key, scheme]) => {
        const btn = document.createElement("button");
        btn.className = "swatch" + (prefs.scheme === key ? " active" : "");
        btn.style.background = scheme.swatch;
        btn.title = scheme.label;
        btn.textContent = prefs.scheme === key ? "✓" : "";
        btn.addEventListener("click", () => {
          ThemeManager.setScheme(key);
          renderSettingsTabContent("theme");
        });
        swatchesContainer.appendChild(btn);
      });
    }
  } else if (tab === "calendars") {
    const timetableEnabled = CalendarManager.isTimetableEnabled();
    const host = window.location.host || "todorisu.app";
    container.innerHTML = `
      <div class="settings-group-heading" style="margin-top: 0;">Calendar & Timetable</div>
      <div class="settings-subtext">View tasks on a visual timetable and synchronize with external calendar apps.</div>

      <div class="setting-switch-row" style="border-bottom: 1px solid #282828; padding-bottom: 16px;">
        <div>
          <div class="setting-switch-label">Timetable View</div>
          <div class="settings-subtext" style="margin: 4px 0 0;">Display scheduled tasks in visual timetable time blocks.</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="modalTimetableToggle" ${timetableEnabled ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>

      <div style="margin-top: 24px;">
        <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 6px;">iCalendar Feed URL</div>
        <div class="settings-subtext" style="margin-bottom: 12px;">Subscribe to this feed in Apple Calendar, Google Calendar, or Outlook.</div>
        <div style="display: flex; gap: 8px; max-width: 500px;">
          <input type="text" id="icalFeedInput" readonly value="webcal://${host}/feed.ics" style="flex: 1; background: #262626; border: 1px solid #383838; border-radius: 6px; padding: 8px 12px; color: #ccc; font-size: 12px;" />
          <button class="btn btn-secondary" id="copyIcalFeedBtn">Copy</button>
        </div>
      </div>
    `;

    const toggle = $("modalTimetableToggle");
    if (toggle) {
      toggle.addEventListener("change", (e) => {
        CalendarManager.setTimetableEnabled(e.target.checked);
      });
    }

    const copyBtn = $("copyIcalFeedBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const input = $("icalFeedInput");
        if (input) {
          navigator.clipboard?.writeText(input.value);
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
        }
      });
    }
  } else if (tab === "account") {
    const email = currentUser?.email || "timothy@example.com";
    const name = email.split("@")[0] || "Timothy";
    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
    container.innerHTML = `
      <div class="settings-group-heading" style="margin-top: 0;">Account</div>
      <div class="settings-subtext">Manage your personal details, email, and authentication.</div>

      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #282828;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #dc4c3e; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">
          ${capitalName.charAt(0)}
        </div>
        <div>
          <div style="font-size: 16px; font-weight: 600; color: #fff;">${capitalName} Ng</div>
          <div style="font-size: 13px; color: #888;">${email}</div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #ccc; display: block; margin-bottom: 6px;">Name</label>
          <input type="text" value="${capitalName} Ng" style="width: 100%; background: #262626; border: 1px solid #383838; border-radius: 6px; padding: 8px 12px; color: #fff; font-size: 13px;" />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #ccc; display: block; margin-bottom: 6px;">Email</label>
          <input type="text" readonly value="${email}" style="width: 100%; background: #262626; border: 1px solid #383838; border-radius: 6px; padding: 8px 12px; color: #888; font-size: 13px;" />
        </div>
      </div>

      <div style="margin-top: 36px; border-top: 1px solid #282828; padding-top: 20px;">
        <button id="accountSignOutBtn" class="btn" style="background: rgba(220, 76, 62, 0.15); color: #dc4c3e; border: 1px solid rgba(220, 76, 62, 0.3); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
          Log out
        </button>
      </div>
    `;

    const signout = $("accountSignOutBtn");
    if (signout) signout.addEventListener("click", handleSignOut);
  } else if (tab === "general") {
    container.innerHTML = `
      <div class="settings-group-heading" style="margin-top: 0;">General</div>
      <div class="settings-subtext">Manage language, time formats, and week start preferences.</div>

      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 400px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #ccc; display: block; margin-bottom: 6px;">Language</label>
          <select style="width: 100%; background: #262626; border: 1px solid #383838; border-radius: 6px; padding: 8px 12px; color: #fff;">
            <option selected>English</option>
            <option>Japanese (日本語)</option>
            <option>German (Deutsch)</option>
            <option>Spanish (Español)</option>
          </select>
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #ccc; display: block; margin-bottom: 6px;">Date format</label>
          <select style="width: 100%; background: #262626; border: 1px solid #383838; border-radius: 6px; padding: 8px 12px; color: #fff;">
            <option selected>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #ccc; display: block; margin-bottom: 6px;">Time format</label>
          <select style="width: 100%; background: #262626; border: 1px solid #383838; border-radius: 6px; padding: 8px 12px; color: #fff;">
            <option selected>24 Hour (13:00)</option>
            <option>12 Hour (1:00 PM)</option>
          </select>
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #ccc; display: block; margin-bottom: 6px;">Week start</label>
          <select style="width: 100%; background: #262626; border: 1px solid #383838; border-radius: 6px; padding: 8px 12px; color: #fff;">
            <option selected>Monday</option>
            <option>Sunday</option>
            <option>Saturday</option>
          </select>
        </div>
      </div>
    `;

  } else if (tab === "productivity") {
    const todayTasks = tasks.filter(t => {
      if (!t.due_at) return false;
      const d = new Date(t.due_at);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    });
    const completedCount = todayTasks.filter(t => t.completed).length;

    container.innerHTML = `
      <div class="settings-group-heading" style="margin-top: 0;">Productivity</div>
      <div class="settings-subtext">Customize your goals and track your accomplishment streaks.</div>

      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 440px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #ccc; display: block; margin-bottom: 6px;">Daily task goal</label>
          <div style="display: flex; align-items: center; gap: 12px;">
            <input type="number" min="1" max="50" value="5" style="width: 80px; background: #262626; border: 1px solid #383838; border-radius: 6px; padding: 8px 12px; color: #fff; font-size: 14px;" />
            <span style="color: #888; font-size: 13px;">tasks completed today: <strong>${completedCount}</strong></span>
          </div>
        </div>
        <div class="setting-switch-row" style="border-top: 1px solid #282828; padding-top: 16px;">
          <div>
            <div class="setting-switch-label">Karma streak tracking</div>
            <div class="settings-subtext" style="margin: 4px 0 0;">Count daily goal completions towards streaks.</div>
          </div>
          <label class="switch">
            <input type="checkbox" checked>
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-switch-row">
          <div>
            <div class="setting-switch-label">Take weekends off</div>
            <div class="settings-subtext" style="margin: 4px 0 0;">Don't reset streaks on Saturdays and Sundays.</div>
          </div>
          <label class="switch">
            <input type="checkbox" checked>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  } else {
    // Default fallback for reminders, backups, integrations, sidebar, quickadd
    const formattedTab = tab.charAt(0).toUpperCase() + tab.slice(1);
    container.innerHTML = `
      <div class="settings-group-heading" style="margin-top: 0;">${formattedTab}</div>
      <div class="settings-subtext">Configure options for ${formattedTab.toLowerCase()}.</div>
      <div style="background: #242424; border: 1px solid #333; border-radius: 8px; padding: 24px; color: #888; font-size: 13px;">
        Preferences for <strong>${formattedTab}</strong> are saved automatically.
      </div>
    `;
  }
}

