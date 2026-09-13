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
function updateThemeTabSubtitle() {
  const sub = $("tabSubTheme");
  if (!sub || typeof ThemeManager === "undefined") return;
  const mode = ThemeManager.getPrefs().mode || "system";
  sub.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
}

function openSettings(tab = "notifications") {
  closeProfileDropdown();
  const modal = $("settingsModal");
  if (modal) modal.classList.remove("hidden");
  updateThemeTabSubtitle();
  switchSettingsTab(tab);
}

// Mobile entry point (gear icon in the Browse drawer): show the settings
// LIST first, like the Android app, instead of jumping straight into a tab.
function openSettingsList() {
  closeProfileDropdown();
  const modal = $("settingsModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.querySelector(".settings-modal-card")?.classList.remove("detail-open");
  }
  $("settingsBackBtn")?.classList.add("hidden");
  updateThemeTabSubtitle();
}

function closeSettings() {
  const modal = $("settingsModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.querySelector(".settings-modal-card")?.classList.remove("detail-open");
  }
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  document.querySelectorAll(".settings-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  const activeBtn = document.querySelector(`.settings-tab-btn[data-tab="${tab}"] .settings-tab-text > span`);
  const title = activeBtn ? activeBtn.textContent : (tab.charAt(0).toUpperCase() + tab.slice(1));
  const titleEl = $("settingsHeaderTitle");
  if (titleEl) titleEl.textContent = title;

  // On mobile, picking a tab slides from the list into the full-screen
  // detail view; the back arrow returns to the list.
  if (window.innerWidth <= 780) {
    $("settingsModal")?.querySelector(".settings-modal-card")?.classList.add("detail-open");
    $("settingsBackBtn")?.classList.remove("hidden");
  }

  renderSettingsTabContent(tab);
}

// Wire settings sidebar tab clicks
document.querySelectorAll(".settings-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    switchSettingsTab(btn.dataset.tab);
  });
});

const settingsBackBtnEl = $("settingsBackBtn");
if (settingsBackBtnEl) {
  settingsBackBtnEl.addEventListener("click", () => {
    $("settingsModal")?.querySelector(".settings-modal-card")?.classList.remove("detail-open");
    settingsBackBtnEl.classList.add("hidden");
  });
}

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

const mobileSettingsBtnEl = $("mobileSettingsBtn");
if (mobileSettingsBtnEl) {
  mobileSettingsBtnEl.addEventListener("click", () => {
    $("sidebar")?.classList.remove("open");
    openSettingsList();
  });
}

const browseTemplatesBtnEl = $("browseTemplatesBtn");
if (browseTemplatesBtnEl) {
  browseTemplatesBtnEl.addEventListener("click", () => {
    alert("Templates aren't available in this personal build yet - add tasks manually or ask for a project template feature.");
  });
}

// Favorites / My Projects collapse chevrons
function wireCollapseChevron(headerId, chevronId) {
  const header = $(headerId);
  const chevron = $(chevronId);
  if (!header || !chevron) return;
  chevron.addEventListener("click", (e) => {
    e.stopPropagation();
    header.classList.toggle("collapsed");
    chevron.classList.toggle("collapsed");
  });
}
wireCollapseChevron("favoritesHeader", "favoritesChevron");
wireCollapseChevron("projectsHeader", "projectsChevron");

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
        updateThemeTabSubtitle();
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
    renderAccountTab(container);
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

// ============================================================
// ACCOUNT TAB (matches Todoist "Account" settings screen)
// ============================================================
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

const PROVIDER_ICONS = {
  google: `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.5-9.5 6.5-16.2z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9h-7.3v5.7C7.7 40.9 15.2 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.5C3 17.3 2.2 20.5 2.2 24s.8 6.7 2.3 9.6l7.3-5.3z"/><path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.2 2 7.7 7.1 4.5 14.4l7.3 5.7c1.7-5.2 6.5-9.5 12.2-9.5z"/></svg>`,
  facebook: `<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M15.1 12.9h-2v7.9h-3.3v-7.9H8.1v-2.8h1.7V8.4c0-1.7.8-3.4 3.4-3.4h2.5v2.7h-1.8c-.3 0-.7.2-.7.9v1.5h2.6l-.4 2.8z"/></svg>`,
  apple: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M16.2 1c.1 1.1-.3 2.2-1 3-.7.8-1.9 1.5-3 1.4-.1-1.1.4-2.2 1-2.9.8-.9 2-1.5 3-1.5zM19.7 17.2c-.5 1.1-.7 1.6-1.4 2.6-1 1.4-2.3 3.1-4 3.1-1.5 0-1.9-1-3.9-1s-2.5 1-4 1c-1.6 0-2.9-1.5-3.9-2.9C.5 17.4-.6 13 .9 10c.7-1.5 2.1-2.5 3.5-2.5 1.5 0 2.5 1 3.7 1 1.2 0 2-1 3.9-1 1.3 0 2.7.7 3.7 1.9-3.3 1.8-2.8 6.4.5 7.8z"/></svg>`
};

