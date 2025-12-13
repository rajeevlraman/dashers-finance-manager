// navigation.js - Modern Mobile-App Style Navigation (Module Version)
// Redesigned with smooth sidebar animations and mobile hamburger menu

console.log("NAVIGATION: Module script loaded");

// ------------------------------------------
// Build Modern Navigation HTML
// ------------------------------------------
function buildNavigationHTML() {
  return `
<!-- Hamburger Menu for Mobile -->
<div class="hamburger-menu">
  <div class="hamburger-icon" id="hamburgerBtn">
    <span></span>
    <span></span>
    <span></span>
  </div>
</div>

<!-- Main Sidebar Navigation -->
<nav class="modern-sidebar" id="mainSidebar">
  <!-- Logo Section -->
  <div class="sidebar-header">
    <img src="./assets/icons/icon-152.png" class="sidebar-logo" alt="Budget Tracker Logo">
    <span class="sidebar-title">Budget Tracker</span>
    <button class="close-sidebar" id="closeSidebar" aria-label="Close menu">×</button>
  </div>

  <!-- Navigation Menu -->
  <ul class="sidebar-menu">
    <!-- Finance Section -->
    <li class="menu-section">
      <div class="menu-header" role="button" tabindex="0">
        <span class="menu-icon">💰</span>
        <span class="menu-title">Finance</span>
        <span class="menu-chevron">▾</span>
      </div>
      <ul class="sub-menu">
        <li><a data-view="dashboard" class="menu-item"><span class="item-icon">🏠</span><span class="item-text">Dashboard</span></a></li>
        <li><a data-view="transactions" class="menu-item"><span class="item-icon">💸</span><span class="item-text">Transactions</span></a></li>
        <li><a data-view="budgets" class="menu-item"><span class="item-icon">🎯</span><span class="item-text">Budgets</span></a></li>
        <li><a data-view="accounts" class="menu-item"><span class="item-icon">💳</span><span class="item-text">Accounts</span></a></li>
        <li><a data-view="loans" class="menu-item"><span class="item-icon">🏦</span><span class="item-text">Loans</span></a></li>
        <li><a data-view="categories" class="menu-item"><span class="item-icon">🗂️</span><span class="item-text">Categories</span></a></li>
        <li><a data-view="reports" class="menu-item"><span class="item-icon">📊</span><span class="item-text">Reports</span></a></li>
        <li><a data-view="bills" class="menu-item"><span class="item-icon">🧾</span><span class="item-text">Bills</span></a></li>
        <li><a data-view="calendar" class="menu-item"><span class="item-icon">📅</span><span class="item-text">Calendar</span></a></li>
        <li><a data-view="recurring" class="menu-item"><span class="item-icon">🔁</span><span class="item-text">Recurring</span></a></li>
        <li><a data-view="expenses" class="menu-item"><span class="item-icon">💸</span><span class="item-text">Expenses</span></a></li>
      </ul>
    </li>

    <!-- Properties Section -->
    <li class="menu-section">
      <div class="menu-header" role="button" tabindex="0">
        <span class="menu-icon">🏠</span>
        <span class="menu-title">Properties</span>
        <span class="menu-chevron">▾</span>
      </div>
      <ul class="sub-menu">
        <li><a data-view="properties" class="menu-item"><span class="item-icon">🏠</span><span class="item-text">Properties</span></a></li>
        <li><a data-view="tenants" class="menu-item"><span class="item-icon">👤</span><span class="item-text">Tenants</span></a></li>
        <li><a data-view="maintenance" class="menu-item"><span class="item-icon">🧰</span><span class="item-text">Maintenance</span></a></li>
        <li><a data-view="costbase" class="menu-item"><span class="item-icon">🧱</span><span class="item-text">Cost Base</span></a></li>
      </ul>
    </li>

    <!-- System Section -->
    <li class="menu-section">
      <div class="menu-header" role="button" tabindex="0">
        <span class="menu-icon">⚙️</span>
        <span class="menu-title">System</span>
        <span class="menu-chevron">▾</span>
      </div>
      <ul class="sub-menu">
        <li><a data-view="settings" class="menu-item"><span class="item-icon">⚙️</span><span class="item-text">Settings</span></a></li>
        <li><a data-view="tax" class="menu-item"><span class="item-icon">📘</span><span class="item-text">ATO Reports</span></a></li>
      </ul>
    </li>
  </ul>

  <!-- Active Item Highlight -->
  <div class="active-highlight" id="activeHighlight"></div>
</nav>

<!-- Overlay for Mobile -->
<div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

// ------------------------------------------
// Inject Navigation
// ------------------------------------------
function injectNavigation() {
  console.log("NAVIGATION: Starting injection...");
  
  const splash = document.getElementById("splashScreen");
  if (!splash) {
    console.error("NAV ERROR: splashScreen not found");
    return;
  }

  console.log("NAVIGATION: Found splash screen, injecting...");
  
  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildNavigationHTML();
  
  // Insert navigation after splash screen
  splash.insertAdjacentElement("afterend", wrapper.firstElementChild);
  
  console.log("NAVIGATION: HTML injected, initializing...");
  
  // Initialize after a short delay to ensure DOM is ready
  setTimeout(() => {
    initModernNavigation();
    console.log("NAVIGATION: Modern navigation initialized");
  }, 100);
}

// ------------------------------------------
// Initialize Modern Navigation
// ------------------------------------------
function initModernNavigation() {
  console.log("NAVIGATION: Initializing modern navigation...");
  
  const sidebar = document.getElementById("mainSidebar");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeBtn = document.getElementById("closeSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  
  if (!sidebar) {
    console.error("NAV ERROR: mainSidebar not found!");
    return;
  }
  
  console.log("NAVIGATION: Elements found:", {
    sidebar: !!sidebar,
    hamburgerBtn: !!hamburgerBtn,
    closeBtn: !!closeBtn,
    overlay: !!overlay
  });

  // Initial state - show sidebar on desktop, hide on mobile
  const isMobile = window.innerWidth <= 768;
  console.log("NAVIGATION: Is mobile?", isMobile);
  
  if (isMobile) {
    sidebar.classList.remove("sidebar-open");
    console.log("NAVIGATION: Mobile - sidebar hidden");
  } else {
    sidebar.classList.add("sidebar-open");
    console.log("NAVIGATION: Desktop - sidebar visible");
  }

  // Toggle sidebar on hamburger click
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", (e) => {
      console.log("NAVIGATION: Hamburger clicked");
      e.stopPropagation();
      sidebar.classList.toggle("sidebar-open");
      if (overlay) {
        overlay.classList.toggle("active");
      }
      document.body.style.overflow = sidebar.classList.contains("sidebar-open") ? "hidden" : "";
    });
  }

  // Close sidebar on close button click
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      console.log("NAVIGATION: Close button clicked");
      sidebar.classList.remove("sidebar-open");
      if (overlay) overlay.classList.remove("active");
      document.body.style.overflow = "";
    });
  }

  // Close sidebar on overlay click
  if (overlay) {
    overlay.addEventListener("click", () => {
      console.log("NAVIGATION: Overlay clicked");
      sidebar.classList.remove("sidebar-open");
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    });
  }

  // Toggle sub-menus
  const menuSections = document.querySelectorAll(".menu-section");
  console.log("NAVIGATION: Found", menuSections.length, "menu sections");
  
  menuSections.forEach(section => {
    const header = section.querySelector(".menu-header");
    const subMenu = section.querySelector(".sub-menu");
    const chevron = section.querySelector(".menu-chevron");

    if (header && subMenu && chevron) {
      header.addEventListener("click", (e) => {
        console.log("NAVIGATION: Menu header clicked");
        e.stopPropagation();
        
        if (section.classList.contains("active")) {
          section.classList.remove("active");
          subMenu.style.maxHeight = "0px";
          chevron.style.transform = "rotate(0deg)";
        } else {
          // Close other open sections
          menuSections.forEach(otherSection => {
            if (otherSection !== section && otherSection.classList.contains("active")) {
              otherSection.classList.remove("active");
              const otherSubMenu = otherSection.querySelector(".sub-menu");
              const otherChevron = otherSection.querySelector(".menu-chevron");
              if (otherSubMenu) otherSubMenu.style.maxHeight = "0px";
              if (otherChevron) otherChevron.style.transform = "rotate(0deg)";
            }
          });

          section.classList.add("active");
          subMenu.style.maxHeight = subMenu.scrollHeight + "px";
          chevron.style.transform = "rotate(180deg)";
        }
      });
    }
  });

  // Handle menu item clicks
  const menuItems = document.querySelectorAll(".menu-item");
  console.log("NAVIGATION: Found", menuItems.length, "menu items");
  
  menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const view = item.dataset.view;
      console.log("NAVIGATION: Menu item clicked - view:", view);
      
      if (!view) return;

      // Update active state
      menuItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      // Close sidebar on mobile after selection
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          sidebar.classList.remove("sidebar-open");
          if (overlay) overlay.classList.remove("active");
          document.body.style.overflow = "";
        }, 300);
      }

      // Navigate to view
      window.location.hash = view;
      if (window.loadView) {
        window.loadView(view);
      } else {
        console.warn("NAVIGATION: loadView function not found");
      }
    });
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    const isMobileNow = window.innerWidth <= 768;
    
    if (isMobileNow) {
      if (overlay) overlay.classList.remove("active");
      document.body.style.overflow = "";
    } else {
      sidebar.classList.add("sidebar-open");
    }
  });
}

// ------------------------------------------
// Export functions for use in other modules
// ------------------------------------------
export { injectNavigation, initModernNavigation };

// Auto-inject when the module loads
console.log("NAVIGATION: Module loaded, calling injectNavigation...");
injectNavigation();