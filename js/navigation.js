// /js/navigation.js
// DEBUG-SAFE TOP NAV

console.log("NAVIGATION: Script loaded");

// ------------------------------
// NAV GROUPS
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
// INIT
// ------------------------------
export function initNavigation() {
  console.log("NAVIGATION: initNavigation called");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildNav);
  } else {
    buildNav();
  }
}

// ------------------------------
// BUILD TOP NAV
// ------------------------------
function buildNav() {
  console.log("NAVIGATION: buildNav executing");

  const navHTML = `
    <header id="topNavBar" style="
      width: 100%;
      background: #fff;
      border-bottom: 1px solid #ddd;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 9999;
      font-family: sans-serif;
    ">
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="assets/icons/icon-180.png" style="width:28px;height:28px;">
        <span style="font-weight:600;font-size:1rem;">Budget Tracker</span>
      </div>

      <nav style="display:flex;gap:12px;align-items:center;">
        <a data-view="dashboard" href="#dashboard"
           style="padding:6px 10px;border-radius:6px;text-decoration:none;color:#333;font-weight:500;">
           🏠 Dashboard
        </a>

        ${navGroups
          .map(
            (group) => `
            <div class="topGroup" style="position:relative;">
              <button class="groupBtn" style="
                background:none;border:none;font-weight:500;
                padding:6px 10px;cursor:pointer;color:#333;
              ">
                ${group.icon} ${group.title} ▼
              </button>

              <div class="groupMenu" style="
                position:absolute;top:34px;left:0;display:none;
                background:white;border:1px solid #ccc;
                border-radius:6px;min-width:160px;
                box-shadow:0 4px 12px rgba(0,0,0,0.1);
              ">
                ${group.items
                  .map(
                    (i) => `
                  <a data-view="${i.view}" href="#${i.view}"
                    style="display:block;padding:8px 12px;
                           text-decoration:none;color:#333;">
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

      <div style="display:flex;gap:10px;">
        <button id="btnExport">Backup</button>
        <button id="btnImport">Restore</button>
      </div>
    </header>
  `;

  // INSERT AT TOP OF BODY (guaranteed)
  document.body.insertAdjacentHTML("afterbegin", navHTML);
  console.log("NAVIGATION: inserted nav bar");

  initNavHandlers();
}

// ------------------------------
// HANDLERS
// ------------------------------
function initNavHandlers() {
  console.log("NAVIGATION: installing handlers");

  // Hover dropdowns
  document.querySelectorAll(".topGroup").forEach((group) => {
    const btn = group.querySelector(".groupBtn");
    const menu = group.querySelector(".groupMenu");

    btn.addEventListener("mouseenter", () => (menu.style.display = "block"));
    btn.addEventListener("mouseleave", () =>
      setTimeout(() => (menu.style.display = "none"), 300)
    );

    menu.addEventListener("mouseenter", () => (menu.style.display = "block"));
    menu.addEventListener("mouseleave", () => (menu.style.display = "none"));
  });

  // Active sync
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;

    const view = link.dataset.view;
    updateActiveNav(view);

    window.location.hash = view;
    window.dispatchEvent(new CustomEvent("navigate", { detail: { view } }));
  });
}

// ------------------------------
// Highlight active item
// ------------------------------
export function updateActiveNav(view) {
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.style.background =
      el.dataset.view === view ? "#e3f0ff" : "transparent";
  });
}
