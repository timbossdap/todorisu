// ============================================================
// DATA & TASK OPERATIONS
// ============================================================
async function loadTasks() {
  const { data, error } = await sb.from("tasks").select("*").order("created_at", { ascending: true });
  if (!error && data) {
    tasks = data;
    if (typeof scheduleAllWebNotifications === "function") scheduleAllWebNotifications();
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
  if (typeof scheduleWebNotification === "function") scheduleWebNotification(t);
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
  if (typeof cancelWebNotification === "function") cancelWebNotification(id);
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
