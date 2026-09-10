// ---------- Supabase setup ----------
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let tasks = [];
let currentView = "today";
let currentProject = null;
let currentTag = null;

const $ = (id) => document.getElementById(id);

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
// DATA
// ============================================================
async function loadTasks() {
  const { data, error } = await sb.from("tasks").select("*").order("created_at", { ascending: true });
  if (!error) tasks = data;
}

async function addTask({ title, project, due_at, has_time, priority, recurrence_rule, tags: taskTags }) {
  const { data, error } = await sb.from("tasks").insert({
    user_id: currentUser.id, title, project: project || "Inbox",
    due_at: due_at || null, has_time: !!has_time, priority: priority || 4,
    recurrence_rule: recurrence_rule || null, tags: taskTags || [],
  }).select();
  if (!error) { tasks.push(data[0]); render(); scheduleWebNotification(data[0]); }
}

async function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t.completed && t.recurrence_rule && t.due_at) {
    // Recurring task: advance to the next occurrence instead of completing.
    const next = nextOccurrence(t.recurrence_rule, t.due_at);
    t.due_at = next.toISOString();
    render();
    await sb.from("tasks").update({ due_at: t.due_at }).eq("id", id);
    return;
  }
  t.completed = !t.completed;
  render();
  await sb.from("tasks").update({ completed: t.completed }).eq("id", id);
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

  // 1. Priority: p1..p4, !1..!4, priority: 1..4, prio: 1..4, !urgent/!high/!med/!low, priority: urgent
  text = text.replace(/(?:^|\s)(?:p|priority:?\s*|prio:?\s*|!)([1-4])(?=\s|$)/gi, (m, n) => {
    priority = parseInt(n, 10);
    return " ";
  });
  text = text.replace(/(?:^|\s)(?:!|priority:?\s*)(urgent|high|med(?:ium)?|low)(?=\s|$)/gi, (m, lvl) => {
    lvl = lvl.toLowerCase();
    priority = (lvl === "urgent" || lvl === "high") ? 1 : (lvl === "low" ? 3 : 2);
    return " ";
  });

  // 2. Tags: @tag or tag:name
  text = text.replace(/(?:^|\s)@([a-zA-Z0-9_-]+)/g, (m, tag) => {
    tags.push(tag.toLowerCase());
    return " ";
  });
  text = text.replace(/(?:^|\s)tags?:([a-zA-Z0-9_-]+)/gi, (m, tag) => {
    tags.push(tag.toLowerCase());
    return " ";
  });

  // 3. Project: #project or project:name / in:name / to:name
  text = text.replace(/(?:^|\s)#([a-zA-Z0-9_-]+)/g, (m, p) => {
    project = p.charAt(0).toUpperCase() + p.slice(1);
    return " ";
  });
  text = text.replace(/(?:^|\s)(?:project|in|to):([a-zA-Z0-9_-]+)/gi, (m, p) => {
    project = p.charAt(0).toUpperCase() + p.slice(1);
    return " ";
  });

  // 4. Recurrence detection
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

  // Check 'every other <day_of_week>'
  const everyOtherDowPattern = /\bevery\s+other\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
  const everyOtherDowMatch = everyOtherDowPattern.exec(text);
  if (everyOtherDowMatch) {
    if (!recurrence) recurrence = "biweekly";
    text = text.replace(everyOtherDowPattern, everyOtherDowMatch[1]);
  }

  // Check 'every N days/weeks/months/years'
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

  // Check 'every <day_of_week>'
  const dowPattern = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
  const dowMatch = dowPattern.exec(text);
  if (dowMatch) {
    if (!recurrence) recurrence = "weekly";
    text = text.replace(dowPattern, dowMatch[1]);
  }

  // Normalize common shorthands in text
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
      let dateResult = null;
      let timeResult = null;
      let fullDateTimeResult = null;

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

      // Clean matched date/time phrases and leading prepositions from text
      results.forEach(r => {
        const escaped = r.text.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const re = new RegExp("(?:\\b(?:around|about|approx|approximately|at|by|due\\s+on|due\\s+by|due|on|@|~)\\s+)?" + escaped + "(?:\\b|\\s|$)", "gi");
        text = text.replace(re, " ");
      });
    }
  }

  // Final cleanup of remaining prepositions and tokens
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

  // Also reflect auto-detected values into form inputs
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
// VIEWS / FILTERING
// ============================================================
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr), now = new Date();
  return d.toDateString() === now.toDateString();
}
function isOverdue(dateStr) {
  return dateStr && new Date(dateStr) < new Date() && !isToday(dateStr);
}

function getProjects() {
  return [...new Set(tasks.map(t => t.project || "Inbox"))].filter(p => p !== "Inbox").sort();
}
function getTags() {
  const all = tasks.flatMap(t => t.tags || []);
  return [...new Set(all)].sort();
}

function visibleTasks() {
  let list = tasks.filter(t => !t.completed);
  if (currentTag) return list.filter(t => (t.tags || []).includes(currentTag));
  if (currentProject) return list.filter(t => (t.project || "Inbox") === currentProject);
  if (currentView === "today") return list.filter(t => isToday(t.due_at) || isOverdue(t.due_at));
  if (currentView === "upcoming") return list.filter(t => t.due_at && !isToday(t.due_at) && !isOverdue(t.due_at));
  if (currentView === "inbox") return list.filter(t => (t.project || "Inbox") === "Inbox");
  return list;
}

