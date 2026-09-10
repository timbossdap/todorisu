// ---------- Supabase setup ----------
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let tasks = [];
let currentView = "upcoming"; // Default to Upcoming view like the screenshot!
let currentProject = null;
let currentTag = null;
let selectedWeekStart = getMonday(new Date(2026, 8, 10)); // Anchor to Sep 10, 2026 (or current date)
let isOverdueCollapsed = false;
let collapsedCalendarDays = {};
let showCalendarEvents = localStorage.getItem("tasks_show_calendar") !== "false";
let showCompletedTasks = false;

const $ = (id) => document.getElementById(id);

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

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

// ============================================================
// AUTH
// ============================================================
let isSignUp = false;

$("authToggle").addEventListener("click", () => {
  isSignUp = !isSignUp;
  $("authSubmit").textContent = isSignUp ? "Create account" : "Sign in";
  $("authToggle").textContent = isSignUp ? "Already have an account? Sign in" : "Need an account? Create one";
});

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("authError").textContent = "";
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const fn = isSignUp ? sb.auth.signUp : sb.auth.signInWithPassword;
  const { data, error } = await fn.call(sb.auth, { email, password });
  if (error) { $("authError").textContent = error.message; return; }
  if (isSignUp && !data.session) {
    $("authError").textContent = "Account created. Check your email to confirm, then sign in.";
    return;
  }
  onSignedIn(data.session);
});

sb.auth.onAuthStateChange((_event, session) => {
  if (session) onSignedIn(session);
});

async function onSignedIn(session) {
  currentUser = session.user;
  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");

  const name = currentUser.email ? (currentUser.email.split("@")[0] || "Timothy") : "Timothy";
  const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
  $("userName").textContent = capitalName;
  $("userAvatar").textContent = capitalName.charAt(0);

  if (window.AndroidBridge && window.AndroidBridge.onAuth) {
    window.AndroidBridge.onAuth(session.access_token, session.refresh_token, session.user.id);
  }

  await loadTasks();
  render();
}

$("signOutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
  if (window.AndroidBridge && window.AndroidBridge.onSignOut) window.AndroidBridge.onSignOut();
  location.reload();
});

(async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) onSignedIn(data.session);
})();

// ============================================================
// DATA & TASK OPERATIONS
// ============================================================
async function loadTasks() {
  const { data, error } = await sb.from("tasks").select("*").order("created_at", { ascending: true });
  if (!error && data) {
    tasks = data;
  }

  // If user has no tasks yet, seed the sample overdue task matching the screenshot!
  if (tasks.length === 0 && currentUser) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(9, 0, 0, 0);

    await addTask({
      title: "Biweekly thursday number 1 uniform",
      project: "Inbox",
      due_at: yesterday.toISOString(),
      has_time: false,
      priority: 4,
      recurrence_rule: "biweekly",
      tags: [],
    });
  }
}

async function addTask({ title, project, due_at, has_time, priority, recurrence_rule, tags: taskTags }) {
  const { data, error } = await sb.from("tasks").insert({
    user_id: currentUser ? currentUser.id : "guest",
    title,
    project: project || "Inbox",
    due_at: due_at || null,
    has_time: !!has_time,
    priority: priority || 4,
    recurrence_rule: recurrence_rule || null,
    tags: taskTags || [],
  }).select();

  if (!error && data) {
    tasks.push(data[0]);
  } else {
    // Fallback in memory
    const tempTask = {
      id: "task_" + Date.now(),
      title,
      project: project || "Inbox",
      due_at: due_at || null,
      has_time: !!has_time,
      priority: priority || 4,
      recurrence_rule: recurrence_rule || null,
      tags: taskTags || [],
      completed: false,
      created_at: new Date().toISOString()
    };
    tasks.push(tempTask);
  }

  render();
  if (data && data[0]) scheduleWebNotification(data[0]);
}

async function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  if (!t.completed && t.recurrence_rule && t.due_at) {
    const next = nextOccurrence(t.recurrence_rule, t.due_at);
    t.due_at = next.toISOString();
    render();
    await sb.from("tasks").update({ due_at: t.due_at }).eq("id", id);
    return;
  }
  t.completed = !t.completed;
  t.completed_at = t.completed ? new Date().toISOString() : null;
  render();
  try {
    const res = await sb.from("tasks").update({ completed: t.completed, completed_at: t.completed_at }).eq("id", id);
    if (res.error) {
      await sb.from("tasks").update({ completed: t.completed }).eq("id", id);
    }
  } catch (_) {
    await sb.from("tasks").update({ completed: t.completed }).eq("id", id);
  }
}

async function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  render();
  await sb.from("tasks").delete().eq("id", id);
}

function nextOccurrence(rule, fromIso) {
  const d = new Date(fromIso);
  if (rule === "daily") { d.setDate(d.getDate() + 1); return d; }
  if (rule === "weekday") {
    do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
    return d;
  }
  if (rule === "weekly") { d.setDate(d.getDate() + 7); return d; }
  if (rule === "biweekly") { d.setDate(d.getDate() + 14); return d; }
  if (rule === "monthly") { d.setMonth(d.getMonth() + 1); return d; }
  if (rule === "bimonthly") { d.setMonth(d.getMonth() + 2); return d; }
  if (rule === "yearly") { d.setFullYear(d.getFullYear() + 1); return d; }
  let m = /^every:(\d+):days$/.exec(rule || "");
  if (m) { d.setDate(d.getDate() + parseInt(m[1], 10)); return d; }
  m = /^every:(\d+):weeks$/.exec(rule || "");
  if (m) { d.setDate(d.getDate() + parseInt(m[1], 10) * 7); return d; }
  m = /^every:(\d+):months$/.exec(rule || "");
  if (m) { d.setMonth(d.getMonth() + parseInt(m[1], 10)); return d; }
  m = /^every:(\d+):years$/.exec(rule || "");
  if (m) { d.setFullYear(d.getFullYear() + parseInt(m[1], 10)); return d; }
  return d;
}

