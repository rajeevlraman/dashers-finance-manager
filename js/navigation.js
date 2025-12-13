// navigation.js - Modern Mobile-App Style Navigation
// Redesigned with smooth sidebar animations and mobile hamburger menu

console.log("NAVIGATION: Script loaded - Modern Redesign");

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
    <img src="./assets/icons/icon-152.png" class="sidebar-logo">
    <span class="sidebar-title">Budget Tracker</span>
    <button class="close-sidebar" id="closeSidebar">×</button>
  </div>

  <!-- Navigation Menu -->
  <ul class="sidebar-menu">
    <!-- Finance Section -->
    <li class="menu-section">
      <div class="menu-header">
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
      <div class="menu-header">
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
      <div class="menu-header">
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
  const splash = document.getElementById("splashScreen");
  if (!splash) {
    console.error("NAV ERROR: splashScreen not found");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildNavigationHTML();
  splash.insertAdjacentElement("afterend", wrapper.firstElementChild);

  initModernNavigation();
  console.log("NAVIGATION: Modern navigation injected");
}

// ------------------------------------------
// Initialize Modern Navigation
// ------------------------------------------
function initModernNavigation() {
  const sidebar = document.getElementById("mainSidebar");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeBtn = document.getElementById("closeSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuSections = document.querySelectorAll(".menu-section");
  const menuItems = document.querySelectorAll(".menu-item");
  const highlight = document.getElementById("activeHighlight");

  // Initial state - show sidebar on desktop, hide on mobile
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    sidebar.classList.remove("sidebar-open");
  } else {
    sidebar.classList.add("sidebar-open");
  }

  // Toggle sidebar on hamburger click
  hamburgerBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("sidebar-open");
    overlay.classList.toggle("active");
    document.body.style.overflow = sidebar.classList.contains("sidebar-open") ? "hidden" : "";
  });

  // Close sidebar on close button click
  closeBtn?.addEventListener("click", () => {
    sidebar.classList.remove("sidebar-open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  });

  // Close sidebar on overlay click
  overlay?.addEventListener("click", () => {
    sidebar.classList.remove("sidebar-open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  });

  // Toggle sub-menus
  menuSections.forEach(section => {
    const header = section.querySelector(".menu-header");
    const subMenu = section.querySelector(".sub-menu");
    const chevron = section.querySelector(".menu-chevron");

    header?.addEventListener("click", (e) => {
      e.stopPropagation();
      
      // Close other sections if needed
      if (section.classList.contains("active")) {
        section.classList.remove("active");
        subMenu.style.maxHeight = "0px";
        chevron.style.transform = "rotate(0deg)";
      } else {
        // Close other open sections
        menuSections.forEach(otherSection => {
          if (otherSection !== section && otherSection.classList.contains("active")) {
            otherSection.classList.remove("active");
            otherSection.querySelector(".sub-menu").style.maxHeight = "0px";
            otherSection.querySelector(".menu-chevron").style.transform = "rotate(0deg)";
          }
        });

        section.classList.add("active");
        subMenu.style.maxHeight = subMenu.scrollHeight + "px";
        chevron.style.transform = "rotate(180deg)";
      }
    });
  });

  // Handle menu item clicks with highlight animation
  menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const view = item.dataset.view;
      if (!view) return;

      // Update active state
      menuItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      // Move highlight with animation
      if (highlight) {
        const itemRect = item.getBoundingClientRect();
        const sidebarRect = sidebar.getBoundingClientRect();
        
        highlight.style.width = itemRect.width + "px";
        highlight.style.height = itemRect.height + "px";
        highlight.style.left = (itemRect.left - sidebarRect.left) + "px";
        highlight.style.top = (itemRect.top - sidebarRect.top) + "px";
      }

      // Close sidebar on mobile after selection
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          sidebar.classList.remove("sidebar-open");
          overlay.classList.remove("active");
          document.body.style.overflow = "";
        }, 300);
      }

      // Navigate to view
      window.location.hash = view;
      if (window.loadView) {
        window.loadView(view);
      }
    });
  });

  // Initialize active item highlight position
  const activeItem = document.querySelector(".menu-item.active");
  if (activeItem && highlight) {
    setTimeout(() => {
      const itemRect = activeItem.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      
      highlight.style.width = itemRect.width + "px";
      highlight.style.height = itemRect.height + "px";
      highlight.style.left = (itemRect.left - sidebarRect.left) + "px";
      highlight.style.top = (itemRect.top - sidebarRect.top) + "px";
      highlight.style.opacity = "1";
    }, 100);
  }

  // Handle window resize
  window.addEventListener("resize", () => {
    const isMobileNow = window.innerWidth <= 768;
    
    if (isMobileNow) {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    } else {
      sidebar.classList.add("sidebar-open");
    }
    
    // Update highlight position on resize
    const activeItem = document.querySelector(".menu-item.active");
    if (activeItem && highlight) {
      const itemRect = activeItem.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      
      highlight.style.width = itemRect.width + "px";
      highlight.style.height = itemRect.height + "px";
      highlight.style.left = (itemRect.left - sidebarRect.left) + "px";
      highlight.style.top = (itemRect.top - sidebarRect.top) + "px";
    }
  });
}

// Auto-init
document.addEventListener("DOMContentLoaded", injectNavigation);