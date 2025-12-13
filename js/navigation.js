// navigation.js - DEBUGGED VERSION
console.log("🚀 NAVIGATION: Debug version loading");

// Build Navigation HTML
function buildNavigationHTML() {
  console.log("🔧 Building navigation HTML...");
  return `
<!-- Hamburger Menu -->
<div class="hamburger-menu">
  <div class="hamburger-icon" id="hamburgerBtn">
    <span></span>
    <span></span>
    <span></span>
  </div>
</div>

<!-- Sidebar Navigation -->
<nav class="modern-sidebar" id="mainSidebar">
  <div class="sidebar-header">
    <img src="./assets/icons/icon-152.png" class="sidebar-logo" alt="Logo">
    <span class="sidebar-title">Budget Tracker</span>
    <button class="close-sidebar" id="closeSidebar">×</button>
  </div>
  
  <div class="sidebar-content">
    <div class="menu-section">
      <div class="menu-header">
        <span class="menu-icon">💰</span>
        <span class="menu-title">Finance</span>
        <span class="menu-chevron">▾</span>
      </div>
      <div class="menu-items">
        <a data-view="dashboard" class="menu-item"><span class="item-icon">🏠</span><span class="item-text">Dashboard</span></a>
        <a data-view="transactions" class="menu-item"><span class="item-icon">💸</span><span class="item-text">Transactions</span></a>
        <a data-view="budgets" class="menu-item"><span class="item-icon">🎯</span><span class="item-text">Budgets</span></a>
        <a data-view="accounts" class="menu-item"><span class="item-icon">💳</span><span class="item-text">Accounts</span></a>
        <a data-view="loans" class="menu-item"><span class="item-icon">🏦</span><span class="item-text">Loans</span></a>
      </div>
    </div>
  </div>
</nav>

<!-- Overlay -->
<div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

// Inject Navigation
function injectNavigation() {
  console.log("🎯 NAVIGATION: Starting injection...");
  
  const splash = document.getElementById("splashScreen");
  if (!splash) {
    console.error("❌ NAV ERROR: splashScreen not found!");
    return;
  }
  
  console.log("✅ Found splash screen, injecting HTML...");
  
  // Create wrapper and inject HTML
  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildNavigationHTML();
  
  // Insert ALL elements from wrapper after splash
  while (wrapper.firstChild) {
    splash.insertAdjacentElement("afterend", wrapper.firstChild);
  }
  
  console.log("✅ HTML injected, checking elements...");
  
  // Debug: Check if elements exist
  setTimeout(() => {
    const sidebar = document.getElementById("mainSidebar");
    const hamburger = document.querySelector(".hamburger-menu");
    
    console.log("🔍 DEBUG CHECK:");
    console.log("  - Sidebar found:", !!sidebar);
    console.log("  - Hamburger found:", !!hamburger);
    console.log("  - Sidebar in DOM:", document.contains(sidebar));
    
    if (sidebar) {
      console.log("  - Sidebar HTML:", sidebar.outerHTML.substring(0, 200));
      console.log("  - Sidebar parent:", sidebar.parentElement?.tagName);
      
      // Force sidebar to be visible for debugging
      sidebar.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 280px !important;
        height: 100vh !important;
        background: #1a1f36 !important;
        color: white !important;
        z-index: 10000 !important;
        padding: 20px !important;
        display: block !important;
        visibility: visible !important;
      `;
    }
  }, 500);
  
  // Initialize functionality
  initNavigation();
}

// Initialize Navigation
function initNavigation() {
  console.log("⚙️ Initializing navigation...");
  
  const sidebar = document.getElementById("mainSidebar");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeBtn = document.getElementById("closeSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  
  console.log("Elements found:", {
    sidebar: !!sidebar,
    hamburgerBtn: !!hamburgerBtn,
    closeBtn: !!closeBtn,
    overlay: !!overlay
  });
  
  if (!sidebar) {
    console.error("❌ CRITICAL: Sidebar not found! Creating emergency sidebar...");
    createEmergencySidebar();
    return;
  }
  
  // Show sidebar on desktop, hide on mobile
  if (window.innerWidth > 768) {
    sidebar.classList.add("sidebar-open");
    console.log("🖥️ Desktop: Sidebar visible");
  } else {
    sidebar.classList.remove("sidebar-open");
    console.log("📱 Mobile: Sidebar hidden");
  }
  
  // Hamburger click
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", () => {
      console.log("🍔 Hamburger clicked");
      sidebar.classList.toggle("sidebar-open");
      if (overlay) overlay.classList.toggle("active");
    });
  }
  
  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("sidebar-open");
      if (overlay) overlay.classList.remove("active");
    });
  }
  
  // Overlay click
  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("sidebar-open");
      overlay.classList.remove("active");
    });
  }
  
  // Menu item clicks
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      console.log("📄 Menu clicked:", view);
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("sidebar-open");
        if (overlay) overlay.classList.remove("active");
      }
      
      // Navigate
      if (window.loadView && view) {
        window.loadView(view);
      }
    });
  });
  
  console.log("✅ Navigation initialized successfully");
}

// Emergency sidebar creation if main one fails
function createEmergencySidebar() {
  console.log("🆘 Creating emergency sidebar...");
  
  const emergencySidebar = document.createElement("div");
  emergencySidebar.id = "emergencySidebar";
  emergencySidebar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background: #1a1f36;
    color: white;
    z-index: 10000;
    padding: 20px;
    box-shadow: 5px 0 15px rgba(0,0,0,0.3);
  `;
  
  emergencySidebar.innerHTML = `
    <h2 style="color: white; margin-top: 0;">🚨 Emergency Sidebar</h2>
    <p style="color: #ccc;">Main sidebar failed to load.</p>
    <div style="margin-top: 20px;">
      <a href="#dashboard" style="color: white; display: block; padding: 10px; background: rgba(255,255,255,0.1); margin: 5px 0; border-radius: 5px;">🏠 Dashboard</a>
      <a href="#transactions" style="color: white; display: block; padding: 10px; background: rgba(255,255,255,0.1); margin: 5px 0; border-radius: 5px;">💸 Transactions</a>
      <a href="#budgets" style="color: white; display: block; padding: 10px; background: rgba(255,255,255,0.1); margin: 5px 0; border-radius: 5px;">🎯 Budgets</a>
    </div>
  `;
  
  document.body.appendChild(emergencySidebar);
}

// Start injection
console.log("🚀 NAVIGATION: Calling injectNavigation...");
injectNavigation();