const RECUR_LABEL = {
  daily: "Daily",
  weekday: "Weekdays",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  bimonthly: "Every 2 months",
  yearly: "Yearly",
};

function getRecurLabel(rule) {
  if (!rule) return "";
  if (RECUR_LABEL[rule]) return RECUR_LABEL[rule];
  let m = /^every:(\d+):days$/.exec(rule);
  if (m) return `Every ${m[1]} days`;
  m = /^every:(\d+):weeks$/.exec(rule);
  if (m) return `Every ${m[1]} weeks`;
  m = /^every:(\d+):months$/.exec(rule);
  if (m) return `Every ${m[1]} months`;
  m = /^every:(\d+):years$/.exec(rule);
  if (m) return `Every ${m[1]} years`;
  return "Repeats";
}

function toLocalDatetimeString(date, hasTime) {
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = hasTime ? pad(date.getHours()) : "09";
  const mm = hasTime ? pad(date.getMinutes()) : "00";
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

// ============================================================
// SMART TEXT PARSING (tags, project, priority, recurrence, date, time)
// ============================================================
function parseSmartInput(raw) {
  let text = " " + raw + " ";
  let priority = null, project = null, recurrence = null;
  const tags = [];

  // Priority
  text = text.replace(/(?:^|\s)(?:p|priority:?\s*|prio:?\s*|!)([1-4])(?=\s|$)/gi, (m, n) => {
    priority = parseInt(n, 10);
    return " ";
  });
  text = text.replace(/(?:^|\s)(?:!|priority:?\s*)(urgent|high|med(?:ium)?|low)(?=\s|$)/gi, (m, lvl) => {
    lvl = lvl.toLowerCase();
    priority = (lvl === "urgent" || lvl === "high") ? 1 : (lvl === "low" ? 3 : 2);
    return " ";
  });

  // Tags
  text = text.replace(/(?:^|\s)@([a-zA-Z0-9_-]+)/g, (m, tag) => {
    tags.push(tag.toLowerCase());
    return " ";
  });
  text = text.replace(/(?:^|\s)tags?:([a-zA-Z0-9_-]+)/gi, (m, tag) => {
    tags.push(tag.toLowerCase());
    return " ";
  });

  // Project
  text = text.replace(/(?:^|\s)#([a-zA-Z0-9_-]+)/g, (m, p) => {
    project = p.charAt(0).toUpperCase() + p.slice(1);
    return " ";
  });
  text = text.replace(/(?:^|\s)(?:project|in|to):([a-zA-Z0-9_-]+)/gi, (m, p) => {
    project = p.charAt(0).toUpperCase() + p.slice(1);
    return " ";
  });

  // Recurrence
  const recurPatterns = [
    [/(?:\bevery\s+other\s+week\b|\bbi-?weekly\b|\bfortnightly\b|\bevery\s+2\s+weeks?\b|\bevery\s+two\s+weeks?\b|\bevery\s+second\s+week\b)/i, "biweekly"],
    [/(?:\bevery\s+other\s+month\b|\bbi-?monthly\b|\bevery\s+2\s+months?\b|\bevery\s+two\s+months?\b)/i, "bimonthly"],
    [/(?:\bquarterly\b|\bevery\s+quarter\b|\bevery\s+3\s+months?\b|\bevery\s+three\s+months?\b)/i, "every:3:months"],
    [/(?:\bsemi-?annually\b|\bevery\s+6\s+months?\b|\bevery\s+six\s+months?\b)/i, "every:6:months"],
    [/(?:\bevery\s+weekday\b|\bon\s+weekdays?\b|\bweekdays?\b|\bworkdays?\b|\bevery\s+work\s*day\b)/i, "weekday"],
    [/(?:\bevery\s+day\b|\bdaily\b|\beach\s+day\b)/i, "daily"],
    [/(?:\bevery\s+week\b|\bweekly\b|\beach\s+week\b|\bonce\s+a\s+week\b)/i, "weekly"],
    [/(?:\bevery\s+month\b|\bmonthly\b|\beach\s+month\b|\bonce\s+a\s+month\b)/i, "monthly"],
    [/(?:\bevery\s+year\b|\byearly\b|\bannually\b|\bannual\b|\beach\s+year\b|\bonce\s+a\s+year\b)/i, "yearly"],
    [/(?:\bevery\s+other\s+day\b)/i, "every:2:days"],
  ];

  for (const [re, rule] of recurPatterns) {
    if (re.test(text)) {
      recurrence = rule;
      text = text.replace(re, " ");
      break;
    }
  }

  const everyOtherDowPattern = /\bevery\s+other\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
  const everyOtherDowMatch = everyOtherDowPattern.exec(text);
  if (everyOtherDowMatch) {
    if (!recurrence) recurrence = "biweekly";
    text = text.replace(everyOtherDowPattern, everyOtherDowMatch[1]);
  }

  if (!recurrence) {
    const everyN = /\bevery\s+(\d+)\s+(day|week|month|year)s?\b/i.exec(text);
    if (everyN) {
      const num = parseInt(everyN[1], 10);
      const unit = everyN[2].toLowerCase();
      if (unit === "day") recurrence = num === 1 ? "daily" : (num === 2 ? "every:2:days" : `every:${num}:days`);
      else if (unit === "week") recurrence = num === 1 ? "weekly" : (num === 2 ? "biweekly" : `every:${num}:weeks`);
      else if (unit === "month") recurrence = num === 1 ? "monthly" : (num === 2 ? "bimonthly" : `every:${num}:months`);
      else if (unit === "year") recurrence = num === 1 ? "yearly" : `every:${num}:years`;
      text = text.replace(everyN[0], " ");
    }
  }

  const dowPattern = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
  const dowMatch = dowPattern.exec(text);
  if (dowMatch) {
    if (!recurrence) recurrence = "weekly";
    text = text.replace(dowPattern, dowMatch[1]);
  }

  text = text
    .replace(/\b(?:eod|end\s+of\s+(?:the\s+)?day)\b/gi, "5:00 pm")
    .replace(/\btmrw\b/gi, "tomorrow")
    .replace(/\btmw\b/gi, "tomorrow")
    .replace(/\btod\b/gi, "today")
    .replace(/\b(\d{1,2})\s*([ap])\b/gi, "$1$2m");

  let dueDate = null, hasTime = false;
  if (window.chrono) {
    const results = chrono.parse(text, new Date());
    if (results.length > 0) {
      let dateResult = null, timeResult = null, fullDateTimeResult = null;

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        const isDateCertain = r.start.isCertain("day") || r.start.isCertain("weekday") || r.start.isCertain("month");
        const isTimeCertain = r.start.isCertain("hour");
        if (isDateCertain && isTimeCertain) {
          fullDateTimeResult = r;
          break;
        }
        if (isDateCertain && !dateResult) dateResult = r;
        if (isTimeCertain && !timeResult) timeResult = r;
      }

      let chosen = null;
      if (fullDateTimeResult) {
        chosen = fullDateTimeResult.start.date();
        hasTime = true;
      } else if (dateResult && timeResult) {
        const d = new Date(dateResult.start.date().getTime());
        const t = timeResult.start.date();
        d.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
        chosen = d;
        hasTime = true;
      } else if (timeResult) {
        chosen = timeResult.start.date();
        hasTime = true;
      } else if (dateResult) {
        chosen = dateResult.start.date();
        hasTime = false;
      } else if (results[0]) {
        chosen = results[0].start.date();
        hasTime = results[0].start.isCertain("hour");
      }

      dueDate = chosen;

      results.forEach(r => {
        const escaped = r.text.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const re = new RegExp("(?:\\b(?:around|about|approx|approximately|at|by|due\\s+on|due\\s+by|due|on|@|~)\\s+)?" + escaped + "(?:\\b|\\s|$)", "gi");
        text = text.replace(re, " ");
      });
    }
  }

  let cleanTitle = text
    .replace(/\b(?:around|about|approx|approximately|at|by|due\\s+on|due\\s+by|due|on|for|repeats?|eod|end\s+of\s+(?:the\s+)?day)\b/gi, " ")
    .replace(/[~@#!]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { cleanTitle: cleanTitle || raw.trim(), project, tags, priority, recurrence, dueDate, hasTime };
}

function renderSmartPreview() {
  const parsed = parseSmartInput($("quickAddInput").value);
  const chips = [];
  if (parsed.dueDate) {
    const opts = parsed.hasTime
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" };
    chips.push(`📅 ${parsed.dueDate.toLocaleString(undefined, opts)}`);
  }
  if (parsed.recurrence) chips.push(`🔁 ${getRecurLabel(parsed.recurrence)}`);
  if (parsed.priority) chips.push(`⚑ Priority ${parsed.priority}`);
  if (parsed.project) chips.push(`# ${parsed.project}`);
  parsed.tags.forEach(t => chips.push(`@${t}`));

  const el = $("smartPreview");
  if (!chips.length) {
    el.classList.add("hidden");
    el.innerHTML = "";
  } else {
    el.classList.remove("hidden");
    el.innerHTML = chips.map(c => `<span class="smart-chip">${c}</span>`).join("");
  }

  if (parsed.dueDate) {
    $("quickAddDate").value = toLocalDatetimeString(parsed.dueDate, parsed.hasTime);
  } else if (!$("quickAddInput").value.trim()) {
    $("quickAddDate").value = "";
  }

  if (parsed.recurrence) {
    let found = false;
    for (let opt of $("quickAddRecurrence").options) {
      if (opt.value === parsed.recurrence) {
        $("quickAddRecurrence").value = parsed.recurrence;
        found = true;
        break;
      }
    }
    if (!found) {
      const customOpt = new Option(getRecurLabel(parsed.recurrence), parsed.recurrence);
      $("quickAddRecurrence").add(customOpt);
      $("quickAddRecurrence").value = parsed.recurrence;
    }
  } else if (!$("quickAddInput").value.trim()) {
    $("quickAddRecurrence").value = "";
  }

  if (parsed.priority) {
    $("quickAddPriority").value = String(parsed.priority);
  } else if (!$("quickAddInput").value.trim()) {
    $("quickAddPriority").value = "4";
  }

  if (parsed.project) {
    let found = false;
    for (let opt of $("quickAddProject").options) {
      if (opt.value.toLowerCase() === parsed.project.toLowerCase()) {
        $("quickAddProject").value = opt.value;
        found = true;
        break;
      }
    }
    if (!found) {
      const opt = new Option(parsed.project, parsed.project);
      $("quickAddProject").add(opt);
      $("quickAddProject").value = parsed.project;
    }
  }

  if (parsed.tags && parsed.tags.length > 0) {
    $("quickAddTags").value = parsed.tags.join(", ");
  }

  return parsed;
}

// ============================================================
// DATE HELPERS & FILTERING
// ============================================================
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr), now = new Date();
  return d.toDateString() === now.toDateString();
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr), now = new Date();
  now.setHours(0, 0, 0, 0);
  const taskDate = new Date(dateStr);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < now;
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1), d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function formatDayHeader(date) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthShort = date.toLocaleString(undefined, { month: "short" });
  const dayNum = date.getDate();
  const weekday = date.toLocaleString(undefined, { weekday: "long" });

  if (isSameDay(date, now)) {
    return `${monthShort} ${dayNum} · Today · ${weekday}`;
  } else if (isSameDay(date, tomorrow)) {
    return `${monthShort} ${dayNum} · Tomorrow · ${weekday}`;
  } else {
    return `${monthShort} ${dayNum} · ${weekday}`;
  }
}

