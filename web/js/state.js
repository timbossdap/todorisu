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
let selectedWeekStart = getMonday(new Date(2026, 8, 10)); // Anchor to Sep 10, 2026 (or current date)
let isOverdueCollapsed = false;
let collapsedCalendarDays = {};
let showCalendarEvents = localStorage.getItem("tasks_show_calendar") !== "false";
let showCompletedTasks = false;

function recordRecentView(name) {
  if (!name) return;
  recentViews = [name, ...recentViews.filter(v => v.toLowerCase() !== name.toLowerCase())].slice(0, 5);
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
