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

function openIdleGamePopout() {
  const width = 1020;
  const height = 760;
  const screenW = window.screen.availWidth || window.screen.width || 1200;
  const screenH = window.screen.availHeight || window.screen.height || 800;
  const left = Math.max(0, Math.round((screenW - width) / 2));
  const top = Math.max(0, Math.round((screenH - height) / 2));
  const url = "idle-game.html";
  const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;

  try {
    const popout = window.open(url, "TodorisuIdleTycoon", features);
    if (!popout || popout.closed || typeof popout.closed === "undefined") {
      window.open(url, "_blank");
    } else {
      popout.focus();
    }
  } catch (err) {
    window.open(url, "_blank");
  }
}

const browseTemplatesBtnEl = $("browseTemplatesBtn");
if (browseTemplatesBtnEl) {
  browseTemplatesBtnEl.addEventListener("click", () => {
    openIdleGamePopout();
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
    const outlook = CalendarManager.getOutlookConfig();
    const lastSyncFormatted = outlook.lastSynced
      ? new Date(outlook.lastSynced).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "Never";

    container.innerHTML = `
      <div class="settings-group-heading" style="margin-top: 0;">Calendar & Timetable</div>
      <div class="settings-subtext">Synchronize external calendars like Microsoft Outlook to view events alongside your tasks.</div>

      <!-- Outlook Calendar Section -->
      <div class="outlook-calendar-card" style="margin-top: 16px;">
        <div class="outlook-card-header">
          <div class="outlook-brand">
            <svg class="outlook-logo-svg" width="28" height="28" viewBox="0 0 48 48">
              <path fill="#0078d4" d="M6 9a3 3 0 0 1 3-3h18v36H9a3 3 0 0 1-3-3V9z"/>
              <path fill="#28a8ea" d="M27 6h12a3 3 0 0 1 3 3v30a3 3 0 0 1-3 3H27V6z"/>
              <circle cx="16.5" cy="24" r="7.5" fill="#fff"/>
              <path fill="#0078d4" d="M16.5 19a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/>
            </svg>
            <div>
              <div class="outlook-brand-title">Microsoft Outlook Calendar</div>
              <div class="outlook-brand-sub">${outlook.connected ? "Active synchronization" : "Connect your Outlook or Microsoft 365 calendar"}</div>
            </div>
          </div>
          <span class="outlook-status-badge ${outlook.connected ? outlook.syncStatus : 'disconnected'}">
            ${outlook.connected ? (outlook.syncStatus === "syncing" ? "Syncing..." : outlook.syncStatus === "error" ? "Error" : "Connected") : "Disconnected"}
          </span>
        </div>

        ${outlook.connected ? `
          <div class="outlook-connected-details" style="display:block;">
            <div class="outlook-info-row">
              <span class="outlook-info-label">Status:</span>
              <span class="outlook-info-val" style="color: #4caf50;">● Connected</span>
            </div>
            <div class="outlook-info-row">
              <span class="outlook-info-label">Last synced:</span>
              <span class="outlook-info-val">${lastSyncFormatted}</span>
            </div>
            <div class="outlook-info-row">
              <span class="outlook-info-label">Events found:</span>
              <span class="outlook-info-val">${outlook.eventCount || 0} events</span>
            </div>
            <div class="outlook-connected-actions">
              <button id="settingsOutlookSyncBtn" class="btn-primary-sm">Sync Now</button>
              <button id="settingsOutlookDisconnectBtn" class="btn-danger-ghost-sm">Disconnect</button>
            </div>
          </div>
        ` : `
          <div class="outlook-connect-form" style="margin-top: 10px;">
            <div class="input-with-button">
              <input type="url" id="settingsOutlookUrlInput" placeholder="Paste Outlook ICS link (https://outlook... or webcal://...)" style="font-size: 12px;" />
              <button id="settingsOutlookConnectBtn" class="btn-primary">Connect</button>
            </div>
            <details class="outlook-help-dropdown">
              <summary>How to get your Outlook calendar link</summary>
              <ol>
                <li>Open Outlook on the web (outlook.office.com or outlook.live.com).</li>
                <li>Go to <strong>Settings (⚙️) → Calendar → Shared calendars</strong>.</li>
                <li>Under <strong>Publish a calendar</strong>, choose your calendar and set permission to <em>Can view all details</em>.</li>
                <li>Click <strong>Publish</strong>, copy the <strong>ICS</strong> link, and paste it here.</li>
              </ol>
            </details>
          </div>
        `}
      </div>

      <div class="setting-switch-row" style="border-top: 1px solid #282828; padding-top: 16px; margin-top: 20px;">
        <div>
          <div class="setting-switch-label">Calendar Events in Views</div>
          <div class="settings-subtext" style="margin: 4px 0 0;">Display scheduled events and meetings in Upcoming and Today views.</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="settingsTimetableToggle" ${timetableEnabled ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #282828;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-size: 13px; font-weight: 600; color: #fff;">Additional Calendar Feeds</div>
          <button id="settingsOpenCalModalBtn" class="btn-secondary" style="padding: 4px 10px; font-size: 12px;">Manage Feeds</button>
        </div>
        <div class="settings-subtext">Add custom Google Calendar or Apple Calendar ICS feeds.</div>
      </div>
    `;

    // Wire Outlook buttons in Settings
    const sConnectBtn = $("settingsOutlookConnectBtn");
    const sUrlInput = $("settingsOutlookUrlInput");
    if (sConnectBtn && sUrlInput) {
      sConnectBtn.addEventListener("click", async () => {
        const val = sUrlInput.value.trim();
        if (!val) { alert("Please paste an Outlook ICS URL."); return; }
        sConnectBtn.disabled = true;
        sConnectBtn.textContent = "Connecting...";
        try {
          const events = await CalendarManager.connectOutlook(val);
          alert(`Outlook Calendar connected! Synced ${events.length} events.`);
          renderSettingsTabContent("calendars");
        } catch (err) {
          alert("Connection error: " + (err.message || "Failed to sync Outlook."));
          sConnectBtn.disabled = false;
          sConnectBtn.textContent = "Connect";
        }
      });
    }

    const sSyncBtn = $("settingsOutlookSyncBtn");
    if (sSyncBtn) {
      sSyncBtn.addEventListener("click", async () => {
        sSyncBtn.disabled = true;
        sSyncBtn.textContent = "Syncing...";
        try {
          const events = await CalendarManager.syncOutlook();
          alert(`Outlook synced! ${events.length} events updated.`);
          renderSettingsTabContent("calendars");
        } catch (err) {
          alert("Sync error: " + err.message);
          sSyncBtn.disabled = false;
          sSyncBtn.textContent = "Sync Now";
        }
      });
    }

    const sDisconnectBtn = $("settingsOutlookDisconnectBtn");
    if (sDisconnectBtn) {
      sDisconnectBtn.addEventListener("click", () => {
        if (confirm("Disconnect Outlook Calendar?")) {
          CalendarManager.disconnectOutlook();
          renderSettingsTabContent("calendars");
        }
      });
    }

    const sTimetableToggle = $("settingsTimetableToggle");
    if (sTimetableToggle) {
      sTimetableToggle.addEventListener("change", (e) => {
        CalendarManager.setTimetableEnabled(e.target.checked);
      });
    }

    const sOpenCalModalBtn = $("settingsOpenCalModalBtn");
    if (sOpenCalModalBtn) {
      sOpenCalModalBtn.addEventListener("click", () => {
        closeSettings();
        if (typeof openCalendarModal === "function") openCalendarModal();
      });
    }
  } else if (tab === "integrations") {
    const outlook = CalendarManager.getOutlookConfig();
    const isGoogleUser = (currentUser?.app_metadata?.provider === "google") || (currentUser?.identities || []).some(i => i.provider === "google");
    const userEmail = currentUser?.email || "";

    container.innerHTML = `
      <div class="settings-group-heading" style="margin-top: 0;">Integrations & Add-ins</div>
      <div class="settings-subtext">Turn emails into tasks and synchronize your schedule across Microsoft Outlook, Gmail, and calendars.</div>

      <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px;">
        <!-- 1. Microsoft Outlook Add-in (Todoist-style) -->
        <div style="background: #242424; border: 1px solid rgba(0,120,212,0.4); border-radius: 8px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <svg width="34" height="34" viewBox="0 0 48 48">
                <path fill="#0078d4" d="M6 9a3 3 0 0 1 3-3h18v36H9a3 3 0 0 1-3-3V9z"/>
                <path fill="#28a8ea" d="M27 6h12a3 3 0 0 1 3 3v30a3 3 0 0 1-3 3H27V6z"/>
                <circle cx="16.5" cy="24" r="7.5" fill="#fff"/>
                <path fill="#0078d4" d="M16.5 19a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/>
              </svg>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; font-size: 15px; color: #fff;">Microsoft Outlook Add-in</span>
                  <span style="background: rgba(0,120,212,0.2); color: #28a8ea; border: 1px solid rgba(0,120,212,0.3); font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Todoist Style</span>
                </div>
                <div style="font-size: 12px; color: #aaa; margin-top: 3px;">Turn emails into tasks with one click and manage your agenda directly from the Outlook ribbon.</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="previewAddinBtn" class="btn-secondary" style="font-size: 12px; padding: 6px 12px;">Preview Add-in</button>
              <button id="downloadManifestBtn" class="btn-primary" style="background: #0078d4; font-size: 12px; padding: 6px 14px;">Download manifest.xml</button>
            </div>
          </div>

          <details class="outlook-help-dropdown" style="margin-top: 14px; border-top: 1px solid #333; padding-top: 10px;">
            <summary>How to install the Todorisu add-in in Microsoft Outlook</summary>
            <ol>
              <li>Click <strong>Download manifest.xml</strong> above to save the add-in configuration file.</li>
              <li>In <strong>Outlook on the web</strong> or <strong>Outlook Desktop (Windows/Mac)</strong>, click <strong>Get Add-ins</strong> on the ribbon (or <strong>Apps</strong> → <strong>Add apps</strong>).</li>
              <li>Click <strong>My add-ins</strong> on the left, scroll down to <strong>Custom add-ins</strong>, and choose <strong>Add from file...</strong></li>
              <li>Select your downloaded <code>manifest.xml</code> and click <strong>Install</strong>.</li>
              <li>Open any email — the <strong>Add to Todorisu</strong> button will appear right on your ribbon!</li>
            </ol>
          </details>
        </div>

        <!-- 2. Real Google / Gmail Integration -->
        <div style="background: #242424; border: 1px solid ${isGoogleUser ? 'rgba(76,175,80,0.4)' : '#333'}; border-radius: 8px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <svg width="32" height="32" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.5-9.5 6.5-16.2z"/>
                <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9h-7.3v5.7C7.7 40.9 15.2 46 24 46z"/>
                <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.5C3 17.3 2.2 20.5 2.2 24s.8 6.7 2.3 9.6l7.3-5.3z"/>
                <path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.2 2 7.7 7.1 4.5 14.4l7.3 5.7c1.7-5.2 6.5-9.5 12.2-9.5z"/>
              </svg>
              <div>
                <div style="font-weight: 600; font-size: 14px; color: #fff;">Google &amp; Gmail Account</div>
                <div style="font-size: 12px; color: #888; margin-top: 2px;">
                  ${isGoogleUser ? `Connected as <strong>${escapeHtml(userEmail)}</strong>` : "Log in or connect your Gmail / Google account for 1-click sync."}
                </div>
              </div>
            </div>
            <button id="integrationsGoogleActionBtn" class="${isGoogleUser ? 'btn-secondary' : 'btn-primary'}" style="font-size: 12px; padding: 6px 14px;">
              ${isGoogleUser ? "Connected ✓" : "Sign in with Google"}
            </button>
          </div>
        </div>

        <!-- 3. Microsoft Outlook Calendar Feed -->
        <div style="background: #242424; border: 1px solid #333; border-radius: 8px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <div>
                <div style="font-weight: 600; font-size: 14px; color: #fff;">Outlook Calendar ICS Sync</div>
                <div style="font-size: 12px; color: #888; margin-top: 2px;">Sync meetings and classes into Upcoming &amp; Today views.</div>
              </div>
            </div>
            <button id="integrationsOutlookCalActionBtn" class="btn-secondary" style="font-size: 12px; padding: 6px 14px;">
              ${outlook.connected ? "Configure Sync" : "Connect Calendar"}
            </button>
          </div>
        </div>

        <!-- 4. Google Calendar & Apple Calendar Feeds -->
        <div style="background: #242424; border: 1px solid #333; border-radius: 8px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <div>
                <div style="font-weight: 600; font-size: 14px; color: #fff;">External iCal / Webcal Feeds</div>
                <div style="font-size: 12px; color: #888; margin-top: 2px;">Subscribe to Google Calendar or Apple Calendar ICS feeds.</div>
              </div>
            </div>
            <button id="integrationsOtherCalBtn" class="btn-secondary" style="font-size: 12px; padding: 6px 14px;">Add Feed</button>
          </div>
        </div>
      </div>
    `;

    $("downloadManifestBtn")?.addEventListener("click", () => {
      downloadOutlookManifest();
    });

    $("previewAddinBtn")?.addEventListener("click", () => {
      window.open("outlook-addin.html", "_blank", "width=380,height=620");
    });

    $("integrationsGoogleActionBtn")?.addEventListener("click", async () => {
      if (isGoogleUser) {
        alert(`You are signed in with Google (${userEmail}).`);
      } else {
        const redirectUrl = window.location.origin + window.location.pathname;
        await sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUrl, queryParams: { access_type: "offline", prompt: "consent" } }
        });
      }
    });

    $("integrationsOutlookCalActionBtn")?.addEventListener("click", () => {
      switchSettingsTab("calendars");
    });

    $("integrationsOtherCalBtn")?.addEventListener("click", () => {
      closeSettings();
      if (typeof openCalendarModal === "function") openCalendarModal();
    });

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