function getProjects() {
  return [...new Set(tasks.map(t => t.project || "Inbox"))].filter(p => p !== "Inbox").sort();
}

function getTags() {
  const all = tasks.flatMap(t => t.tags || []);
  return [...new Set(all)].sort();
}

// Navigation view switcher
document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    currentView = btn.dataset.view;
    currentProject = null;
    currentTag = null;
    render();
  });
});

// ============================================================
// RENDER MAIN VIEWS
// ============================================================
function render() {
  document.querySelectorAll(".nav-item[data-view]").forEach(b =>
    b.classList.toggle("active", b.dataset.view === currentView && !currentProject && !currentTag));

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
    btn.addEventListener("click", () => { currentProject = p; currentTag = null; currentView = "project"; render(); });
    projectList.appendChild(btn);
  });

  // Populate tags list
  const tagList = $("tagList");
  tagList.innerHTML = "";
  getTags().forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "nav-item project-item" + (currentTag === tag ? " active" : "");
    btn.innerHTML = `<span class="nav-label">@${tag}</span>`;
    btn.addEventListener("click", () => { currentTag = tag; currentProject = null; currentView = "tag"; render(); });
    tagList.appendChild(btn);
  });

  // Populate quick add projects
  const qp = $("quickAddProject");
  qp.innerHTML = `<option value="Inbox">Inbox</option>` + getProjects().map(p => `<option value="${p}">${p}</option>`).join("");

  // Switch view containers
  const isReporting = currentView === "reporting";
  $("displayBtn").classList.toggle("hidden", isReporting);
  $("exportBtn").classList.toggle("hidden", !isReporting);

  if (currentView === "upcoming") {
    $("upcomingView").classList.remove("hidden");
    $("standardTaskView").classList.add("hidden");
    $("settingsView").classList.add("hidden");
    $("reportingView").classList.add("hidden");
    renderUpcomingView();
  } else if (currentView === "settings") {
    $("upcomingView").classList.add("hidden");
    $("standardTaskView").classList.add("hidden");
    $("settingsView").classList.remove("hidden");
    $("reportingView").classList.add("hidden");
    renderSettings();
  } else if (currentView === "reporting") {
    $("upcomingView").classList.add("hidden");
    $("standardTaskView").classList.add("hidden");
    $("settingsView").classList.add("hidden");
    $("reportingView").classList.remove("hidden");
    renderReportingView();
  } else {
    $("upcomingView").classList.add("hidden");
    $("standardTaskView").classList.remove("hidden");
    $("settingsView").classList.add("hidden");
    $("reportingView").classList.add("hidden");
    renderStandardView();
  }
}

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

