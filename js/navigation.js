// navigation.js
// -------------------------------
// Clean Top Navigation Bar (Option A)
// Works with ui.js loadView() routing
// -------------------------------

console.log("NAVIGATION: Script loaded");

// Helper: Creates the navigation HTML
function buildNavigationHTML() {
    return `
<nav class="top-nav">
  <div class="nav-left">
    <img src="./assets/icons/icon-152.png" class="nav-logo" />
    <span class="nav-title">Budget Tracker</span>
  </div>

  <ul class="nav-menu">

    <li class="nav-group">
      <span class="nav-group-title">Finance ▾</span>
      <ul class="nav-dropdown">
        <li><a data-view="dashboard">🏠 Dashboard</a></li>
        <li><a data-view="transactions">💸 Transactions</a></li>
        <li><a data-view="budgets">🎯 Budgets</a></li>
        <li><a data-view="accounts">💳 Accounts</a></li>
        <li><a data-view="categories">🗂️ Categories</a></li>
        <li><a data-view="reports">📊 Reports</a></li>
        <li><a data-view="bills">🧾 Bills</a></li>
        <li><a data-view="calendar">📅 Calendar</a></li>
        <li><a data-view="recurring">🔁 Recurring</a></li>
        <li><a data-view="expenses">💸 Expenses</a></li>
      </ul>
    </li>

    <li class="nav-group">
      <span class="nav-group-title">Properties ▾</span>
      <ul class="nav-dropdown">
        <li><a data-view="properties">🏠 Properties</a></li>
        <li><a data-view="tenants">👤 Tenants</a></li>
        <li><a data-view="maintenance">🧰 Maintenance</a></li>
        <li><a data-view="costbase">🧱 Cost Base</a></li>
      </ul>
    </li>

    <li class="nav-group">
      <span class="nav-group-title">System ▾</span>
      <ul class="nav-dropdown">
        <li><a data-view="settings">⚙️ Settings</a></li>
        <li><a data-view="tax">📘 ATO Reports</a></li>
      </ul>
    </li>

  </ul>
</nav>
    `;
}

initTopNavDropdowns();

function initTopNavDropdowns() {
  const groups = document.querySelectorAll(".top-nav-group");
  let openDropdown = null;

  groups.forEach(group => {
    const btn = group.querySelector(".top-nav-group-btn");
    const menu = group.querySelector(".top-nav-dropdown");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      // If clicking the already open dropdown → close it
      if (openDropdown === menu) {
        menu.classList.remove("open");
        openDropdown = null;
        return;
      }

      // Close previously open dropdown
      if (openDropdown) {
        openDropdown.classList.remove("open");
      }

      // Open new dropdown
      menu.classList.add("open");
      openDropdown = menu;
    });
  });

  // Clicking outside closes all dropdowns
  document.addEventListener("click", () => {
    if (openDropdown) {
      openDropdown.classList.remove("open");
      openDropdown = null;
    }
  });
}





// Inject navigation after splash screen
function injectNavigation() {
    const splash = document.getElementById("splashScreen");
    if (!splash) {
        console.error("NAVIGATION ERROR: splashScreen not found");
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildNavigationHTML();
    splash.insertAdjacentElement("afterend", wrapper.firstElementChild);

    setupDropdowns();
    setupTopNavRouting();
    console.log("NAVIGATION: Navigation injected");
}

// Handle dropdown toggle (desktop + mobile)
function setupDropdowns() {
    document.querySelectorAll(".nav-group-title").forEach(title => {
        title.addEventListener("click", () => {
            const parent = title.parentElement;
            parent.classList.toggle("open");
        });
    });
}

// Route clicks to ui.js loadView()
function setupTopNavRouting() {
    document.querySelectorAll(".top-nav a[data-view]").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const view = link.getAttribute("data-view");

            // highlight active
            document.querySelectorAll(".top-nav a").forEach(a => 
                a.classList.remove("active")
            );
            link.classList.add("active");

            // change URL hash + load view
            window.location.hash = view;
            if (window.loadView) {
                window.loadView(view);
            }
        });
    });
}

// AUTO RUN
document.addEventListener("DOMContentLoaded", injectNavigation);
