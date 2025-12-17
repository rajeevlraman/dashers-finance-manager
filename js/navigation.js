// navigation.js - Complete Navigation with All Pages
console.log("NAVIGATION: Loading complete navigation system");

// Navigation configuration
const mainNavItems = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { id: 'transactions', icon: '💸', label: 'Transactions' },
  { id: 'budgets', icon: '🎯', label: 'Budgets' },
  { id: 'accounts', icon: '💳', label: 'Accounts' },
  { id: 'properties', icon: '🏠', label: 'Properties' },
  { id: 'more', icon: '📂', label: 'More' }
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

function buildNavigationHTML() {
  return `
<nav class="navbar">
  <div class="nav-container">
    <div class="nav-brand">
      <img src="./assets/icons/icon-152.png" class="nav-logo" alt="Budget Tracker">
      <span class="nav-title">Budget Tracker</span>
    </div>

    <ul class="nav-menu">
      ${mainNavItems.map((item, i) => `
        <li class="nav-item ${i === 0 ? 'active' : ''}" data-view="${item.id}">
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
      <button id="closeMoreMenu">×</button>
    </div>
    <div class="more-menu-content">
      ${Object.entries(allViews).map(([group, items]) => `
        <div class="more-section">
          <h4>${group.toUpperCase()}</h4>
          <div class="section-grid">
            ${items.map(v => `
              <a href="#" class="more-item" data-view="${v.id}">
                <span>${v.icon}</span>
                <span>${v.name}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="more-overlay" id="moreOverlay"></div>
</nav>`;
}

// ----------------------------
// Inject Navigation (ROBUST)
// ----------------------------
function injectNavigation() {
  if (document.querySelector('.navbar')) {
    console.log("NAVIGATION: Navbar already exists, skipping inject");
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildNavigationHTML();
  document.body.insertAdjacentElement('afterbegin', wrapper.firstElementChild);

  initNavigation();
  console.log("NAVIGATION: Complete navigation injected");
}

// ----------------------------
// Navigation Behaviour
// ----------------------------
function initNavigation() {
  const navbar = document.querySelector('.navbar');
  const navItems = document.querySelectorAll('.nav-item');
  const indicator = document.querySelector('.indicator');
  const moreMenu = document.getElementById('moreMenu');
  const moreOverlay = document.getElementById('moreOverlay');
  const mobileToggle = document.getElementById('mobileToggle');
  const closeMoreMenu = document.getElementById('closeMoreMenu');

  function closeMore() {
    moreMenu.classList.remove('active');
    moreOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  navItems.forEach((item, index) => {
    item.addEventListener('click', e => {
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
      setActive(item);
      closeMore();
    });
  });

  document.querySelectorAll('.more-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      window.location.hash = item.dataset.view;
      closeMore();
    });
  });

  closeMoreMenu?.addEventListener('click', closeMore);
  moreOverlay?.addEventListener('click', closeMore);
  mobileToggle?.addEventListener('click', () => navbar.classList.toggle('mobile-open'));

  function setActive(active) {
    navItems.forEach(i => i.classList.remove('active'));
    active.classList.add('active');
  }

  function updateIndicator(index) {
    if (!indicator) return;
    const w = navItems[0].offsetWidth;
    indicator.style.width = `${w}px`;
    indicator.style.transform = `translateX(${index * w}px)`;
  }

  function syncWithHash() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    const item = [...navItems].find(n => n.dataset.view === hash);
    if (item) {
      setActive(item);
      updateIndicator([...navItems].indexOf(item));
    }
  }

  window.addEventListener('hashchange', syncWithHash);
  window.addEventListener('resize', syncWithHash);
  syncWithHash();
}

// Auto-inject when DOM ready
document.addEventListener('DOMContentLoaded', injectNavigation);