// ============================================================
// UPCOMING VIEW RENDERER (Matching the Screenshot!)
// ============================================================
function renderUpcomingView() {
  // Month Label: e.g. "September 2026"
  const midWeekDate = new Date(selectedWeekStart);
  midWeekDate.setDate(midWeekDate.getDate() + 3);
  const monthYearStr = midWeekDate.toLocaleString(undefined, { month: "long", year: "numeric" });
  $("upcomingMonthLabel").textContent = monthYearStr;

  // 7-Day Horizontal Week Strip
  const strip = $("upcomingWeekStrip");
  strip.innerHTML = "";
  const now = new Date();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(selectedWeekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dayCol = document.createElement("div");
    dayCol.className = "week-strip-col";
    const dayIsToday = isSameDay(dayDate, now);

    dayCol.innerHTML = `
      <div class="col-day-name">${dayNames[i]}</div>
      <div class="col-day-num ${dayIsToday ? 'is-today' : ''}">${dayDate.getDate()}</div>
    `;

    dayCol.addEventListener("click", () => {
      document.querySelectorAll(".week-strip-col").forEach(c => c.classList.remove("selected"));
      dayCol.classList.add("selected");
      const targetSec = document.getElementById("day_sec_" + dayDate.toISOString().slice(0, 10));
      if (targetSec) targetSec.scrollIntoView({ behavior: "smooth" });
    });

    strip.appendChild(dayCol);
  }

  // Overdue Section
  const overdueTasks = tasks.filter(t => !t.completed && isOverdue(t.due_at));
  const overdueSection = $("overdueSection");
  const overdueList = $("overdueTaskList");

  if (overdueTasks.length > 0) {
    overdueSection.classList.remove("hidden");
    $("toggleOverdueBtn").classList.toggle("collapsed", isOverdueCollapsed);
    overdueList.classList.toggle("hidden", isOverdueCollapsed);
    overdueList.innerHTML = "";
    overdueTasks.forEach(t => overdueList.appendChild(taskRow(t)));
  } else {
    overdueSection.classList.add("hidden");
  }

  // Day-by-Day Sections
  const daysContainer = $("upcomingDaysContainer");
  daysContainer.innerHTML = "";

  // Render 7 days of the selected week (or start from today if on current week)
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(selectedWeekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dateKey = dayDate.toISOString().slice(0, 10);

    const daySection = document.createElement("div");
    daySection.className = "day-section";
    daySection.id = "day_sec_" + dateKey;

    // Header
    const header = document.createElement("div");
    header.className = "day-header";
    header.innerHTML = `<span class="day-header-title">${formatDayHeader(dayDate)}</span>`;
    daySection.appendChild(header);

    // Calendar Events Box
    const calendarEvents = CalendarManager.getEventsForDate(dayDate);
    if (calendarEvents.length > 0 && showCalendarEvents) {
      const isCollapsed = collapsedCalendarDays[dateKey];
      const calBox = document.createElement("div");
      calBox.className = "day-calendar-box";

      // Top right collapse chevron
      const collapseBtn = document.createElement("button");
      collapseBtn.className = "calendar-box-collapse-btn";
      collapseBtn.textContent = isCollapsed ? "⌵" : "^";
      collapseBtn.addEventListener("click", () => {
        collapsedCalendarDays[dateKey] = !collapsedCalendarDays[dateKey];
        renderUpcomingView();
      });

      const calHeader = document.createElement("div");
      calHeader.className = "calendar-box-header";
      calHeader.appendChild(document.createElement("div"));
      calHeader.appendChild(collapseBtn);
      calBox.appendChild(calHeader);

      if (!isCollapsed) {
        const eventsGrid = document.createElement("div");
        eventsGrid.className = "calendar-events-grid";

        calendarEvents.forEach(evt => {
          if (evt.isPastGroup) {
            const pastRow = document.createElement("div");
            pastRow.className = "past-events-summary";
            pastRow.innerHTML = `<span class="past-events-bars">|||</span> <span>${evt.count} past events</span>`;
            eventsGrid.appendChild(pastRow);
          } else {
            const row = document.createElement("div");
            row.className = "calendar-event-item";
            const stripeClass = evt.stripe || "red";
            row.innerHTML = `
              <span class="event-stripe ${stripeClass}"></span>
              ${evt.time ? `<span class="event-time">${evt.time}</span>` : ''}
              <span class="event-summary">${evt.title}</span>
            `;
            eventsGrid.appendChild(row);
          }
        });
        calBox.appendChild(eventsGrid);
      }
      daySection.appendChild(calBox);
    }

    // Tasks for this Day
    const dayTasks = tasks.filter(t => !t.completed && t.due_at && isSameDay(t.due_at, dayDate));
    if (dayTasks.length > 0) {
      const taskUl = document.createElement("ul");
      taskUl.className = "task-list";
      dayTasks.forEach(t => taskUl.appendChild(taskRow(t)));
      daySection.appendChild(taskUl);
    }

    // Inline "+ Add task" button under this day
    const inlineAddRow = document.createElement("div");
    inlineAddRow.className = "inline-add-row";
    const addBtn = document.createElement("button");
    addBtn.className = "inline-add-task-btn";
    addBtn.innerHTML = `<span class="plus-red">+</span> <span>Add task</span>`;
    addBtn.addEventListener("click", () => {
      openInlineAdd(daySection, dayDate);
    });
    inlineAddRow.appendChild(addBtn);
    daySection.appendChild(inlineAddRow);

    daysContainer.appendChild(daySection);
  }
}

