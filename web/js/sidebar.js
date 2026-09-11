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