document.querySelectorAll(".view-item").forEach(btn => {
  btn.addEventListener("click", () => {
    currentView = btn.dataset.view;
    currentProject = null;
    currentTag = null;
    render();
  });
});

// ============================================================
// RENDER
// ============================================================
function render() {
  document.querySelectorAll(".view-item").forEach(b =>
    b.classList.toggle("active", b.dataset.view === currentView && !currentProject && !currentTag));

  $("viewTitle").textContent = currentTag ? `@${currentTag}` : currentProject || (
    currentView === "today" ? "Today" : currentView === "upcoming" ? "Upcoming" : "Inbox"
  );
  $("viewDate").textContent = currentView === "today" && !currentProject && !currentTag
    ? new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";

  $("countToday").textContent = tasks.filter(t => !t.completed && (isToday(t.due_at) || isOverdue(t.due_at))).length || "";
  $("countInbox").textContent = tasks.filter(t => !t.completed && (t.project || "Inbox") === "Inbox").length || "";

  const projectList = $("projectList");
  projectList.innerHTML = "";
  getProjects().forEach(p => {
    const btn = document.createElement("button");
    btn.className = "project-item" + (currentProject === p ? " active" : "");
    btn.textContent = p;
    btn.addEventListener("click", () => { currentProject = p; currentTag = null; render(); });
    projectList.appendChild(btn);
  });

  const tagList = $("tagList");
  tagList.innerHTML = "";
  getTags().forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "project-item" + (currentTag === tag ? " active" : "");
    btn.textContent = "@" + tag;
    btn.addEventListener("click", () => { currentTag = tag; currentProject = null; render(); });
    tagList.appendChild(btn);
  });

  const qp = $("quickAddProject");
  qp.innerHTML = `<option value="Inbox">Inbox</option>` + getProjects().map(p => `<option value="${p}">${p}</option>`).join("");

  const visible = visibleTasks();
  $("taskList").innerHTML = "";
  $("emptyState").classList.toggle("hidden", visible.length > 0);
  visible.sort((a, b) => (a.due_at || "").localeCompare(b.due_at || "")).forEach(t => $("taskList").appendChild(taskRow(t)));

  const completed = tasks.filter(t => t.completed);
  $("completedList").innerHTML = "";
  completed.forEach(t => $("completedList").appendChild(taskRow(t)));
}

function taskRow(t) {
  const li = document.createElement("li");
  li.className = "task-row" + (t.completed ? " completed" : "");

  const check = document.createElement("button");
  check.className = "task-check" + (t.completed ? " checked" : "");
  check.dataset.priority = t.priority;
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
    span.className = isOverdue(t.due_at) ? "overdue" : "";
    const opts = t.has_time
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" };
    span.textContent = new Date(t.due_at).toLocaleString(undefined, opts);
    meta.appendChild(span);
  }
  if (t.recurrence_rule) {
    hasMeta = true;
    const span = document.createElement("span");
    span.className = "recur-icon";
    span.textContent = "🔁 " + (getRecurLabel(t.recurrence_rule) || "Repeats");
    meta.appendChild(span);
  }
  if (t.project && t.project !== "Inbox") {
    hasMeta = true;
    const tagEl = document.createElement("span");
    tagEl.className = "task-project-tag";
    tagEl.textContent = t.project;
    meta.appendChild(tagEl);
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

$("toggleCompleted").addEventListener("click", () => {
  const hidden = $("completedList").classList.toggle("hidden");
  $("toggleCompleted").textContent = hidden ? "Show completed" : "Hide completed";
});

// ============================================================
// QUICK ADD
// ============================================================
$("quickAddBtn").addEventListener("click", () => {
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

// ============================================================
// WEB NOTIFICATIONS (best-effort; Android wrapper handles real persistence)
// ============================================================
$("notifBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) { alert("Notifications aren't supported in this browser."); return; }
  const perm = await Notification.requestPermission();
  $("notifBtn").textContent = perm === "granted" ? "Notifications on" : "Enable notifications";
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

function scheduleWebNotification(task) {
  if (!task.due_at || Notification.permission !== "granted") return;
  const ms = new Date(task.due_at).getTime() - Date.now();
  if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return;
  setTimeout(() => { new Notification(task.title, { body: "Due now", tag: task.id }); }, ms);
}

// ============================================================
// SETTINGS
// ============================================================
$("settingsBtn").addEventListener("click", () => {
  $("taskView").classList.add("hidden");
  $("settingsView").classList.remove("hidden");
  renderSettings();
});
$("settingsBack").addEventListener("click", () => {
  $("settingsView").classList.add("hidden");
  $("taskView").classList.remove("hidden");
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
}

document.querySelectorAll("#modeSegmented button").forEach(btn => {
  btn.addEventListener("click", () => { ThemeManager.setMode(btn.dataset.mode); renderSettings(); });
});

// ============================================================
// MOBILE MENU
// ============================================================
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
document.querySelectorAll(".view-item, .project-item").forEach(() => {});
$("app").addEventListener("click", (e) => {
  if (window.innerWidth <= 780 && $("sidebar").classList.contains("open") &&
      !$("sidebar").contains(e.target) && e.target !== $("menuBtn")) {
    $("sidebar").classList.remove("open");
  }
});