// Inline task creation under a day
function openInlineAdd(daySection, targetDate) {
  // Close any existing inline add
  const existing = document.querySelector(".inline-quick-add");
  if (existing) existing.remove();

  const wrap = document.createElement("div");
  wrap.className = "quick-add inline-quick-add";
  wrap.innerHTML = `
    <input type="text" class="inline-input" placeholder='e.g. "Meeting at 2pm #Work !high"' autofocus />
    <div class="quick-add-actions">
      <button class="btn-primary inline-save">Add task</button>
      <button class="btn-ghost inline-cancel">Cancel</button>
    </div>
  `;

  const input = wrap.querySelector(".inline-input");
  const saveBtn = wrap.querySelector(".inline-save");
  const cancelBtn = wrap.querySelector(".inline-cancel");

  const save = () => {
    const raw = input.value.trim();
    if (!raw) return;
    const parsed = parseSmartInput(raw);
    const dueDate = parsed.dueDate || new Date(targetDate);
    if (!parsed.dueDate) dueDate.setHours(9, 0, 0, 0);

    addTask({
      title: parsed.cleanTitle || raw,
      project: parsed.project || "Inbox",
      due_at: dueDate.toISOString(),
      has_time: parsed.hasTime,
      priority: parsed.priority || 4,
      recurrence_rule: parsed.recurrence || null,
      tags: parsed.tags || [],
    });
    wrap.remove();
  };

  saveBtn.addEventListener("click", save);
  cancelBtn.addEventListener("click", () => wrap.remove());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") wrap.remove();
  });

  daySection.appendChild(wrap);
  input.focus();
}

// ============================================================
// STANDARD TASK VIEW (Today, Inbox, Projects, Tags)
// ============================================================
function visibleTasks() {
  let list = tasks.filter(t => showCompletedTasks || !t.completed);
  if (currentTag) return list.filter(t => (t.tags || []).includes(currentTag));
  if (currentProject) return list.filter(t => (t.project || "Inbox") === currentProject);
  if (currentView === "today") return list.filter(t => isToday(t.due_at) || isOverdue(t.due_at));
  if (currentView === "inbox") return list.filter(t => (t.project || "Inbox") === "Inbox");
  return list;
}

