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

