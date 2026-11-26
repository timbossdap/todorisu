// ---------- Supabase setup ----------
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let tasks = [];
let currentView = "upcoming"; // Default to Upcoming view like the screenshot!
let currentProject = null;
let currentTag = null;
let currentFilter = null;
let recentViews = ["Upcoming", "Inbox", "Today"];
let customLabels = ["read", "Exams/Tests", "Homework", "Hobby"];
let isMyFiltersCollapsed = false;
let isLabelsCollapsed = false;
let editingTaskId = null;
let selectedWeekStart = getMonday(new Date());
let isOverdueCollapsed = false;
let collapsedCalendarDays = {};
let showCalendarEvents = localStorage.getItem("tasks_show_calendar") !== "false";
let showCompletedTasks = false;

function recordRecentView(name) {
  if (!name) return;
  recentViews = [name, ...recentViews.filter(v => v.toLowerCase() !== name.toLowerCase())].slice(0, 5);
}

/**
 * Switch the active view/project/tag/filter and re-render.
 */
function switchToView(view, { project = null, tag = null, filter = null, label = null } = {}) {
  currentView = view;
  currentProject = project;
  currentTag = tag;
  currentFilter = filter;
  recordRecentView(label || (view.charAt(0).toUpperCase() + view.slice(1)));
  render();
}

const $ = (id) => document.getElementById(id);

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