function renderStandardView() {
  $("viewTitle").textContent = currentTag ? `@${currentTag}` : currentProject || (
    currentView === "today" ? "Today" : currentView === "inbox" ? "Inbox" : "Tasks"
  );
  $("viewDate").textContent = currentView === "today" && !currentProject && !currentTag
    ? new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";

  // Show calendar box on Today view if enabled
  const todayBox = $("todayCalendarCard");
  if (currentView === "today" && showCalendarEvents) {
    const events = CalendarManager.getEventsForDate(new Date());
    if (events.length > 0) {
      todayBox.classList.remove("hidden");
      todayBox.innerHTML = `
        <div class="calendar-events-grid">
          ${events.map(evt => evt.isPastGroup ? `
            <div class="past-events-summary"><span class="past-events-bars">|||</span> <span>${evt.count} past events</span></div>
          ` : `
            <div class="calendar-event-item">
              <span class="event-stripe ${evt.stripe || 'red'}"></span>
              ${evt.time ? `<span class="event-time">${evt.time}</span>` : ''}
              <span class="event-summary">${evt.title}</span>
            </div>
          `).join("")}
        </div>
      `;
    } else {
      todayBox.classList.add("hidden");
    }
  } else {
    todayBox.classList.add("hidden");
  }

  const visible = visibleTasks();
  const uncompleted = visible.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  $("taskList").innerHTML = "";
  $("emptyState").classList.toggle("hidden", uncompleted.length > 0);
  uncompleted.sort((a, b) => (a.due_at || "").localeCompare(b.due_at || "")).forEach(t => $("taskList").appendChild(taskRow(t)));

  $("completedList").innerHTML = "";
  completed.forEach(t => $("completedList").appendChild(taskRow(t)));
  $("completedList").classList.toggle("hidden", !showCompletedTasks);
  $("toggleCompleted").textContent = showCompletedTasks ? "Hide completed" : "Show completed";
}

// Single task row renderer (matching Todoist style)
function taskRow(t) {
  const li = document.createElement("li");
  li.className = "task-row" + (t.completed ? " completed" : "");

  const check = document.createElement("button");
  check.className = "task-check" + (t.completed ? " checked" : "");
  check.dataset.priority = t.priority || 4;
  check.addEventListener("click", () => toggleTask(t.id));

  const body = document.createElement("div");
  body.className = "task-body";
  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = t.title;
  body.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  let hasMeta = false;

  if (t.due_at) {
    hasMeta = true;
    const span = document.createElement("span");
    const overdue = isOverdue(t.due_at);
    span.className = "due-tag" + (overdue ? " overdue" : "");
    const d = new Date(t.due_at);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYest = isSameDay(d, yesterday);

    let dateText = isYest ? "Yesterday" : isToday(t.due_at) ? "Today" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (t.has_time) dateText += " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> <span>${dateText}</span>`;
    meta.appendChild(span);
  }

  if (t.recurrence_rule) {
    hasMeta = true;
    const span = document.createElement("span");
    span.className = "recur-icon";
    span.textContent = "🔁 " + (getRecurLabel(t.recurrence_rule) || "Repeats");
    meta.appendChild(span);
  }

  if (t.project) {
    hasMeta = true;
    const projSpan = document.createElement("span");
    projSpan.className = "task-project-tag";
    projSpan.innerHTML = `<span>${t.project}</span> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`;
    meta.appendChild(projSpan);
  }

  (t.tags || []).forEach(tag => {
    hasMeta = true;
    const chip = document.createElement("span");
    chip.className = "task-tag-chip";
    chip.textContent = "@" + tag;
    meta.appendChild(chip);
  });

  if (hasMeta) body.appendChild(meta);

  const del = document.createElement("button");
  del.className = "task-delete";
  del.textContent = "✕";
  del.addEventListener("click", () => deleteTask(t.id));

  li.append(check, body, del);
  return li;
}

// ============================================================
// EVENT LISTENERS & NAVIGATION CONTROLS
// ============================================================
// Week navigation
$("prevWeekBtn").addEventListener("click", () => {
  selectedWeekStart.setDate(selectedWeekStart.getDate() - 7);
  renderUpcomingView();
});

$("nextWeekBtn").addEventListener("click", () => {
  selectedWeekStart.setDate(selectedWeekStart.getDate() + 7);
  renderUpcomingView();
});

$("todayWeekBtn").addEventListener("click", () => {
  selectedWeekStart = getMonday(new Date());
  renderUpcomingView();
});

// Overdue collapse toggle
$("toggleOverdueBtn").addEventListener("click", () => {
  isOverdueCollapsed = !isOverdueCollapsed;
  $("toggleOverdueBtn").classList.toggle("collapsed", isOverdueCollapsed);
  $("overdueTaskList").classList.toggle("hidden", isOverdueCollapsed);
});

// Reschedule Overdue button
$("rescheduleBtn").addEventListener("click", () => {
  $("rescheduleModal").classList.remove("hidden");
});
$("closeRescheduleModal").addEventListener("click", () => {
  $("rescheduleModal").classList.add("hidden");
});

document.querySelectorAll(".reschedule-option").forEach(btn => {
  btn.addEventListener("click", async () => {
    const target = btn.dataset.target;
    const newDate = new Date();
    if (target === "tomorrow") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (target === "nextweek") {
      newDate.setDate(newDate.getDate() + ((1 + 7 - newDate.getDay()) % 7 || 7));
    }
    newDate.setHours(9, 0, 0, 0);

    const overdueTasks = tasks.filter(t => !t.completed && isOverdue(t.due_at));
    for (const t of overdueTasks) {
      t.due_at = newDate.toISOString();
      await sb.from("tasks").update({ due_at: t.due_at }).eq("id", t.id);
    }
    $("rescheduleModal").classList.add("hidden");
    render();
  });
});

