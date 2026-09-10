// ---------- Supabase setup ----------
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let tasks = [];
let currentView = "today";
let currentProject = null;

const $ = (id) => document.getElementById(id);

// ---------- Auth ----------
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

  // Hand the session to the native Android wrapper, if present, so it can
  // schedule reminders itself even when this page isn't open.
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

// Restore existing session on load
(async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) onSignedIn(data.session);
})();

// ---------- Data ----------
async function loadTasks() {
  const { data, error } = await sb.from("tasks").select("*").order("position", { ascending: true });
  if (!error) tasks = data;
}

async function addTask({ title, project, due_at, priority }) {
  const { data, error } = await sb.from("tasks").insert({
    user_id: currentUser.id, title, project: project || "Inbox",
    due_at: due_at || null, priority: priority || 4,
  }).select();
  if (!error) { tasks.push(data[0]); render(); scheduleWebNotification(data[0]); }
}

async function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  t.completed = !t.completed;
  render();
  await sb.from("tasks").update({ completed: t.completed }).eq("id", id);
}

async function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  render();
  await sb.from("tasks").delete().eq("id", id);
}

// ---------- Views ----------
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

function visibleTasks() {
  let list = tasks.filter(t => !t.completed);
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
    render();
  });
});

// ---------- Render ----------
function render() {
  document.querySelectorAll(".view-item").forEach(b =>
    b.classList.toggle("active", b.dataset.view === currentView && !currentProject));

  $("viewTitle").textContent = currentProject || (
    currentView === "today" ? "Today" : currentView === "upcoming" ? "Upcoming" : "Inbox"
  );
  $("viewDate").textContent = currentView === "today"
    ? new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";

  $("countToday").textContent = tasks.filter(t => !t.completed && (isToday(t.due_at) || isOverdue(t.due_at))).length || "";
  $("countInbox").textContent = tasks.filter(t => !t.completed && (t.project || "Inbox") === "Inbox").length || "";

  // sidebar projects
  const projectList = $("projectList");
  projectList.innerHTML = "";
  getProjects().forEach(p => {
    const btn = document.createElement("button");
    btn.className = "project-item" + (currentProject === p ? " active" : "");
    btn.textContent = p;
    btn.addEventListener("click", () => { currentProject = p; render(); });
    projectList.appendChild(btn);
  });

  // quick-add project dropdown
  const qp = $("quickAddProject");
  qp.innerHTML = `<option value="Inbox">Inbox</option>` + getProjects().map(p => `<option value="${p}">${p}</option>`).join("");

  // task list
  const visible = visibleTasks();
  $("taskList").innerHTML = "";
  $("emptyState").classList.toggle("hidden", visible.length > 0);
  visible.sort((a, b) => (a.due_at || "").localeCompare(b.due_at || "")).forEach(t => $("taskList").appendChild(taskRow(t)));

  // completed list
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

  if (t.due_at || t.project !== "Inbox") {
    const meta = document.createElement("div");
    meta.className = "task-meta";
    if (t.due_at) {
      const span = document.createElement("span");
      span.className = isOverdue(t.due_at) ? "overdue" : "";
      span.textContent = new Date(t.due_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      meta.appendChild(span);
    }
    if (t.project && t.project !== "Inbox") {
      const tag = document.createElement("span");
      tag.className = "task-project-tag";
      tag.textContent = t.project;
      meta.appendChild(tag);
    }
    body.appendChild(meta);
  }

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

// ---------- Quick add ----------
$("quickAddBtn").addEventListener("click", () => {
  $("quickAdd").classList.remove("hidden");
  $("quickAddInput").focus();
});
$("quickAddCancel").addEventListener("click", () => $("quickAdd").classList.add("hidden"));
$("quickAddSave").addEventListener("click", saveQuickAdd);
$("quickAddInput").addEventListener("keydown", (e) => { if (e.key === "Enter") saveQuickAdd(); });

function saveQuickAdd() {
  const title = $("quickAddInput").value.trim();
  if (!title) return;
  const due = $("quickAddDate").value ? new Date($("quickAddDate").value).toISOString() : null;
  addTask({
    title,
    project: $("quickAddProject").value,
    due_at: due,
    priority: parseInt($("quickAddPriority").value, 10),
  });
  $("quickAddInput").value = "";
  $("quickAddDate").value = "";
  $("quickAdd").classList.add("hidden");
}

// ---------- Web notifications (best-effort; the Android wrapper handles real persistence) ----------
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
  if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return; // only schedule within the next 24h while page context is reasonable
  setTimeout(() => {
    new Notification(task.title, { body: "Due now", tag: task.id });
  }, ms);
}
