// ============================================================
// CALENDAR INTEGRATION MODULE (Microsoft Outlook & iCal Feeds)
// ============================================================
const CalendarManager = {
  FEEDS_KEY: "tasks_calendar_feeds",
  TIMETABLE_KEY: "tasks_timetable_enabled",
  OUTLOOK_KEY: "tasks_outlook_config",
  OUTLOOK_CACHE_KEY: "tasks_cache_outlook",

  isTimetableEnabled() {
    return localStorage.getItem(this.TIMETABLE_KEY) !== "false";
  },

  setTimetableEnabled(enabled) {
    localStorage.setItem(this.TIMETABLE_KEY, enabled ? "true" : "false");
    render();
  },

  // ------------------------------------------------------------
  // Microsoft Outlook Calendar Integration
  // ------------------------------------------------------------
  getOutlookConfig() {
    try {
      return JSON.parse(localStorage.getItem(this.OUTLOOK_KEY)) || {
        connected: false,
        url: "",
        name: "Outlook Calendar",
        lastSynced: null,
        syncStatus: "disconnected",
        error: null,
        eventCount: 0
      };
    } catch {
      return {
        connected: false,
        url: "",
        name: "Outlook Calendar",
        lastSynced: null,
        syncStatus: "disconnected",
        error: null,
        eventCount: 0
      };
    }
  },

  saveOutlookConfig(cfg) {
    localStorage.setItem(this.OUTLOOK_KEY, JSON.stringify(cfg));
    this.updateOutlookUI();
  },

  async connectOutlook(rawUrl, name) {
    if (!rawUrl || !rawUrl.trim()) throw new Error("Please enter a valid Outlook calendar URL.");
    let cleanUrl = rawUrl.trim().replace(/^webcal:\/\//i, "https://");
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }

    const cfg = this.getOutlookConfig();
    cfg.connected = true;
    cfg.url = cleanUrl;
    cfg.name = name || "Outlook Calendar";
    cfg.syncStatus = "syncing";
    cfg.error = null;
    this.saveOutlookConfig(cfg);

    try {
      const events = await this.fetchAndParseIcs(cleanUrl);
      cfg.connected = true;
      cfg.lastSynced = Date.now();
      cfg.syncStatus = "connected";
      cfg.eventCount = events.length;
      cfg.error = null;
      localStorage.setItem(this.OUTLOOK_CACHE_KEY, JSON.stringify(events));
      this.saveOutlookConfig(cfg);
      render();
      return events;
    } catch (err) {
      cfg.syncStatus = "error";
      cfg.error = err.message || "Failed to fetch Outlook calendar feed.";
      this.saveOutlookConfig(cfg);
      throw err;
    }
  },

  disconnectOutlook() {
    localStorage.removeItem(this.OUTLOOK_KEY);
    localStorage.removeItem(this.OUTLOOK_CACHE_KEY);
    this.updateOutlookUI();
    render();
  },

  async syncOutlook() {
    const cfg = this.getOutlookConfig();
    if (!cfg.connected || !cfg.url) return [];

    cfg.syncStatus = "syncing";
    this.saveOutlookConfig(cfg);

    try {
      const events = await this.fetchAndParseIcs(cfg.url);
      cfg.syncStatus = "connected";
      cfg.lastSynced = Date.now();
      cfg.eventCount = events.length;
      cfg.error = null;
      localStorage.setItem(this.OUTLOOK_CACHE_KEY, JSON.stringify(events));
      this.saveOutlookConfig(cfg);
      render();
      return events;
    } catch (err) {
      cfg.syncStatus = "error";
      cfg.error = err.message || "Sync failed";
      this.saveOutlookConfig(cfg);
      render();
      return [];
    }
  },

  getOutlookEvents() {
    try {
      return JSON.parse(localStorage.getItem(this.OUTLOOK_CACHE_KEY)) || [];
    } catch {
      return [];
    }
  },

  updateOutlookUI() {
    const cfg = this.getOutlookConfig();
    const statusBadge = $("outlookStatusBadge");
    const syncStatusText = $("outlookSyncStatusText");
    const connectedDetails = $("outlookConnectedDetails");
    const connectForm = $("outlookConnectForm");
    const calNameText = $("outlookCalendarNameText");
    const lastSyncText = $("outlookLastSyncText");
    const eventsCountText = $("outlookEventsCountText");
    const feedInput = $("outlookFeedUrl");

    if (statusBadge) {
      statusBadge.className = "outlook-status-badge " + (cfg.connected ? cfg.syncStatus : "disconnected");
      statusBadge.textContent = cfg.connected
        ? (cfg.syncStatus === "syncing" ? "Syncing..." : cfg.syncStatus === "error" ? "Sync error" : "Connected")
        : "Disconnected";
    }

    if (syncStatusText) {
      if (cfg.connected) {
        syncStatusText.textContent = cfg.syncStatus === "syncing"
          ? "Syncing calendar..."
          : cfg.syncStatus === "error"
            ? (cfg.error || "Failed to sync")
            : "Synchronized with Outlook";
      } else {
        syncStatusText.textContent = "Not connected";
      }
    }

    if (connectedDetails && connectForm) {
      if (cfg.connected) {
        connectedDetails.classList.remove("hidden");
        connectForm.classList.add("hidden");
        if (calNameText) calNameText.textContent = cfg.name || "Outlook Calendar";
        if (lastSyncText) {
          lastSyncText.textContent = cfg.lastSynced
            ? new Date(cfg.lastSynced).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })
            : "Never";
        }
        if (eventsCountText) eventsCountText.textContent = `${cfg.eventCount || 0} events`;
      } else {
        connectedDetails.classList.add("hidden");
        connectForm.classList.remove("hidden");
        if (feedInput) feedInput.value = "";
      }
    }
  },

  // ------------------------------------------------------------
  // Generic Custom iCal Feeds
  // ------------------------------------------------------------
  getFeeds() {
    try {
      return JSON.parse(localStorage.getItem(this.FEEDS_KEY)) || [];
    } catch {
      return [];
    }
  },

  saveFeeds(feeds) {
    localStorage.setItem(this.FEEDS_KEY, JSON.stringify(feeds));
    render();
  },

  async addFeed(url, name) {
    const feeds = this.getFeeds();
    const cleanUrl = url.trim().replace(/^webcal:\/\//i, "https://");
    const feedName = name || cleanUrl.split("/").pop().replace(/\.ics$/i, "") || "Calendar Feed";
    const id = "feed_" + Date.now();
    feeds.push({ id, name: feedName, url: cleanUrl });
    this.saveFeeds(feeds);
    await this.syncFeed(cleanUrl);
    render();
  },

  removeFeed(id) {
    const feeds = this.getFeeds().filter(f => f.id !== id);
    this.saveFeeds(feeds);
    localStorage.removeItem("tasks_cache_" + id);
    render();
  },

  async syncFeed(url) {
    try {
      const parsed = await this.fetchAndParseIcs(url);
      localStorage.setItem("tasks_cache_" + url, JSON.stringify(parsed));
      return parsed;
    } catch (err) {
      console.warn("Failed to sync calendar feed:", err);
      return [];
    }
  },

  // ------------------------------------------------------------
  // Robust CORS Fetching (Multi-proxy fallback)
  // ------------------------------------------------------------
  async fetchAndParseIcs(url) {
    const proxies = [
      // 1. Direct fetch (works if CORS is permitted or via desktop app)
      async (u) => {
        const res = await fetch(u);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.text();
      },
      // 2. AllOrigins raw proxy
      async (u) => {
        const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(u));
        if (!res.ok) throw new Error("AllOrigins HTTP " + res.status);
        return await res.text();
      },
      // 3. CorsProxy.io
      async (u) => {
        const res = await fetch("https://corsproxy.io/?" + encodeURIComponent(u));
        if (!res.ok) throw new Error("CorsProxy HTTP " + res.status);
        return await res.text();
      },
      // 4. CodeTabs proxy
      async (u) => {
        const res = await fetch("https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u));
        if (!res.ok) throw new Error("CodeTabs HTTP " + res.status);
        return await res.text();
      }
    ];

    let lastError = null;
    for (const proxy of proxies) {
      try {
        const text = await proxy(url);
        if (text && text.includes("BEGIN:VCALENDAR")) {
          const parsed = this.parseIcs(text);
          if (parsed && parsed.length >= 0) return parsed;
        }
      } catch (e) {
        lastError = e;
      }
    }

    throw new Error(lastError ? ("Unable to reach calendar: " + lastError.message) : "Failed to parse calendar data.");
  },

  // ------------------------------------------------------------
  // RFC 5545 iCalendar Parser (with line unfolding & recurring expansion)
  // ------------------------------------------------------------
  parseIcs(rawIcsText) {
    if (!rawIcsText) return [];
    // RFC 5545 line unfolding: replace CRLF followed by space or tab with nothing
    const unfolded = rawIcsText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
    const events = [];
    const vevents = unfolded.split("BEGIN:VEVENT");

    for (let i = 1; i < vevents.length; i++) {
      const block = vevents[i].split("END:VEVENT")[0];
      const getField = (pattern) => {
        const m = block.match(pattern);
        return m ? m[1].trim() : "";
      };

      const summary = getField(/SUMMARY:(.*)/);
      const description = getField(/DESCRIPTION:(.*)/);
      const location = getField(/LOCATION:(.*)/);
      const dtstart = getField(/DTSTART(?:;[^:]*)?:(.*)/);
      const dtend = getField(/DTEND(?:;[^:]*)?:(.*)/);
      const rrule = getField(/RRULE:(.*)/);

      if (summary && dtstart) {
        const parsedStart = this.parseIcsDate(dtstart);
        const parsedEnd = dtend ? this.parseIcsDate(dtend) : null;
        if (parsedStart) {
          events.push({
            summary: summary.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " "),
            description: description.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, "\n"),
            location: location.replace(/\\,/g, ",").replace(/\\;/g, ";"),
            dtstart,
            dtend,
            startDate: parsedStart.date,
            endDate: parsedEnd ? parsedEnd.date : null,
            isAllDay: parsedStart.isAllDay,
            rrule
          });
        }
      }
    }
    return events;
  },

  parseIcsDate(dtStr) {
    if (!dtStr) return null;
    const clean = dtStr.trim();
    // 1. All-day date format: YYYYMMDD
    if (/^\d{8}$/.test(clean)) {
      const y = parseInt(clean.substring(0, 4), 10);
      const m = parseInt(clean.substring(4, 6), 10) - 1;
      const d = parseInt(clean.substring(6, 8), 10);
      return { date: new Date(y, m, d, 0, 0, 0), isAllDay: true };
    }

    // 2. UTC format: YYYYMMDDTHHMMSSZ
    if (/^\d{8}T\d{6}Z$/.test(clean)) {
      const y = parseInt(clean.substring(0, 4), 10);
      const m = parseInt(clean.substring(4, 6), 10) - 1;
      const d = parseInt(clean.substring(6, 8), 10);
      const hh = parseInt(clean.substring(9, 11), 10);
      const mm = parseInt(clean.substring(11, 13), 10);
      const ss = parseInt(clean.substring(13, 15), 10);
      return { date: new Date(Date.UTC(y, m, d, hh, mm, ss)), isAllDay: false };
    }

    // 3. Local/TZ format: YYYYMMDDTHHMMSS
    if (/^\d{8}T\d{6}$/.test(clean)) {
      const y = parseInt(clean.substring(0, 4), 10);
      const m = parseInt(clean.substring(4, 6), 10) - 1;
      const d = parseInt(clean.substring(6, 8), 10);
      const hh = parseInt(clean.substring(9, 11), 10);
      const mm = parseInt(clean.substring(11, 13), 10);
      const ss = parseInt(clean.substring(13, 15), 10);
      return { date: new Date(y, m, d, hh, mm, ss), isAllDay: false };
    }

    const fallback = new Date(clean);
    return isNaN(fallback.getTime()) ? null : { date: fallback, isAllDay: false };
  },

  formatEventTime(startDate, endDate, isAllDay) {
    if (isAllDay) return "All day";
    if (!startDate) return "";
    const formatTime = (d) => {
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    };

    const startStr = formatTime(startDate);
    if (endDate && endDate > startDate) {
      const endStr = formatTime(endDate);
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  },

  // Check if an event occurs on a target calendar date (including RRULE recurrence)
  eventOccursOnDate(evt, targetDate) {
    const tYear = targetDate.getFullYear();
    const tMonth = targetDate.getMonth();
    const tDay = targetDate.getDate();
    const targetDayStart = new Date(tYear, tMonth, tDay, 0, 0, 0);
    const targetDayEnd = new Date(tYear, tMonth, tDay, 23, 59, 59, 999);

    const s = new Date(evt.startDate);
    const sYear = s.getFullYear();
    const sMonth = s.getMonth();
    const sDay = s.getDate();
    const startDayStart = new Date(sYear, sMonth, sDay, 0, 0, 0);

    // Target date is before event starts
    if (targetDayEnd < startDayStart) return false;

    // Direct match (non-recurring or same day)
    if (sYear === tYear && sMonth === tMonth && sDay === tDay) return true;

    // Multi-day event without recurrence
    if (!evt.rrule && evt.endDate) {
      const e = new Date(evt.endDate);
      return targetDayStart <= e && targetDayEnd >= s;
    }

    // Recurrence evaluation (RRULE)
    if (evt.rrule) {
      const rule = evt.rrule.toUpperCase();
      const parts = rule.split(";").reduce((acc, part) => {
        const [k, v] = part.split("=");
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      // Check UNTIL
      if (parts.UNTIL) {
        const untilParsed = this.parseIcsDate(parts.UNTIL);
        if (untilParsed && targetDayStart > untilParsed.date) return false;
      }

      const freq = parts.FREQ;
      const interval = parseInt(parts.INTERVAL, 10) || 1;

      if (freq === "DAILY") {
        const diffDays = Math.round((targetDayStart - startDayStart) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && (diffDays % interval === 0);
      }

      if (freq === "WEEKLY") {
        const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
        const targetDow = targetDate.getDay();
        let matchesDay = false;

        if (parts.BYDAY) {
          const byDays = parts.BYDAY.split(",").map(d => dayMap[d.trim()]);
          matchesDay = byDays.includes(targetDow);
        } else {
          matchesDay = (targetDow === s.getDay());
        }

        if (!matchesDay) return false;

        // Check week interval
        const diffWeeks = Math.floor((targetDayStart - startDayStart) / (1000 * 60 * 60 * 24 * 7));
        return diffWeeks >= 0 && (diffWeeks % interval === 0);
      }

      if (freq === "MONTHLY") {
        const diffMonths = (tYear - sYear) * 12 + (tMonth - sMonth);
        return diffMonths >= 0 && (diffMonths % interval === 0) && (tDay === sDay);
      }

      if (freq === "YEARLY") {
        const diffYears = tYear - sYear;
        return diffYears >= 0 && (diffYears % interval === 0) && (tMonth === sMonth) && (tDay === sDay);
      }
    }

    return false;
  },

  // ------------------------------------------------------------
  // Query Events for Date (Outlook + Custom Feeds)
  // ------------------------------------------------------------
  getEventsForDate(date) {
    if (!showCalendarEvents) return [];
    if (!this.isTimetableEnabled()) return [];

    const results = [];

    // 1. Query Outlook Calendar events
    const outlookConfig = this.getOutlookConfig();
    if (outlookConfig.connected) {
      const outlookEvents = this.getOutlookEvents();
      outlookEvents.forEach(e => {
        if (this.eventOccursOnDate(e, date)) {
          const sDate = e.startDate ? new Date(e.startDate) : null;
          const eDate = e.endDate ? new Date(e.endDate) : null;
          const timeStr = this.formatEventTime(sDate, eDate, e.isAllDay);
          results.push({
            time: timeStr,
            title: e.summary,
            location: e.location || "",
            stripe: "outlook",
            isOutlook: true,
            sortKey: sDate ? sDate.getHours() * 60 + sDate.getMinutes() : 0
          });
        }
      });
    }

    // 2. Query custom subscribed feeds
    this.getFeeds().forEach(feed => {
      try {
        const cached = JSON.parse(localStorage.getItem("tasks_cache_" + feed.url)) || [];
        cached.forEach(e => {
          if (this.eventOccursOnDate(e, date)) {
            const sDate = e.startDate ? new Date(e.startDate) : null;
            const eDate = e.endDate ? new Date(e.endDate) : null;
            const timeStr = this.formatEventTime(sDate, eDate, e.isAllDay);
            results.push({
              time: timeStr,
              title: e.summary,
              location: e.location || "",
              stripe: "blue",
              isOutlook: false,
              sortKey: sDate ? sDate.getHours() * 60 + sDate.getMinutes() : 0
            });
          }
        });
      } catch {}
    });

    // Sort events chronologically
    results.sort((a, b) => a.sortKey - b.sortKey);
    return results;
  },

  // Initialize event listeners for Outlook & Feeds
  init() {
    this.updateOutlookUI();

    // Wire Connect Outlook button
    const connectBtn = $("connectOutlookBtn");
    const feedInput = $("outlookFeedUrl");
    if (connectBtn && feedInput) {
      connectBtn.addEventListener("click", async () => {
        const url = feedInput.value.trim();
        if (!url) {
          alert("Please paste your Outlook calendar ICS link.");
          return;
        }
        connectBtn.disabled = true;
        connectBtn.textContent = "Connecting...";
        try {
          const events = await this.connectOutlook(url);
          alert(`Outlook Calendar connected successfully! Found ${events.length} events.`);
        } catch (err) {
          alert("Failed to connect Outlook calendar: " + (err.message || "Please check the URL and try again."));
        } finally {
          connectBtn.disabled = false;
          connectBtn.textContent = "Connect";
        }
      });
    }

    // Wire Sync Now button
    const syncBtn = $("outlookSyncNowBtn");
    if (syncBtn) {
      syncBtn.addEventListener("click", async () => {
        syncBtn.disabled = true;
        syncBtn.textContent = "Syncing...";
        try {
          const events = await this.syncOutlook();
          alert(`Outlook synced! ${events.length} events up to date.`);
        } catch (err) {
          alert("Sync error: " + err.message);
        } finally {
          syncBtn.disabled = false;
          syncBtn.textContent = "Sync Now";
        }
      });
    }

    // Wire Disconnect button
    const disconnectBtn = $("outlookDisconnectBtn");
    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", () => {
        if (confirm("Disconnect Outlook Calendar from Todorisu?")) {
          this.disconnectOutlook();
        }
      });
    }

    // Background auto-sync if connected (on start and every 15 mins)
    const cfg = this.getOutlookConfig();
    if (cfg.connected && cfg.url) {
      setTimeout(() => this.syncOutlook(), 2000);
      setInterval(() => this.syncOutlook(), 15 * 60 * 1000);
    }
  }
};

// Initialize CalendarManager when DOM is ready
if (typeof window !== "undefined") {
  window.CalendarManager = CalendarManager;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => CalendarManager.init());
  } else {
    CalendarManager.init();
  }
}
