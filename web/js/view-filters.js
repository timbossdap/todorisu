// ============================================================
// FILTERS & LABELS VIEW RENDERER (Matching Todoist Screenshot)
// ============================================================
function renderFiltersView() {
  const assignedCount = tasks.filter(t => !t.completed).length;
  $("countAssigned").textContent = assignedCount > 0 ? assignedCount : "";
  const p1Count = tasks.filter(t => !t.completed && t.priority === 1).length;
  $("countPriority1").textContent = p1Count > 0 ? p1Count : "";

  const container = $("labelsContainer");
  container.innerHTML = "";

  const allTags = [...new Set([...customLabels, ...getTags()])];

  allTags.forEach((tag) => {
    const row = document.createElement("button");
    row.className = "filter-row-item";
    const color = getTagColor(tag);
    const count = tasks.filter(t => !t.completed && (t.tags || []).includes(tag)).length;

    row.innerHTML = `
      <div class="filter-row-left">
        <svg class="filter-tag-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
        <span class="filter-row-label">${escapeHtml(tag)}</span>
      </div>
      <span class="filter-row-count">${count > 0 ? count : ""}</span>
    `;

    row.addEventListener("click", () => {
      switchToView("tag", { tag, label: "@" + tag });
    });

    container.appendChild(row);
  });
}

document.querySelectorAll(".filter-row-item[data-filter]").forEach(item => {
  item.addEventListener("click", () => {
    const filter = item.dataset.filter;
    switchToView("standard", {
      filter,
      label: filter === "priority1" ? "Priority 1" : "Assigned to me",
    });
  });
});

$("toggleMyFiltersBtn").addEventListener("click", (e) => {
  if (e.target.closest("#addFilterBtn")) return;
  isMyFiltersCollapsed = !isMyFiltersCollapsed;
  $("myFiltersChevron").classList.toggle("collapsed", isMyFiltersCollapsed);
  $("myFiltersContainer").classList.toggle("hidden", isMyFiltersCollapsed);
});

$("toggleLabelsBtn").addEventListener("click", (e) => {
  if (e.target.closest("#addLabelBtn")) return;
  isLabelsCollapsed = !isLabelsCollapsed;
  $("labelsChevron").classList.toggle("collapsed", isLabelsCollapsed);
  $("labelsContainer").classList.toggle("hidden", isLabelsCollapsed);
});

$("addFilterBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  const name = prompt("Filter name (e.g. Priority 2, Next 7 days):");
  if (name) alert(`Filter "${name}" saved to favorites.`);
});

$("addLabelBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  const label = prompt("Enter new label name:");
  if (label && label.trim()) {
    const clean = label.trim().replace(/^@/, "");
    if (!customLabels.includes(clean)) {
      customLabels.push(clean);
      renderFiltersView();
    }
  }
});
