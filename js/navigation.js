// navigation.js - Complete Navigation with All Pages
console.log("NAVIGATION: Loading complete navigation system");

// Navigation configuration with ALL pages
const mainNavItems = [
  { id: 'dashboard', icon: '🏠', activeIcon: '🏠', label: 'Dashboard' },
  { id: 'transactions', icon: '💸', activeIcon: '💸', label: 'Transactions' },
  { id: 'budgets', icon: '🎯', activeIcon: '🎯', label: 'Budgets' },
  { id: 'accounts', icon: '💳', activeIcon: '💳', label: 'Accounts' },
  { id: 'properties', icon: '🏠', activeIcon: '🏠', label: 'Properties' },
  { id: 'more', icon: '📂', activeIcon: '📂', label: 'More' }
];

// All available views grouped by category
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

// Build Navigation HTML
function buildNavigationHTML() {
  return `
<nav class="navbar">
  <div class="nav-container">
    <!-- Brand -->
    <div class="nav-brand">
      <img src="./assets/icons/icon-152.png" class="nav-logo" alt="Budget Tracker">
      <span class="nav-title">Budget Tracker</span>
    </div>
    
    <!-- Main Navigation -->
    <ul class="nav-menu">
      ${mainNavItems.map((item, index) => `
        <li class="nav-item ${index === 0 ? 'active' : ''}" data-view="${item.id}">
          <a href="#" class="nav-link">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-active-icon">${item.activeIcon}</span>
            <span class="nav-label">${item.label}</span>
          </a>
        </li>
      `).join('')}
      <div class="indicator"></div>
    </ul>
    
    <!-- Mobile Toggle -->
    <div class="mobile-toggle" id="mobileToggle">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
  
  <!-- More Menu (Dropdown for additional pages) -->
  <div class="more-menu" id="moreMenu">
    <div class="more-menu-header">
      <h3>All Pages</h3>
      <button class="close-more-menu" id="closeMoreMenu">×</button>
    </div>
    
    <div class="more-menu-content">
      <!-- Finance Section -->
      <div class="more-section">
        <h4><span class="section-icon">💰</span> Finance</h4>
        <div class="section-grid">
          ${allViews.finance.map(item => `
            <a href="#" class="more-item" data-view="${item.id}">
              <span class="more-icon">${item.icon}</span>
              <span class="more-label">${item.name}</span>
            </a>
          `).join('')}
        </div>
      </div>
      
      <!-- Properties Section -->
      <div class="more-section">
        <h4><span class="section-icon">🏠</span> Properties</h4>
        <div class="section-grid">
          ${allViews.properties.map(item => `
            <a href="#" class="more-item" data-view="${item.id}">
              <span class="more-icon">${item.icon}</span>
              <span class="more-label">${item.name}</span>
            </a>
          `).join('')}
        </div>
      </div>
      
      <!-- System Section -->
      <div class="more-section">
        <h4><span class="section-icon">⚙️</span> System</h4>
        <div class="section-grid">
          ${allViews.system.map(item => `
            <a href="#" class="more-item" data-view="${item.id}">
              <span class="more-icon">${item.icon}</span>
              <span class="more-label">${item.name}</span>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  </div>
  
  <!-- More Menu Overlay -->
  <div class="more-overlay" id="moreOverlay"></div>
</nav>
  `;
}

// Inject Navigation
function injectNavigation() {
  console.log("NAVIGATION: Injecting complete navigation...");
  
  const splash = document.getElementById("splashScreen");
  if (!splash) {
    console.error("NAV ERROR: splashScreen not found");
    return;
  }
  
  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildNavigationHTML();
  
  // Insert navigation
  splash.insertAdjacentElement("afterend", wrapper.firstElementChild);
  
  // Initialize
  initNavigation();
  console.log("NAVIGATION: Complete navigation injected");
}

// Initialize Navigation
// Initialize Navigation - FIXED with proper menu closing
function initNavigation() {
  const navbar = document.querySelector(".navbar");
  const navItems = document.querySelectorAll(".nav-item");
  const indicator = document.querySelector(".indicator");
  const mobileToggle = document.getElementById("mobileToggle");
  const moreMenu = document.getElementById("moreMenu");
  const moreOverlay = document.getElementById("moreOverlay");
  const closeMoreMenu = document.getElementById("closeMoreMenu");
  const moreItems = document.querySelectorAll(".more-item");
  
  if (!navbar) {
    console.error("NAV ERROR: Navigation elements not found");
    return;
  }
  
  // Set initial indicator position
  updateActiveItem();
  
  // Function to close more menu
  function closeMoreMenuFunc() {
    moreMenu.classList.remove('active');
    moreOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  // Handle main nav item clicks
  navItems.forEach((item, index) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const view = item.dataset.view;
      
      if (view === 'more') {
        // Show more menu
        moreMenu.classList.add('active');
        moreOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        // Navigate to main view
        navigateToView(view, index);
        
        // Close mobile menu on mobile
        if (window.innerWidth <= 768) {
          navbar.classList.remove("mobile-open");
        }
        
        // Also close more menu if it's open
        closeMoreMenuFunc();
      }
    });
  });
  
  // Handle more menu item clicks - FIXED
  moreItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const view = item.dataset.view;
      const mainItem = Array.from(navItems).find(nav => nav.dataset.view === view);
      
      if (mainItem) {
        // If view is in main nav, activate it
        const index = Array.from(navItems).indexOf(mainItem);
        navigateToView(view, index);
      } else {
        // Navigate to view that's not in main nav
        navigateToView(view);
      }
      
      // Close more menu - THIS IS THE FIX
      closeMoreMenuFunc();
      
      // Also close mobile menu if open
      if (window.innerWidth <= 768) {
        navbar.classList.remove("mobile-open");
      }
    });
  });
  
  // Close more menu with close button
  if (closeMoreMenu) {
    closeMoreMenu.addEventListener('click', closeMoreMenuFunc);
  }
  
  // Close more menu with overlay click
  if (moreOverlay) {
    moreOverlay.addEventListener('click', closeMoreMenuFunc);
  }
  
  // Close more menu with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && moreMenu.classList.contains('active')) {
      closeMoreMenuFunc();
    }
  });
  
  // Mobile toggle
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      navbar.classList.toggle("mobile-open");
    });
  }
  
  // Close mobile menu on outside click
  document.addEventListener("click", (e) => {
    if (!navbar.contains(e.target) && !mobileToggle?.contains(e.target)) {
      navbar.classList.remove("mobile-open");
    }
  });
  
  // Handle window resize
  window.addEventListener("resize", () => {
    updateActiveItem();
    
    // Close more menu on mobile when resizing to desktop
    if (window.innerWidth > 768 && moreMenu.classList.contains('active')) {
      closeMoreMenuFunc();
    }
  });
  
  // Handle hash changes (browser back/forward)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const item = Array.from(navItems).find(nav => nav.dataset.view === hash);
      if (item) {
        const index = Array.from(navItems).indexOf(item);
        updateIndicatorPosition(index);
        updateActiveStates(item);
      }
    }
  });
  
  console.log("NAVIGATION: Navigation initialized with fixed menu closing");
}

// Navigate to view
function navigateToView(view, index = null) {
  console.log("NAVIGATION: Navigating to", view);
  
  // Update URL hash
  window.location.hash = view;
  
  // Call loadView if exists
  if (window.loadView) {
    window.loadView(view);
  }
  
  // Update navigation if it's a main nav item
  const navItems = document.querySelectorAll(".nav-item");
  const clickedItem = Array.from(navItems).find(item => item.dataset.view === view);
  
  if (clickedItem && index !== null) {
    updateIndicatorPosition(index);
    updateActiveStates(clickedItem);
  }
}

// Update active states
function updateActiveStates(activeItem) {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => item.classList.remove("active"));
  activeItem.classList.add("active");
}

// Update indicator position
function updateIndicatorPosition(index) {
  const indicator = document.querySelector(".indicator");
  const navItems = document.querySelectorAll(".nav-item");
  
  if (!indicator || navItems.length === 0) return;
  
  const itemWidth = navItems[0].offsetWidth;
  const translateX = index * itemWidth;
  
  indicator.style.transform = `translateX(${translateX}px)`;
  indicator.style.width = `${itemWidth}px`;
}

// Update active item based on current view
function updateActiveItem() {
  const navItems = document.querySelectorAll(".nav-item");
  const hash = window.location.hash.substring(1) || 'dashboard';
  
  let activeIndex = 0;
  let found = false;
  
  navItems.forEach((item, index) => {
    if (item.dataset.view === hash) {
      activeIndex = index;
      found = true;
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
  
  // If not found in main nav, check if it's in more menu
  if (!found) {
    // Make "More" active
    const moreItem = Array.from(navItems).find(item => item.dataset.view === 'more');
    if (moreItem) {
      activeIndex = Array.from(navItems).indexOf(moreItem);
      moreItem.classList.add("active");
    }
  }
  
  updateIndicatorPosition(activeIndex);
}

// Export for module use
export { injectNavigation };

// Auto-inject
injectNavigation();