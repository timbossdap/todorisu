// ============================================================
// DATA & TASK OPERATIONS
// ============================================================
async function loadTasks() {
  const { data, error } = await sb.from("tasks").select("*").order("created_at", { ascending: true });
  if (!error && data) {
    tasks = data;
    if (typeof scheduleAllWebNotifications === "function") scheduleAllWebNotifications();
  }
}

function showSyncToast(msg) {
  let toast = document.getElementById("syncErrorToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "syncErrorToast";
    toast.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999;background:#dc4c3e;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,0.35);max-width:340px;";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.display = "none"; }, 6000);
}

async function addTask({ title, project, due_at, has_time, priority, recurrence_rule, tags: taskTags }) {
  const tempId = "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const tempTask = {
    id: tempId,
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

  // Render optimistically right away
  tasks.push(tempTask);
  render();

  if (!currentUser) {
    try {
      const { data: sess } = await sb.auth.getSession();
      if (sess?.session?.user) currentUser = sess.session.user;
    } catch (_) {}
  }

  let payload = {
    user_id: currentUser ? currentUser.id : null,
    title,
    project: tempTask.project,
    due_at: tempTask.due_at,
    has_time: tempTask.has_time,
    priority: tempTask.priority,
    recurrence_rule: tempTask.recurrence_rule,
    tags: tempTask.tags,
  };

  let data = null;
  let error = null;
  try {
    ({ data, error } = await sb.from("tasks").insert(payload).select());
    // Retry with core columns if an optional column is missing from the DB schema
    if (error && /column|schema cache/i.test(error.message || "")) {
      const corePayload = {
        user_id: payload.user_id,
        title: payload.title,
        project: payload.project,
        due_at: payload.due_at,
        priority: payload.priority,
      };
      ({ data, error } = await sb.from("tasks").insert(corePayload).select());
    }
  } catch (err) {
    error = err;
  }

  if (!error && data && data[0]) {
    const idx = tasks.findIndex(t => t.id === tempId);
    if (idx !== -1) tasks[idx] = data[0];
    else tasks.push(data[0]);
    render();
    scheduleWebNotification(data[0]);
  } else if (error) {
    console.warn("Supabase insert failed, keeping local task:", error.message || error);
    showSyncToast("Task not saved to cloud: " + (error.message || error));
  }
}

async function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;

  // If completing a recurring task, record a completed occurrence for Reporting,
  // then advance the recurring series to its next occurrence.
  if (!t.completed && t.recurrence_rule) {
    const fromIso = t.due_at || new Date().toISOString();
    const next = nextOccurrence(t.recurrence_rule, fromIso);

    const completionInstance = {
      user_id: currentUser ? currentUser.id : "guest",
      title: t.title,
      notes: t.notes || "",
      project: t.project || "Inbox",
      priority: t.priority || 4,
      has_time: !!t.has_time,
      due_at: t.due_at || new Date().toISOString(),
      tags: t.tags || [],
      recurrence_rule: null,
      completed: true,
      completed_at: new Date().toISOString()
    };

    t.due_at = next.toISOString();
    if (typeof scheduleWebNotification === "function") scheduleWebNotification(t);
    render();

    try {
      let { data, error } = await sb.from("tasks").insert(completionInstance).select();
      if (error) {
        const fallbackInstance = { ...completionInstance };
        delete fallbackInstance.completed_at;
        ({ data } = await sb.from("tasks").insert(fallbackInstance).select());
      }
      if (data && data[0]) {
        tasks.push(data[0]);
      } else {
        tasks.push({ ...completionInstance, id: "task_" + Date.now() });
      }
      await sb.from("tasks").update({ due_at: t.due_at }).eq("id", id);
    } catch (_) {
      tasks.push({ ...completionInstance, id: "task_" + Date.now() });
      await sb.from("tasks").update({ due_at: t.due_at }).eq("id", id);
    }
    render();
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

// Delete only the current occurrence of a repeating task (advances to next occurrence)
async function deleteTaskOccurrence(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  if (t.recurrence_rule) {
    const fromIso = t.due_at || new Date().toISOString();
    const next = nextOccurrence(t.recurrence_rule, fromIso);
    t.due_at = next.toISOString();
    if (typeof scheduleWebNotification === "function") scheduleWebNotification(t);
    render();
    await sb.from("tasks").update({ due_at: t.due_at }).eq("id", id);
  } else {
    await deleteTask(id);
  }
}

// Delete the entire repeating series permanently
async function deleteTaskSeries(id) {
  await deleteTask(id);
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