function getUserIdentities() {
  return (currentUser && currentUser.identities) || [];
}

function findIdentity(provider) {
  return getUserIdentities().find(i => i.provider === provider) || null;
}

function accountDisplayName() {
  const meta = (currentUser && currentUser.user_metadata) || {};
  if (meta.full_name) return meta.full_name;
  const email = currentUser?.email || "timothy@example.com";
  const name = email.split("@")[0] || "Timothy";
  const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
  return `${capitalName} Ng`;
}

// Keep the sidebar/dropdown avatar in sync with photo + name changes made in Account settings.
function applyAvatarDisplay(user) {
  const meta = (user && user.user_metadata) || {};
  const avatarUrl = meta.avatar_url || null;
  const displayName = meta.full_name || accountDisplayName();
  const initial = displayName.charAt(0).toUpperCase();

  const userAvatarEl = $("userAvatar");
  if (userAvatarEl) {
    if (avatarUrl) {
      userAvatarEl.style.backgroundImage = `url("${avatarUrl}")`;
      userAvatarEl.style.backgroundSize = "cover";
      userAvatarEl.style.backgroundPosition = "center";
      userAvatarEl.textContent = "";
    } else {
      userAvatarEl.style.backgroundImage = "";
      userAvatarEl.textContent = initial;
    }
  }
  const userNameEl = $("userName");
  if (userNameEl) userNameEl.textContent = displayName.split(" ")[0];
  const menuUserNameEl = $("menuUserName");
  if (menuUserNameEl) menuUserNameEl.textContent = displayName;
}

function renderAccountTab(container) {
  const email = currentUser?.email || "timothy@example.com";
  const meta = (currentUser && currentUser.user_metadata) || {};
  const fullName = accountDisplayName();
  const avatarUrl = meta.avatar_url || null;
  const initial = fullName.charAt(0).toUpperCase();

  const googleIdentity = findIdentity("google");
  const facebookIdentity = findIdentity("facebook");
  const appleIdentity = findIdentity("apple");

  const avatarStyle = avatarUrl
    ? `background-image:url('${avatarUrl}'); background-size:cover; background-position:center;`
    : `background:#dc4c3e;`;

  container.innerHTML = `
    <div class="settings-group-heading" style="margin-top: 0;">Photo</div>
    <div class="account-photo-row">
      <div class="account-avatar-lg" id="accountAvatarLg" style="${avatarStyle}">${avatarUrl ? "" : initial}</div>
      <div>
        <div class="account-photo-btns">
          <button class="btn btn-secondary" id="accountChangePhotoBtn">Change photo</button>
          <button class="btn btn-outline-danger" id="accountRemovePhotoBtn">Remove photo</button>
        </div>
        <div class="settings-subtext" style="margin: 8px 0 0;">Pick a photo up to 4MB.</div>
        <div class="settings-subtext" style="margin: 2px 0 0;">Your avatar photo will be public.</div>
      </div>
      <input type="file" id="accountPhotoInput" accept="image/*" class="hidden" />
    </div>

    <div class="settings-group-heading">Name</div>
    <input type="text" id="accountNameInput" class="account-text-input" maxlength="255" value="${escapeHtml(fullName)}" />
    <div class="account-char-count" id="accountNameCount">${fullName.length}/255</div>

    <div class="settings-group-heading">Email</div>
    <div class="settings-subtext" style="margin-bottom: 10px;">${escapeHtml(email)}</div>
    <button class="btn btn-secondary" id="accountChangeEmailBtn">Change email</button>

    <div class="settings-group-heading">Password</div>
    <button class="btn btn-secondary" id="accountChangePasswordBtn">Change password</button>

    <div class="settings-group-heading">Two-factor authentication</div>
    <label class="switch">
      <input type="checkbox" id="account2faToggle" disabled>
      <span class="slider"></span>
    </label>
    <div class="settings-subtext" id="account2faStatusText" style="margin-top: 8px;">Checking 2FA status...</div>
    <div id="account2faEnrollPanel"></div>

    <div class="account-divider"></div>

    <div class="settings-group-heading" style="margin-top: 0;">Connected accounts</div>
    <div class="settings-subtext">Log in to Todorisu with your Google, Facebook, or Apple account.</div>
    ${googleIdentity ? `<div class="settings-subtext">You can log in to Todorisu with your Google account <strong>${escapeHtml(googleIdentity.identity_data?.email || email)}</strong>.</div>` : ""}

    <div class="connected-accounts-list">
      <button class="provider-btn" id="accountGoogleBtn">${PROVIDER_ICONS.google}<span>${googleIdentity ? "Disconnect Google" : "Connect with Google"}</span></button>
      <button class="provider-btn" id="accountFacebookBtn">${PROVIDER_ICONS.facebook}<span>${facebookIdentity ? "Disconnect Facebook" : "Connect with Facebook"}</span></button>
      <button class="provider-btn" id="accountAppleBtn">${PROVIDER_ICONS.apple}<span>${appleIdentity ? "Disconnect Apple" : "Connect with Apple"}</span></button>
    </div>

    <div class="account-divider"></div>

    <div class="danger-zone">
      <div class="settings-group-heading" style="margin-top: 0;">Delete account</div>
      <div class="settings-subtext">Deleting your account is permanent. You will immediately lose access to all your data. <span class="link-coral" id="accountExportFirstLink">Here's how to export your data first</span></div>
      <button class="btn btn-outline-danger" id="accountDeleteBtn" style="margin-top: 12px;">Delete account</button>
    </div>

    <div style="margin-top: 36px; border-top: 1px solid #282828; padding-top: 20px;">
      <button id="accountSignOutBtn" class="btn" style="background: rgba(220, 76, 62, 0.15); color: #dc4c3e; border: 1px solid rgba(220, 76, 62, 0.3);">
        Log out
      </button>
    </div>
  `;

  wireAccountTabEvents(container);
  refreshAccount2FAStatus();
}