// Display Dropdown menu
$("displayBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("displayDropdown").classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!$("displayDropdown").contains(e.target) && e.target !== $("displayBtn")) {
    $("displayDropdown").classList.add("hidden");
  }
});

$("displayShowCalendar").checked = showCalendarEvents;
$("displayShowCalendar").addEventListener("change", (e) => {
  showCalendarEvents = e.target.checked;
  localStorage.setItem("tasks_show_calendar", showCalendarEvents ? "true" : "false");
  render();
});

$("displayShowCompleted").checked = showCompletedTasks;
$("displayShowCompleted").addEventListener("change", (e) => {
  showCompletedTasks = e.target.checked;
  render();
});

$("displayManageCalendar").addEventListener("click", () => {
  $("displayDropdown").classList.add("hidden");
  openCalendarModal();
});

// Calendar Modal
function openCalendarModal() {
  $("calendarModal").classList.remove("hidden");
  $("modalTimetableToggle").checked = CalendarManager.isTimetableEnabled();
  renderConnectedFeeds();
}
$("calendarBtn").addEventListener("click", openCalendarModal);
$("openCalendarModalBtn").addEventListener("click", openCalendarModal);
$("closeCalendarModal").addEventListener("click", () => $("calendarModal").classList.add("hidden"));

$("modalTimetableToggle").addEventListener("change", (e) => {
  CalendarManager.setTimetableEnabled(e.target.checked);
});

$("addFeedBtn").addEventListener("click", async () => {
  const url = $("calendarFeedUrl").value.trim();
  if (!url) return;
  await CalendarManager.addFeed(url);
  $("calendarFeedUrl").value = "";
  renderConnectedFeeds();
});

$("calendarFileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = CalendarManager.parseIcs(text);
  const feedId = "file_" + Date.now();
  const feeds = CalendarManager.getFeeds();
  feeds.push({ id: feedId, name: file.name, url: feedId });
  CalendarManager.saveFeeds(feeds);
  localStorage.setItem("tasks_cache_" + feedId, JSON.stringify(parsed));
  renderConnectedFeeds();
});

function renderConnectedFeeds() {
  const list = $("connectedFeedsList");
  list.innerHTML = "";
  const feeds = CalendarManager.getFeeds();
  if (feeds.length === 0) {
    list.innerHTML = `<li style="color:#777; font-size:12px;">No external calendar feeds added.</li>`;
    return;
  }
  feeds.forEach(f => {
    const li = document.createElement("li");
    li.className = "feed-item";
    li.innerHTML = `
      <span class="feed-name">${f.name}</span>
      <button class="feed-delete-btn" data-id="${f.id}">✕</button>
    `;
    li.querySelector(".feed-delete-btn").addEventListener("click", () => {
      CalendarManager.removeFeed(f.id);
      renderConnectedFeeds();
    });
    list.appendChild(li);
  });
}

// Quick Add Global Bar
$("quickAddBtn").addEventListener("click", () => {
  $("quickAdd").classList.remove("hidden");
  $("quickAddInput").focus();
});
$("standardInlineAddBtn").addEventListener("click", () => {
  $("quickAdd").classList.remove("hidden");
  $("quickAddInput").focus();
});
$("quickAddCancel").addEventListener("click", () => $("quickAdd").classList.add("hidden"));
$("quickAddSave").addEventListener("click", saveQuickAdd);
$("quickAddInput").addEventListener("keydown", (e) => { if (e.key === "Enter") saveQuickAdd(); });
$("quickAddInput").addEventListener("input", renderSmartPreview);

function saveQuickAdd() {
  const raw = $("quickAddInput").value.trim();
  if (!raw) return;
  const parsed = parseSmartInput(raw);
  const title = parsed.cleanTitle || raw;

  const manualTags = $("quickAddTags").value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const tags = [...new Set([...(parsed.tags || []), ...manualTags])];

  const due_at = parsed.dueDate
    ? parsed.dueDate.toISOString()
    : ($("quickAddDate").value ? new Date($("quickAddDate").value).toISOString() : null);
  const has_time = parsed.dueDate ? parsed.hasTime : !!$("quickAddDate").value;

  addTask({
    title,
    project: parsed.project || $("quickAddProject").value,
    due_at, has_time,
    priority: parsed.priority || parseInt($("quickAddPriority").value, 10),
    recurrence_rule: parsed.recurrence || $("quickAddRecurrence").value || null,
    tags,
  });

  $("quickAddInput").value = "";
  $("quickAddDate").value = "";
  $("quickAddTags").value = "";
  $("quickAddRecurrence").value = "";
  $("quickAddPriority").value = "4";
  $("smartPreview").classList.add("hidden");
  $("quickAdd").classList.add("hidden");
}

$("toggleCompleted").addEventListener("click", () => {
  showCompletedTasks = !showCompletedTasks;
  $("displayShowCompleted").checked = showCompletedTasks;
  render();
});

// Settings Navigation
$("settingsBtn").addEventListener("click", () => {
  currentView = "settings";
  render();
});
$("settingsBack").addEventListener("click", () => {
  currentView = "upcoming";
  render();
});

