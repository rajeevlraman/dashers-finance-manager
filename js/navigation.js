// /js/navigation.js
// ------------------------------------------------------
// CLEAN TOP NAVIGATION (Dashboard + Dropdown Groups)
// ------------------------------------------------------

// NAVIGATION GROUPS FOR DROPDOWN MENUS
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

// ------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------
export function initNavigation() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNavigation);
  } else {
    setupNavigation();
  }
}

function setupNavigation() {
  console.log("🚀 Navigation initialized");

  const appContainer = ensureAppContainer();

  buildTopNavigation(appContainer);
  attachTopNavEvents();
}

// ------------------------------------------------------
// CREATE APP WRAPPER + MAIN CONTENT AREA
// ------------------------------------------------------
function ensureAppContainer() {
  let container = document.querySelector(".app-container");

  if (!container) {
    container = document.createElement("div");
    container.className = "app-container";

    const main = document.getElementById("mainContent");
    if (main) {
      main.parentNode.insertBefore(container, main);
      main.remove(); // Remove old mainContent
    }

    container.innerHTML = `<main id="mainContent"></main>`;
  }

  return container;
}

// ------------------------------------------------------
// BUILD TOP HEADER NAVIGATION
// ------------------------------------------------------
function buildTopNavigation(container) {
  container.insertAdjacentHTML(
    "afterbegin",
    `
<header class="top-header">
  <div class="top-left">
    <img src="./assets/icons/icon-180.png" class="header-logo" />
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
    <button id="btnExport">Backup</button>
    <button id="btnImport">Restore</button>
  </div>
</header>
`
  );
}

// ------------------------------------------------------
// TOP NAV EVENTS
// ------------------------------------------------------
function attachTopNavEvents() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;

    e.preventDefault();

    const view = link.dataset.view;
    window.location.hash = view;

    updateActiveNav(view);

    if (window.loadView) {
      window.loadView(view);
    }
  });

  // Initialize proper state
  const view = window.location.hash.replace("#", "") || "dashboard";
  updateActiveNav(view);
}

// ------------------------------------------------------
// UPDATE ACTIVE LINKS
// ------------------------------------------------------
export function updateActiveNav(view) {
  document.querySelectorAll(".top-nav-item, .dropdown-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === view);
  });
}