// Function to dynamically generate and download Outlook Add-in manifest XML
function downloadOutlookManifest() {
  const origin = window.location.origin || "https://todorisu.app";
  const taskpaneUrl = `${origin}/outlook-addin.html`;
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp
  xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
  xmlns:mailappor="http://schemas.microsoft.com/office/mailappversionoverrides/1.0"
  xsi:type="MailApp">
  <Id>b29f0e15-7762-42da-9118-8d59132194d2</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>Todorisu</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="Todorisu for Outlook"/>
  <Description DefaultValue="Todoist-style task manager for Microsoft Outlook. Turn emails into tasks, schedule follow-ups, and manage your agenda right inside your inbox."/>
  <IconUrl DefaultValue="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2705.png"/>
  <HighResolutionIconUrl DefaultValue="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2705.png"/>
  <SupportUrl DefaultValue="${origin}"/>
  <AppDomains>
    <AppDomain>https://krhdqranidmepepyuxti.supabase.co</AppDomain>
    <AppDomain>https://cdn.jsdelivr.net</AppDomain>
    <AppDomain>${origin}</AppDomain>
  </AppDomains>
  <Hosts>
    <Host Name="Mailbox"/>
  </Hosts>
  <Requirements>
    <Sets>
      <Set Name="Mailbox" MinVersion="1.1"/>
    </Sets>
  </Requirements>
  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <SourceLocation DefaultValue="${taskpaneUrl}"/>
        <RequestedHeight>450</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>
  <Permissions>ReadWriteItem</Permissions>
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Read"/>
    <Rule xsi:type="ItemIs" ItemType="Appointment" FormType="Read"/>
  </Rule>
  <DisableEntityHighlighting>false</DisableEntityHighlighting>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="MailHost">
        <DesktopFormFactor>
          <ExtensionPoint xsi:type="MessageReadCommandSurface">
            <OfficeTab id="TabDefault">
              <Group id="todorisuGroup">
                <Label resid="groupLabel"/>
                <Control xsi:type="Button" id="todorisuAddBtn">
                  <Label resid="btnLabel"/>
                  <Supertip>
                    <Title resid="btnTitle"/>
                    <Description resid="btnDesc"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="icon16"/>
                    <bt:Image size="32" resid="icon32"/>
                    <bt:Image size="80" resid="icon80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <SourceLocation resid="taskpaneUrl"/>
                    <SupportsPinning>true</SupportsPinning>
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="icon16" DefaultValue="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2705.png"/>
        <bt:Image id="icon32" DefaultValue="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2705.png"/>
        <bt:Image id="icon80" DefaultValue="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2705.png"/>
      </bt:Images>
      <bt:Urls>
        <bt:Url id="taskpaneUrl" DefaultValue="${taskpaneUrl}"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="groupLabel" DefaultValue="Todorisu"/>
        <bt:String id="btnLabel" DefaultValue="Add to Todorisu"/>
        <bt:String id="btnTitle" DefaultValue="Todorisu Task Manager"/>
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="btnDesc" DefaultValue="Add this email as a task in Todorisu and manage your agenda without leaving Outlook."/>
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>`;

  const blob = new Blob([manifestXml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "manifest.xml";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getUserIdentities() {
  return (currentUser && currentUser.identities) || [];
}

function findIdentity(provider) {
  return getUserIdentities().find(i => i.provider === provider) || null;
}

function accountDisplayName() {
  const meta = (currentUser && currentUser.user_metadata) || {};
  if (meta.full_name) return meta.full_name;
  if (meta.name) return meta.name;
  const email = currentUser?.email || "timothy@example.com";
  const name = email.split("@")[0] || "Timothy";
  const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
  return `${capitalName}`;
}

// Keep the sidebar/dropdown avatar in sync with photo + name changes made in Account settings or Google OAuth.
function applyAvatarDisplay(user) {
  const meta = (user && user.user_metadata) || {};
  const avatarUrl = meta.avatar_url || meta.picture || null;
  const displayName = meta.full_name || meta.name || accountDisplayName();
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

