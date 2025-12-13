// navigation.js - Modern Indicator Navigation
console.log("NAVIGATION: Loading indicator navigation");

// Navigation configuration
const navItems = [
  { id: 'dashboard', icon: '🏠', activeIcon: '🏠', label: 'Dashboard' },
  { id: 'transactions', icon: '💸', activeIcon: '💸', label: 'Transactions' },
  { id: 'budgets', icon: '🎯', activeIcon: '🎯', label: 'Budgets' },
  { id: 'accounts', icon: '💳', activeIcon: '💳', label: 'Accounts' },
  { id: 'properties', icon: '🏠', activeIcon: '🏠', label: 'Properties' },
  { id: 'settings', icon: '⚙️', activeIcon: '⚙️', label: 'Settings' }
];

// Build Navigation HTML
function buildNavigationHTML() {
  return `
<nav class="navbar">
  <div class="nav-container">
    <div class="nav-brand">
      <img src="./assets/icons/icon-152.png" class="nav-logo">
      <span class="nav-title">Budget Tracker</span>
    </div>
    
    <ul class="nav-menu">
      ${navItems.map((item, index) => `
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
</nav>
  `;
}

// Inject Navigation
function injectNavigation() {
  console.log("NAVIGATION: Injecting navigation...");
  
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
  console.log("NAVIGATION: Navigation injected successfully");
}

// Initialize Navigation
function initNavigation() {
  const navbar = document.querySelector(".navbar");
  const navItems = document.querySelectorAll(".nav-item");
  const indicator = document.querySelector(".indicator");
  const mobileToggle = document.getElementById("mobileToggle");
  
  if (!navbar || !indicator) {
    console.error("NAV ERROR: Navigation elements not found");
    return;
  }
  
  // Set initial indicator position
  const activeItem = document.querySelector(".nav-item.active");
  if (activeItem) {
    const index = Array.from(navItems).indexOf(activeItem);
    updateIndicatorPosition(index);
  }
  
  // Handle item clicks
  navItems.forEach((item, index) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      // Remove active class from all items
      navItems.forEach(i => i.classList.remove("active"));
      
      // Add active class to clicked item
      item.classList.add("active");
      
      // Update indicator position
      updateIndicatorPosition(index);
      
      // Get view and navigate
      const view = item.dataset.view;
      if (view) {
        window.location.hash = view;
        if (window.loadView) {
          window.loadView(view);
        }
      }
      
      // Close mobile menu on mobile
      if (window.innerWidth <= 768) {
        navbar.classList.remove("mobile-open");
      }
    });
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
    const activeItem = document.querySelector(".nav-item.active");
    if (activeItem) {
      const index = Array.from(navItems).indexOf(activeItem);
      updateIndicatorPosition(index);
    }
  });
  
  console.log("NAVIGATION: Navigation initialized");
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

// Export for module use
export { injectNavigation };

// Auto-inject
injectNavigation();