function wireAccountTabEvents(container) {
  $("accountSignOutBtn")?.addEventListener("click", handleSignOut);

  // Photo
  $("accountChangePhotoBtn")?.addEventListener("click", () => $("accountPhotoInput")?.click());
  $("accountPhotoInput")?.addEventListener("change", handleAccountAvatarChange);
  $("accountRemovePhotoBtn")?.addEventListener("click", handleAccountRemovePhoto);

  // Name
  const nameInput = $("accountNameInput");
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      $("accountNameCount").textContent = `${nameInput.value.length}/255`;
    });
    nameInput.addEventListener("blur", handleAccountNameSave);
  }

  // Email / password
  $("accountChangeEmailBtn")?.addEventListener("click", handleAccountChangeEmail);
  $("accountChangePasswordBtn")?.addEventListener("click", handleAccountChangePassword);

  // 2FA
  $("account2faToggle")?.addEventListener("change", handleAccount2FAToggle);

  // Connected accounts
  $("accountGoogleBtn")?.addEventListener("click", () => handleProviderButtonClick("google"));
  $("accountFacebookBtn")?.addEventListener("click", () => handleProviderButtonClick("facebook"));
  $("accountAppleBtn")?.addEventListener("click", () => handleProviderButtonClick("apple"));

  // Delete account
  $("accountExportFirstLink")?.addEventListener("click", handleAccountExportData);
  $("accountDeleteBtn")?.addEventListener("click", handleAccountDelete);
}

async function handleAccountAvatarChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    alert("Please pick a photo up to 4MB.");
    e.target.value = "";
    return;
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const { data, error } = await sb.auth.updateUser({ data: { avatar_url: dataUrl } });
  if (error) { alert(error.message); return; }
  currentUser = data.user;
  applyAvatarDisplay(currentUser);
  renderAccountTab($("settingsContentBody"));
}

async function handleAccountRemovePhoto() {
  const { data, error } = await sb.auth.updateUser({ data: { avatar_url: null } });
  if (error) { alert(error.message); return; }
  currentUser = data.user;
  applyAvatarDisplay(currentUser);
  renderAccountTab($("settingsContentBody"));
}

async function handleAccountNameSave() {
  const nameInput = $("accountNameInput");
  if (!nameInput) return;
  const fullName = nameInput.value.trim();
  if (!fullName || fullName === accountDisplayName()) return;
  const { data, error } = await sb.auth.updateUser({ data: { full_name: fullName } });
  if (error) { alert(error.message); return; }
  currentUser = data.user;
  applyAvatarDisplay(currentUser);
}

async function handleAccountChangeEmail() {
  const current = currentUser?.email || "";
  const next = window.prompt("Enter your new email address:", current);
  if (!next || next === current) return;
  const { error } = await sb.auth.updateUser({ email: next });
  if (error) { alert(error.message); return; }
  alert(`Confirmation links were sent to ${current} and ${next}. Your email will update once you confirm.`);
}

