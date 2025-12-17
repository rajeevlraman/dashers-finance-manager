// navigation.js - Complete Navigation with All Pages
console.log("NAVIGATION: Loading complete navigation system");

// ===============================
// Navigation configuration
// ===============================
const mainNavItems = [
  { id: 'dashboard', icon: '🏠', activeIcon: '🏠', label: 'Dashboard' },
  { id: 'transactions', icon: '💸', activeIcon: '💸', label: 'Transactions' },
  { id: 'budgets', icon: '🎯', activeIcon: '🎯', label: 'Budgets' },
  { id: 'accounts', icon: '💳', activeIcon: '💳', label: 'Accounts' },
  { id: 'properties', icon: '🏠', activeIcon: '🏠', label: 'Properties' },
  { id: 'more', icon: '📂', activeIcon: '📂', label: 'More' }
];

const allViews = {
  finance: [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'transactions', name: 'Transactions', icon: '💸' },
    { id: 'budgets', name: 'Budgets', icon: '🎯' },
    { id: 'accounts', name: 'Accounts', icon: '💳' },
    { id: 'loans', name: 'Loans', icon: '🏦' },
    { id: 'categories', name: 'Categories', icon: '🗂️' },
    { id: 'reports', name: 'Reports', icon: '📊' },
    { id: 'bills', name: 'Bills', icon: '🧾' },
    { id: 'calendar', name: 'Calendar', icon: '📅' },
    { id: 'recurring', name: 'Recurring', icon: '🔁' },
    { id: 'expenses', name: 'Expenses', icon: '💸' }
  ],
  properties: [
    { id: 'properties', name: 'Properties', icon: '🏠' },
    { id: 'tenants', name: 'Tenants', icon: '👤' },
    { id: 'maintenance', name: 'Maintenance', icon: '🧰' },
    { id: 'costbase', name: 'Cost Base', icon: '🧱' }
  ],
  system: [
    { id: 'settings', name: 'Settings', icon: '⚙️' },
    { id: 'tax', name: 'ATO Reports', icon: '📘' }
  ]
};

// ===============================
// Build Navigation HTML
// ===============================
function buildNavigationHTML() {
  return `
<nav class="navbar">
  <div class="nav-container">

    <div class="nav-brand">
      <img src="./assets/icons/icon-152.png" class="nav-logo" alt="Budget Tracker">
      <span class="nav-title">Budget Tracker</span>
    </div>

    <ul class="nav-menu">
      ${mainNavItems.map((item, index) => `
        <li class="nav-item ${index === 0 ? 'active' : ''}" data-view="${item.id}">
          <a href="#" class="nav-link">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
          </a>
        </li>
      `).join('')}
      <div class="indicator"></div>
    </ul>

    <div class="mobile-toggle" id="mobileToggle">
      <span></span><span></span><span></span>
    </div>
  </div>

  <div class="more-menu" id="moreMenu">
    <div class="more-menu-header">
      <h3>All Pages</h3>
      <button class="close-more-menu" id="closeMoreMenu">×</button>
    </div>

    <div class="more-menu-content">
      ${Object.entries(allViews).map(([group, items]) => `
        <div class="more-section">
          <h4>${group.toUpperCase()}</h4>
          <div class="section-grid">
            ${items.map(item => `
              <a href="#" class="more-item" data-view="${item.id}">
                <span class="more-icon">${item.icon}</span>
                <span class="more-label">${item.name}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="more-overlay" id="moreOverlay"></div>
</nav>
  `;
}

// ===============================
// Inject Navigation (FIXED)
// ===============================
function injectNavigation() {
  if (document.querySelector('.navbar')) {
    console.log("NAVIGATION: Navbar already exists, skipping injection");
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildNavigationHTML();

  // ✅ FIX: inject into BODY, not splash screen
  document.body.insertAdjacentElement('afterbegin', wrapper.firstElementChild);

  initNavigation();
  console.log("NAVIGATION: Complete navigation injected");
}

// ===============================
// Initialise Navigation Behaviour
// ===============================
function initNavigation() {
  const navbar = document.querySelector(".navbar");
  const navItems = document.querySelectorAll(".nav-item");
  const indicator = document.querySelector(".indicator");
  const mobileToggle = document.getElementById("mobileToggle");
  const moreMenu = document.getElementById("moreMenu");
  const moreOverlay = document.getElementById("moreOverlay");
  const closeMoreMenu = document.getElementById("closeMoreMenu");

  if (!navbar) {
    console.error("NAV ERROR: Navbar not found");
    return;
  }

  function closeMoreMenuFunc() {
    moreMenu.classList.remove('active');
    moreOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  navItems.forEach((item, index) => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const view = item.dataset.view;

      if (view === 'more') {
        moreMenu.classList.add('active');
        moreOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
      }

      window.location.hash = view;
      updateIndicator(index);
      updateActiveStates(item);
      closeMoreMenuFunc();
    });
  });

  document.querySelectorAll(".more-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      window.location.hash = item.dataset.view;
      closeMoreMenuFunc();
    });
  });

  closeMoreMenu?.addEventListener("click", closeMoreMenuFunc);
  moreOverlay?.addEventListener("click", closeMoreMenuFunc);

  mobileToggle?.addEventListener("click", () => {
    navbar.classList.toggle("mobile-open");
  });

  function updateActiveStates(activeItem) {
    navItems.forEach(i => i.classList.remove("active"));
    activeItem.classList.add("active");
  }

  function updateIndicator(index) {
    if (!indicator || !navItems.length) return;
    const w = navItems[0].offsetWidth;
    indicator.style.width = `${w}px`;
    indicator.style.transform = `translateX(${index * w}px)`;
  }

  function syncWithHash() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    const item = [...navItems].find(n => n.dataset.view === hash);
    if (item) {
      updateActiveStates(item);
      updateIndicator([...navItems].indexOf(item));
    }
  }

  window.addEventListener("hashchange", syncWithHash);
  window.addEventListener("resize", syncWithHash);
  syncWithHash();

  console.log("NAVIGATION: Navigation initialized");
}

// ✅ FIX: wait for DOM
document.addEventListener("DOMContentLoaded", injectNavigation);
