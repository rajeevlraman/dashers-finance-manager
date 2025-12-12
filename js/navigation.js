// navigation.js
// Clean Final Version — matches your HTML & ui.js

console.log("NAVIGATION: Script loaded");

// ------------------------------------------
// Build HTML
// ------------------------------------------
function buildNavigationHTML() {
  return `
<nav class="top-nav">
  <div class="nav-left">
    <img src="./assets/icons/icon-152.png" class="nav-logo">
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

// ------------------------------------------
// Inject navigation bar
// ------------------------------------------
function injectNavigation() {
  const splash = document.getElementById("splashScreen");
  if (!splash) {
    console.error("NAV ERROR: splashScreen not found");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildNavigationHTML();
  splash.insertAdjacentElement("afterend", wrapper.firstElementChild);

  initDropdowns();
  initRouting();

  console.log("NAVIGATION: Navigation injected");
}

// ------------------------------------------
// Dropdown functionality
// ------------------------------------------
function initDropdowns() {
  const groups = document.querySelectorAll(".nav-group");
  let openGroup = null;

  groups.forEach(group => {
    const title = group.querySelector(".nav-group-title");

    title.addEventListener("click", e => {
      e.stopPropagation();

      const isOpen = group.classList.contains("open");

      document.querySelectorAll(".nav-group.open")
        .forEach(g => g.classList.remove("open"));

      if (!isOpen) {
        group.classList.add("open");
        openGroup = group;
      }
    });
  });

  // Close on outside click
  document.addEventListener("click", () => {
    document.querySelectorAll(".nav-group.open")
      .forEach(g => g.classList.remove("open"));
  });
}

// ------------------------------------------
// Routing to ui.js loadView()
// ------------------------------------------
function initRouting() {
  document.querySelectorAll(".top-nav a[data-view]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();

      const view = link.dataset.view;

      document.querySelectorAll(".top-nav a").forEach(a =>
        a.classList.remove("active")
      );
      link.classList.add("active");

      window.location.hash = view;

      if (window.loadView) {
        window.loadView(view);
      }
    });
  });
}

// Auto-init
document.addEventListener("DOMContentLoaded", injectNavigation);
