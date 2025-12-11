// /js/navigation.js

// Navigation items data
// GROUPED TOP NAV
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


// Initialize navigation system
export function initNavigation() {
  console.log('Initializing navigation...');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavigation);
  } else {
    setupNavigation();
  }
}

function setupNavigation() {
  // Wait for DOM to be fully ready
  setTimeout(() => {
    // Hide old navigation
    const oldNav = document.querySelector('nav:not(.bottom-nav)');
    if (oldNav) {
      oldNav.style.display = 'none';
    }
    
  // Create app container if it doesn't exist
  let appContainer = document.querySelector('.app-container');
  if (!appContainer) {
    appContainer = document.createElement('div');
    appContainer.className = 'app-container';
    appContainer.style.display = 'none'; // Hidden until login
    
    // Insert after login screen
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen && loginScreen.parentNode) {
      loginScreen.parentNode.insertBefore(appContainer, loginScreen.nextSibling);
    }
  }
  
  // Build navigation structure
  buildNavigationStructure(appContainer);
  
  // Initialize navigation functionality
  initNavigationFunctionality();
  
  // Populate navigation
  populateSidebarNav();
  populateBottomNav();
  
  console.log('Navigation setup complete');

  }, 100);
}

function buildNavigationStructure(container) {
  container.innerHTML = `
    <!-- Desktop/Tablet Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <img src="assets/icons/icon-192.png" alt="Logo" width="32" height="32">
          <span>Budget Tracker</span>
        </div>
        <button class="close-sidebar">×</button>
      </div>
      <nav class="nav-menu">
        <!-- Navigation items will be populated by JavaScript -->
<header class="top-header">
  <div class="top-left">
    <img src="assets/icons/icon-180.png" class="header-logo" />
    <span class="app-title">Budget Tracker</span>
  </div>

  <nav class="top-nav">
    <a href="#dashboard" class="top-nav-item" data-view="dashboard">🏠 Dashboard</a>

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
          `).join('')}
        </div>
      </div>
    `).join('')}
  </nav>

  <div class="top-right">
    <button id="btnExport">Backup</button>
    <button id="btnImport">Restore</button>
  </div>
</header>

<main id="mainContent"></main>

  `;
}

function populateSidebarNav() {
  const navMenu = document.querySelector('.nav-menu');
  if (!navMenu) return;
  
  navMenu.innerHTML = navItems.map(item => `
    <a href="#${item.view}" class="nav-item" data-view="${item.view}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('');
}

function populateBottomNav() {
  const bottomNav = document.querySelector('.bottom-nav');
  if (!bottomNav) return;
  
  bottomNav.innerHTML = bottomNavItems.map(item => `
    <a href="#${item.view}" class="bottom-nav-item" data-view="${item.view}">
      <span class="bottom-nav-icon">${item.icon}</span>
      <span class="bottom-nav-label">${item.label}</span>
    </a>
  `).join('');
}

function initNavigationFunctionality() {
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  const closeSidebar = document.querySelector('.close-sidebar');
  
  // Toggle sidebar on hamburger click
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', toggleSidebar);
  }
  
  // Close sidebar on overlay click
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebarHandler);
  }
  
  // Close sidebar on close button click
  if (closeSidebar) {
    closeSidebar.addEventListener('click', closeSidebarHandler);
  }
  
  // Handle navigation clicks
  document.addEventListener('click', handleNavigationClick);
  
  // Handle window resize
  window.addEventListener('resize', handleResize);
  
  // Initial resize handler
  handleResize();
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  
  if (sidebar && hamburgerBtn && sidebarOverlay) {
    const isActive = sidebar.classList.toggle('active');
    hamburgerBtn.classList.toggle('active', isActive);
    sidebarOverlay.classList.toggle('active', isActive);
    document.body.style.overflow = isActive ? 'hidden' : '';
  }
}

function closeSidebarHandler() {
  const sidebar = document.querySelector('.sidebar');
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  
  if (sidebar && hamburgerBtn && sidebarOverlay) {
    sidebar.classList.remove('active');
    hamburgerBtn.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function handleNavigationClick(e) {
  // Close sidebar on navigation click (mobile/tablet)
  if (window.innerWidth < 1024 && e.target.closest('.nav-item')) {
    closeSidebarHandler();
  }
  
  // Handle bottom nav clicks
  if (e.target.closest('.bottom-nav-item')) {
    const item = e.target.closest('.bottom-nav-item');
    const view = item.getAttribute('data-view');
    updateActiveNav(view);
  }
  
  // Handle sidebar nav clicks
  if (e.target.closest('.nav-item')) {
    const item = e.target.closest('.nav-item');
    const view = item.getAttribute('data-view');
    updateActiveNav(view);
  }
}

function handleResize() {
  // Close sidebar on desktop
  if (window.innerWidth >= 1024) {
    closeSidebarHandler();
  }
}

// Update active navigation item
export function updateActiveNav(currentView) {
  console.log('Updating active nav to:', currentView);
  
  // Update sidebar items
  document.querySelectorAll('.nav-item').forEach(item => {
    const itemView = item.getAttribute('data-view');
    item.classList.toggle('active', itemView === currentView);
  });
  
  // Update bottom nav items
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    const itemView = item.getAttribute('data-view');
    item.classList.toggle('active', itemView === currentView);
  });
  
  // Update header title
  const currentItem = navItems.find(item => item.view === currentView);
  const headerTitle = document.querySelector('.header-title');
  if (headerTitle && currentItem) {
    headerTitle.textContent = currentItem.label;
  }
}

// Show/hide main app container
export function showAppContainer(show = true) {
  const appContainer = document.querySelector('.app-container');
  const loginScreen = document.getElementById('loginScreen');
  
  if (appContainer) {
    appContainer.style.display = show ? 'grid' : 'none';
  }
  
  if (loginScreen) {
    loginScreen.style.display = show ? 'none' : 'flex';
  }
  
  // Update active nav based on hash
  if (show && window.location.hash) {
    const view = window.location.hash.replace('#', '');
    updateActiveNav(view);
  }
}

// Initialize search functionality
export function initSearch() {
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          // Implement search functionality
          console.log('Searching for:', query);
          // You can dispatch a custom event or call a search function
          window.dispatchEvent(new CustomEvent('search', { detail: { query } }));
        }
      }
    });
  }
}