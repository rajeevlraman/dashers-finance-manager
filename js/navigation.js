// ================================================================
// navigation.js  —  CLEAN TOP NAVIGATION SYSTEM (FINAL)
// ================================================================

console.log("NAVIGATION: Script loaded");


// ---------------------------------------------------------------
// MENU GROUPS (TOP NAV STRUCTURE)
// ---------------------------------------------------------------
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


// ---------------------------------------------------------------
// INITIALIZER
// ---------------------------------------------------------------
export function initNavigation() {
  console.log("NAVIGATION: initNavigation() running");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNavigation);
  } else {
    setupNavigation();
  }
}


// ---------------------------------------------------------------
// BUILD TOP NAV & INSERT INTO DOM
// ---------------------------------------------------------------
function setupNavigation() {

  setTimeout(() => {
    // Hide old header if exists
    const oldHeader = document.querySelector(".app-header");
    if (oldHeader) oldHeader.style.display = "none";

    const appContainer = ensureAppContainer();
    buildNavigationStructure(appContainer);
    initTopNavDropdowns();
    initNavClicks();

    console.log("NAVIGATION: Ready");
  }, 50);
}


// Ensure .app-container exists
function ensureAppContainer() {
  let appContainer = document.querySelector(".app-container");

  if (!appContainer) {
    appContainer = document.createElement("div");
    appContainer.className = "app-container";

    const mainContent = document.getElementById("mainContent");

    if (mainContent && mainContent.parentNode) {
      mainContent.parentNode.insertBefore(appContainer, mainContent);
    } else {
      document.body.prepend(appContainer);
    }
  }

  return appContainer;
}


// ---------------------------------------------------------------
// BUILD TOP NAV HTML
// ---------------------------------------------------------------
function buildNavigationStructure(container) {
  container.innerHTML = `
    <header class="top-header">
      <div class="top-left">
        <img src="assets/icons/icon-180.png" class="header-logo" />
        <span class="app-title">Budget Tracker</span>
      </div>

      <nav class="top-nav">

        <a href="#dashboard" class="top-nav-item" data-view="dashboard">
          🏠 Dashboard
        </a>

        ${navGroups.map(group => `
          <div class="top-nav-group">
            <button class="top-nav-group-btn">
              ${group.icon} ${group.title} ▼
            </button>
            <div class="top-nav-dropdown">
              ${group.items.map(i => `
                <a href="#${i.view}" class="dropdown-item" data-view="${i.view}">
                  ${i.icon} ${i.label}
                </a>
              `).join("")}
            </div>
          </div>
        `).join("")}

      </nav>

      <div class="top-right">
        <button id="btnExport">Backup</button>
        <button id="btnImport">Restore</button>
      </div>
    </header>
  `;
}


// ---------------------------------------------------------------
// DROPDOWN TOGGLE LOGIC (CLICK TO OPEN/CLOSE)
// ---------------------------------------------------------------
function initTopNavDropdowns() {
  const groups = document.querySelectorAll(".top-nav-group");
  let openDropdown = null;

  groups.forEach(group => {
    const btn = group.querySelector(".top-nav-group-btn");
    const menu = group.querySelector(".top-nav-dropdown");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      // toggle off if clicking same group
      if (openDropdown === menu) {
        menu.classList.remove("open");
        openDropdown = null;
        return;
      }

      // close a previously open dropdown
      if (openDropdown) {
        openDropdown.classList.remove("open");
      }

      // open new dropdown
      menu.classList.add("open");
      openDropdown = menu;
    });
  });

  // clicking outside closes all dropdowns
  document.addEventListener("click", () => {
    if (openDropdown) {
      openDropdown.classList.remove("open");
      openDropdown = null;
    }
  });
}


// ---------------------------------------------------------------
// CLICK HANDLING FOR NAVIGATION
// ---------------------------------------------------------------
function initNavClicks() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;

    e.preventDefault();
    const view = link.getAttribute("data-view");

    if (!view) return;

    window.location.hash = view;

    if (window.loadView) {
      window.loadView(view);
    }
  });
}
