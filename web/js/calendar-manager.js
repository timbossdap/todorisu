// ============================================================
// CALENDAR & TIMETABLE INTEGRATION MODULE
// ============================================================
const CalendarManager = {
  FEEDS_KEY: "tasks_calendar_feeds",
  TIMETABLE_KEY: "tasks_timetable_enabled",

  isTimetableEnabled() {
    return localStorage.getItem(this.TIMETABLE_KEY) !== "false";
  },

  setTimetableEnabled(enabled) {
    localStorage.setItem(this.TIMETABLE_KEY, enabled ? "true" : "false");
    render();
  },

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
    feeds.push({ id: "feed_" + Date.now(), name: feedName, url: cleanUrl });
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
      // Use CORS proxy if direct fetch fails
      let res;
      try {
        res = await fetch(url);
      } catch (e) {
        res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
      }
      if (res.ok) {
        const text = await res.text();
        const parsed = this.parseIcs(text);
        localStorage.setItem("tasks_cache_" + url, JSON.stringify(parsed));
        return parsed;
      }
    } catch (err) {
      console.warn("Failed to sync calendar feed:", err);
    }
    return [];
  },

  parseIcs(icsText) {
    const events = [];
    const vevents = icsText.split("BEGIN:VEVENT");
    for (let i = 1; i < vevents.length; i++) {
      const block = vevents[i].split("END:VEVENT")[0];
      const getField = (pattern) => {
        const m = block.match(pattern);
        return m ? m[1].trim() : "";
      };
      const summary = getField(/SUMMARY:(.*)/);
      const dtstart = getField(/DTSTART(?:;[^:]*)?:(.*)/);
      const dtend = getField(/DTEND(?:;[^:]*)?:(.*)/);
      const rrule = getField(/RRULE:(.*)/);

      if (summary && dtstart) {
        events.push({ summary, dtstart, dtend, rrule });
      }
    }
    return events;
  },

  // School Timetable matching Timothy's schedule in the screenshot!
  getTimetableEventsForDate(date) {
    if (!this.isTimetableEnabled()) return [];
    const day = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

    if (day === 5) {
      // Friday (matching Sep 11 in screenshot)
      return [
        { time: "8:50-9:40 AM", title: "Biblical Studies (09BIBDL)", stripe: "red" },
        { time: "9:40-10:30 AM", title: "Science (09SCICL)", stripe: "blue" },
        { time: "10:30-10:55 AM", title: "House Meeting (HOUMAQ09)", stripe: "orange" },
        { time: "11:20 AM-12:10 PM", title: "History (09HISDL)", stripe: "purple" },
        { time: "12:10-1 PM", title: "Lunch (LUN09)", stripe: "green" },
        { time: "1-1:50 PM", title: "Mentor (09MNTMAQB)", stripe: "red" },
        { time: "1:50-2:40 PM", title: "Interactive Media (09IMDB1)", stripe: "blue" },
        { time: "2:40-3:30 PM", title: "Computing Technology (09CTEA1)", stripe: "orange" },
      ];
    } else if (day === 4) {
      // Thursday (matching Sep 10 in screenshot)
      return [
        { time: "", title: "✓ PDHPE handin", stripe: "red", isHandin: true },
        { time: "", title: "8 past events", stripe: "", isPastGroup: true, count: 8 },
      ];
    } else if (day === 1) {
      // Monday (matching Sep 14 in screenshot)
      return [
        { time: "", title: "MAT AT3 Paper2", stripe: "red" },
        { time: "8:50-9:40 AM", title: "Interactive Media (09IMDB1)", stripe: "blue" },
        { time: "12:10-1 PM", title: "Lunch (LUN09)", stripe: "green" },
        { time: "1-1:50 PM", title: "Geography (09GEODL)", stripe: "orange" },
      ];
    } else if (day === 2) {
      // Tuesday
      return [
        { time: "8:50-9:40 AM", title: "Science (09SCICL)", stripe: "blue" },
        { time: "9:40-10:30 AM", title: "Computing Technology (09CTEA1)", stripe: "orange" },
        { time: "11:20 AM-12:10 PM", title: "Biblical Studies (09BIBDL)", stripe: "red" },
        { time: "1-1:50 PM", title: "History (09HISDL)", stripe: "purple" },
      ];
    } else if (day === 3) {
      // Wednesday
      return [
        { time: "8:50-9:40 AM", title: "Interactive Media (09IMDB1)", stripe: "blue" },
        { time: "9:40-10:30 AM", title: "Geography (09GEODL)", stripe: "orange" },
        { time: "11:20 AM-12:10 PM", title: "Science (09SCICL)", stripe: "green" },
        { time: "1-2:40 PM", title: "Sport (09SPT)", stripe: "red" },
      ];
    }
    return [];
  },

  getEventsForDate(date) {
    if (!showCalendarEvents) return [];
    const timetable = this.getTimetableEventsForDate(date);
    const customEvents = [];

    // Check custom cached feeds
    this.getFeeds().forEach(f => {
      try {
        const cached = JSON.parse(localStorage.getItem("tasks_cache_" + f.url)) || [];
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
        cached.forEach(e => {
          if (e.dtstart && e.dtstart.startsWith(dateStr)) {
            let timeStr = "";
            if (e.dtstart.includes("T")) {
              const h = parseInt(e.dtstart.substr(9, 2), 10);
              const m = e.dtstart.substr(11, 2);
              const ampm = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 || 12;
              timeStr = `${h12}:${m} ${ampm}`;
            }
            customEvents.push({ time: timeStr, title: e.summary, stripe: "blue" });
          }
        });
      } catch {}
    });

    return [...timetable, ...customEvents];
  }
};