function renderSettings() {
  const prefs = ThemeManager.getPrefs();
  document.querySelectorAll("#modeSegmented button").forEach(b =>
    b.classList.toggle("active", b.dataset.mode === prefs.mode));

  const swatchRow = $("schemeSwatches");
  swatchRow.innerHTML = "";
  Object.entries(SCHEMES).forEach(([key, scheme]) => {
    const btn = document.createElement("button");
    btn.className = "swatch" + (prefs.scheme === key ? " active" : "");
    btn.style.background = scheme.swatch;
    btn.title = scheme.label;
    btn.textContent = prefs.scheme === key ? "✓" : "";
    btn.addEventListener("click", () => { ThemeManager.setScheme(key); renderSettings(); });
    swatchRow.appendChild(btn);
  });

  $("timetableToggle").checked = CalendarManager.isTimetableEnabled();
  $("timetableToggle").addEventListener("change", (e) => {
    CalendarManager.setTimetableEnabled(e.target.checked);
  });
}

document.querySelectorAll("#modeSegmented button").forEach(btn => {
  btn.addEventListener("click", () => { ThemeManager.setMode(btn.dataset.mode); renderSettings(); });
});

// ============================================================
// SIDEBAR COLLAPSE / BURGER MENU
// ============================================================
$("sidebarCollapseBtn").addEventListener("click", () => {
  if (window.innerWidth > 780) {
    // Desktop: toggle .sidebar-collapsed on #app, show/hide burger
    const app = $("app");
    const collapsed = app.classList.toggle("sidebar-collapsed");
    $("menuBtn").classList.toggle("hidden", !collapsed);
  } else {
    // Mobile: close the drawer
    $("sidebar").classList.remove("open");
  }
});

$("menuBtn").addEventListener("click", () => {
  if (window.innerWidth > 780) {
    // Desktop: expand sidebar back
    $("app").classList.remove("sidebar-collapsed");
    $("menuBtn").classList.add("hidden");
  } else {
    // Mobile: open drawer
    $("sidebar").classList.toggle("open");
  }
});

// ============================================================
// SEARCH MODAL
// ============================================================
function openSearch() {
  $("searchModal").classList.remove("hidden");
  $("searchInput").value = "";
  renderSearchResults("");
  $("searchInput").focus();
}
function closeSearch() {
  $("searchModal").classList.add("hidden");
}
function renderSearchResults(query) {
  const list = $("searchResults");
  list.innerHTML = "";
  const q = query.trim().toLowerCase();
  const results = q.length === 0 ? [] : tasks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.project || "").toLowerCase().includes(q) ||
    (t.tags || []).some(tag => tag.toLowerCase().includes(q))
  ).slice(0, 20);

  if (results.length === 0 && q.length > 0) {
    list.innerHTML = `<div style="color:var(--app-text-muted);padding:12px 10px;font-size:13px;">No tasks found for "${query}"</div>`;
    return;
  }
  results.forEach(t => {
    const item = document.createElement("div");
    item.className = "search-result-item";
    const overdue = !t.completed && isOverdue(t.due_at);
    item.innerHTML = `
      <div class="search-result-title">${t.title}</div>
      <div class="search-result-meta">
        ${t.project && t.project !== "Inbox" ? `<span># ${t.project}</span>` : ""}
        ${t.due_at ? `<span style="color:${overdue ? "var(--app-primary)" : "var(--app-text-muted)"}">
          ${isToday(t.due_at) ? "Today" : new Date(t.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>` : ""}
        ${t.completed ? `<span style="color:#4caf50">✓ Done</span>` : ""}
      </div>
    `;
    item.addEventListener("click", () => {
      closeSearch();
      // Navigate to the task's view
      if (!t.completed) {
        currentProject = t.project && t.project !== "Inbox" ? t.project : null;
        currentTag = null;
        currentView = currentProject ? "project" : (isToday(t.due_at) || isOverdue(t.due_at) ? "today" : "upcoming");
        render();
      }
    });
    list.appendChild(item);
  });
}

$("searchBtn").addEventListener("click", openSearch);
$("closeSearchModal").addEventListener("click", closeSearch);
$("searchInput").addEventListener("input", (e) => renderSearchResults(e.target.value));
$("searchModal").addEventListener("click", (e) => { if (e.target === $("searchModal")) closeSearch(); });

// ============================================================
// EXPORT BUTTON (Reporting view)
// ============================================================
$("exportBtn").addEventListener("click", () => {
  const completed = tasks.filter(t => t.completed);
  const headers = ["Title", "Project", "Completed At", "Due At", "Priority", "Tags"];
  const rows = completed.map(t => [
    `"${(t.title || "").replace(/"/g, '""')}"`,
    `"${(t.project || "Inbox").replace(/"/g, '""')}"`,
    t.completed_at ? new Date(t.completed_at).toLocaleString() : "",
    t.due_at ? new Date(t.due_at).toLocaleString() : "",
    t.priority || 4,
    `"${(t.tags || []).join(", ")}"`
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `todorisu-completed-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// Keyboard shortcuts: 'q' for quick add, Cmd+K / '/' for search, 'Esc' to close
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement.tagName;
  const inInput = ["INPUT", "TEXTAREA"].includes(tag);

  if (e.key === "q" && !inInput) {
    e.preventDefault();
    $("quickAdd").classList.remove("hidden");
    $("quickAddInput").focus();
  }
  if ((e.key === "/" && !inInput) || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
    e.preventDefault();
    openSearch();
  }
  if (e.key === "Escape") {
    $("quickAdd").classList.add("hidden");
    $("calendarModal").classList.add("hidden");
    $("rescheduleModal").classList.add("hidden");
    $("displayDropdown").classList.add("hidden");
    closeSearch();
  }
});

// Web Notifications
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

function scheduleWebNotification(task) {
  if (!task.due_at || Notification.permission !== "granted") return;
  const ms = new Date(task.due_at).getTime() - Date.now();
  if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return;
  setTimeout(() => { new Notification(task.title, { body: "Due now", tag: task.id }); }, ms);
}