async function handleAccountChangePassword() {
  const next = window.prompt("Enter a new password (min. 6 characters):");
  if (!next) return;
  if (next.length < 6) { alert("Password must be at least 6 characters."); return; }
  const { error } = await sb.auth.updateUser({ password: next });
  if (error) { alert(error.message); return; }
  alert("Password updated.");
}

// ---------- Two-factor authentication (Supabase TOTP MFA) ----------
async function refreshAccount2FAStatus() {
  const toggle = $("account2faToggle");
  const statusText = $("account2faStatusText");
  if (!toggle || typeof sb.auth.mfa === "undefined") return;
  const { data, error } = await sb.auth.mfa.listFactors();
  if (error) {
    statusText.textContent = "2FA is disabled on your Todorisu account.";
    toggle.disabled = false;
    return;
  }
  const verifiedTotp = (data?.totp || []).find(f => f.status === "verified");
  toggle.checked = !!verifiedTotp;
  toggle.disabled = false;
  toggle.dataset.factorId = verifiedTotp ? verifiedTotp.id : "";
  statusText.textContent = verifiedTotp
    ? "2FA is enabled on your Todorisu account."
    : "2FA is disabled on your Todorisu account.";
}

async function handleAccount2FAToggle(e) {
  const toggle = e.target;
  const panel = $("account2faEnrollPanel");
  if (toggle.checked) {
    // Start enrollment
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      alert(error.message);
      toggle.checked = false;
      return;
    }
    const factorId = data.id;
    panel.innerHTML = `
      <div class="mfa-enroll-panel">
        <div class="settings-subtext" style="margin: 0 0 10px;">Scan this QR code with an authenticator app, then enter the 6-digit code to finish enabling 2FA.</div>
        <img src="${data.totp.qr_code}" width="160" height="160" style="border-radius: 8px; background: #fff; padding: 8px;" />
        <div class="settings-subtext" style="margin: 8px 0;">Or enter this code manually: <strong>${data.totp.secret}</strong></div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="mfaVerifyCode" placeholder="123456" maxlength="6" class="account-text-input" style="max-width: 140px;" />
          <button class="btn btn-secondary" id="mfaVerifyBtn">Verify</button>
          <button class="btn btn-outline-danger" id="mfaCancelBtn">Cancel</button>
        </div>
      </div>
    `;
    $("mfaVerifyBtn").addEventListener("click", async () => {
      const code = $("mfaVerifyCode").value.trim();
      const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyError) { alert(verifyError.message); return; }
      panel.innerHTML = "";
      refreshAccount2FAStatus();
    });
    $("mfaCancelBtn").addEventListener("click", async () => {
      await sb.auth.mfa.unenroll({ factorId });
      panel.innerHTML = "";
      toggle.checked = false;
    });
  } else {
    // Disable
    const factorId = toggle.dataset.factorId;
    if (!factorId) return;
    if (!confirm("Turn off two-factor authentication?")) { toggle.checked = true; return; }
    const { error } = await sb.auth.mfa.unenroll({ factorId });
    if (error) { alert(error.message); toggle.checked = true; return; }
    panel.innerHTML = "";
    refreshAccount2FAStatus();
  }
}

// ---------- Connected accounts (Google / Facebook / Apple) ----------
async function handleProviderButtonClick(provider) {
  const identity = findIdentity(provider);
  if (identity) {
    if (!confirm(`Disconnect your ${provider.charAt(0).toUpperCase() + provider.slice(1)} account?`)) return;
    const { error } = await sb.auth.unlinkIdentity(identity);
    if (error) { alert(error.message); return; }
    const { data } = await sb.auth.getUser();
    if (data?.user) currentUser = data.user;
    renderAccountTab($("settingsContentBody"));
  } else {
    const { error } = await sb.auth.linkIdentity({
      provider,
      options: { redirectTo: window.location.href }
    });
    if (error) alert(`Couldn't start ${provider} connection: ${error.message}`);
    // On success this redirects to the provider; Supabase links the identity
    // to the current account and returns here automatically.
  }
}

// ---------- Delete account ----------
async function handleAccountExportData() {
  if (!currentUser) return;
  const { data, error } = await sb.from("tasks").select("*").eq("user_id", currentUser.id);
  if (error) { alert(error.message); return; }
  const payload = {
    exported_at: new Date().toISOString(),
    account: { email: currentUser.email, name: accountDisplayName() },
    tasks: data || []
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `todorisu-export-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleAccountDelete() {
  if (!currentUser) return;
  const typed = window.prompt('This permanently deletes all your tasks and signs you out. Type "DELETE" to confirm.');
  if (typed !== "DELETE") return;
  await sb.from("tasks").delete().eq("user_id", currentUser.id);
  alert("Your data has been deleted. For full account removal, contact support - closing your session now.");
  await handleSignOut();
}

