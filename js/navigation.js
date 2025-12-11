// /js/navigation.js
// CLEAN TOP NAVIGATION WITH GROUPED MENUS

// ------------------------------
// Grouped Navigation Structure
// ------------------------------
const navGroups = [
  {
    title: "Finance",
    icon: "💰",
    items: [
      { icon: "💸", label: "Transactions", view: "transactions" },
      { icon: "🎯", label: "Budgets", view: "budgets" },
      { icon: "💳", label: "Accounts", view: "accounts" }
    ]
  },
  {
    title: "Properties",
    icon: "🏠",
    items: [
      { icon: "🏠", label: "Properties", view: "properties" },
      { icon: "👤", label: "Tenants", view: "tenants" },
      { icon: "🧰", label: "Maintenance", view: "maintenance" }
    ]
  },
  {
    title: "System",
    icon: "⚙️",
    items: [
      { icon: "⚙️", label: "Settings", view: "settings" },
      { icon: "📘", label: "ATO Reports", view: "tax" },
      { icon: "🧱", label: "Cost Base", view: "costbase" }
    ]
  }
];

// ------------------------------
// Initialize Navigation
// ------------------------------
export function initNavigation() {
  console.log("NAV: initNavigation()");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNavigation);
  } else {
    setupNavigation();
  }
}

// ------------------------------
// Build Navigation Bar
// ------------------------------
function setupNavigation() {
  console.log("NAV: Building top navigation bar…");

  const container = document.body;

  // Inject top navigation bar
  const topNavHTML = `
  <header class="top-header">
      <div class="top-left">
        <img src="assets/icons/icon-180.png" class="header-logo" />
        <span class="app-title">Budget Tracker</span>
      </div>

      <nav class="top-nav">
        <a href="#dashboard" class="top-nav-item" data-view="dashboard">🏠 Dashboard</a>

        ${navGroups
          .map(
            (group) => `
          <div class="top-nav-group">
            <button class="top-nav-group-btn">
              ${group.icon} ${group.title} ▼
            </button>
            <div class="top-nav-dropdown">
              ${group.items
                .map(
                  (i) => `
                <a href="#${i.view}" class="dropdown-item" data-view="${i.view}">
                  ${i.icon} ${i.label}
                </a>`
                )
                .join("")}
            </div>
          </div>
        `
          )
          .join("")}
      </nav>

      <div class="top-right">
        <span id="connectionStatus" title="Online">🟢</span>
        <button id="btnExport">Backup</button>
        <button id="btnImport">Restore</button>
      </div>
  </header>
  `;

  // Add to DOM
  container.insertAdjacentHTML("afterbegin", topNavHTML);

  initNavHandlers();
}

// ------------------------------
// Navigation Click Handlers
// ------------------------------
function initNavHandlers() {
  console.log("NAV: click handlers ready");

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;

    const view = link.dataset.view;
    window.location.hash = view;

    // Update active items
    updateActiveNav(view);

    // Notify UI loader (ui.js handles this)
    window.dispatchEvent(new CustomEvent("navigate", { detail: { view } }));
  });
}

// ------------------------------
// Active State Sync
// ------------------------------
export function updateActiveNav(currentView) {
  document.querySelectorAll(".top-nav-item, .dropdown-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === currentView);
  });
}
