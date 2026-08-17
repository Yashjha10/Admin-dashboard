// DOM Elements
const dashboardSidebar = document.getElementById("dashboardSidebar");
const userMenu = document.getElementById("userMenu");
const userMenuTrigger = document.getElementById("user-menu-trigger");
const userMenuDropdown = document.querySelector(".user-menu-dropdown");
const themeToggle = document.getElementById("theme-toggle");
const dashboardViews = document.querySelectorAll(".dashboard-view");
const dashboardNavItems = document.querySelectorAll(".dashboard-nav-item");
const dashboardTitle = document.getElementById("dashboardTitle");
const dashboardSidebarOverlay = document.getElementById("dashboardSidebarOverlay");
const searchContainer = document.getElementById("searchContainer");
const searchInput = document.getElementById("searchInput");
const searchClose = document.getElementById("searchClose");
const mobileSearchBtn = document.getElementById("mobileSearchBtn");
// State
let sidebarCollapsed = false;
let currentView = "overview";
// ===================================
// INITIALIZATION
// ===================================
document.addEventListener("DOMContentLoaded", function () {
  initTheme();
  initThemeToggle();
  initSidebar();
  initUserMenu();
  initNavigation();
  initSearch();

  // Auth gate: only load dashboard data once we have a valid token
  if (getToken()) {
    startDashboard();
  } else {
    showLoginScreen();
  }
});

async function startDashboard() {
  try {
    const user = await Api.me();
    document.getElementById("dashboardTitle").dataset.userName = user.name;
  } catch (e) {
    showLoginScreen();
    return;
  }
  await loadStats();
  await initCharts();
  await loadProjectsTable();
  initLogout();
}

// ===================================
// LOGIN SCREEN
// ===================================
function showLoginScreen() {
  document.querySelector(".dashboard-container").style.display = "none";
  let overlay = document.getElementById("loginOverlay");
  if (overlay) {
    overlay.style.display = "flex";
    return;
  }
  overlay = document.createElement("div");
  overlay.id = "loginOverlay";
  overlay.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--color-background);z-index:2000;";
  overlay.innerHTML = `
    <form id="loginForm" style="width:320px;display:flex;flex-direction:column;gap:12px;">
      <h2 style="margin-bottom:8px;">Sign in</h2>
      <input id="loginEmail" class="form-input" type="email" placeholder="Email" required style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);" />
      <input id="loginPassword" class="form-input" type="password" placeholder="Password" required style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);" />
      <button type="submit" class="btn btn-primary">Log In</button>
      <button type="button" id="signupBtn" class="btn btn-secondary">Create Account</button>
      <p id="loginError" style="color:var(--color-error);font-size:var(--text-sm);"></p>
    </form>`;
  document.body.appendChild(overlay);

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const errorEl = document.getElementById("loginError");
    try {
      const { access_token } = await Api.login(email, password);
      setToken(access_token);
      overlay.style.display = "none";
      document.querySelector(".dashboard-container").style.display = "";
      startDashboard();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById("signupBtn").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const name = prompt("Your name?") || "New User";
    const errorEl = document.getElementById("loginError");
    try {
      const { access_token } = await Api.signup(name, email, password);
      setToken(access_token);
      overlay.style.display = "none";
      document.querySelector(".dashboard-container").style.display = "";
      startDashboard();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

function initLogout() {
  document.querySelectorAll(".user-menu-item").forEach((item) => {
    if (item.textContent.includes("Sign Out")) {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        clearToken();
        location.reload();
      });
    }
  });
}
// ===================================
// SIDEBAR FUNCTIONALITY
// ===================================
function initSidebar() {
  // Load saved sidebar state
  sidebarCollapsed = localStorage.getItem("dashboard-sidebar-collapsed") === "true";
  dashboardSidebar.classList.toggle("collapsed", sidebarCollapsed);
  // Sidebar toggle functionality
  document.querySelectorAll(".dashboard-sidebar-toggle").forEach((toggle) => {
    toggle.addEventListener("click", toggleSidebar);
  });
  // Sidebar overlay functionality
  dashboardSidebarOverlay?.addEventListener("click", closeSidebar);
}
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  const isMobile = window.innerWidth <= 1024;
  if (isMobile) {
    // Mobile behavior - toggle sidebar and overlay together
    const isOpen = dashboardSidebar.classList.contains("collapsed");
    dashboardSidebar.classList.toggle("collapsed", !isOpen);
    dashboardSidebarOverlay?.classList.toggle("active", !isOpen);
  } else {
    // Desktop behavior
    dashboardSidebar.classList.toggle("collapsed", sidebarCollapsed);
  }
  localStorage.setItem("dashboard-sidebar-collapsed", sidebarCollapsed.toString());
}
function closeSidebar() {
  if (window.innerWidth <= 1024) {
    dashboardSidebar.classList.remove("collapsed");
    dashboardSidebarOverlay?.classList.remove("active");
  }
}
// ===================================
// USER MENU FUNCTIONALITY
// ===================================
function initUserMenu() {
  if (!userMenuTrigger || !userMenu) return;
  userMenuTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.classList.toggle("active");
  });
  // Close menu when clicking outside or pressing escape
  document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target)) {
      userMenu.classList.remove("active");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && userMenu.classList.contains("active")) {
      userMenu.classList.remove("active");
    }
  });
}
// ===================================
// NAVIGATION FUNCTIONALITY
// ===================================
function initNavigation() {
  dashboardNavItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const viewId = item.getAttribute("data-view");
      if (viewId) switchView(viewId);
    });
  });
}
function switchView(viewId) {
  // Update active nav item
  dashboardNavItems.forEach((item) => {
    item.classList.toggle("active", item.getAttribute("data-view") === viewId);
  });
  // Hide all views and show selected one
  dashboardViews.forEach((view) => view.classList.remove("active"));
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add("active");
    currentView = viewId;
    updatePageTitle(viewId);
  }
  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 1024) closeSidebar();
}
function updatePageTitle(viewId) {
  const titles = {
    overview: "Overview",
    projects: "Projects",
    tasks: "Tasks",
    reports: "Reports",
    settings: "Settings",
  };
  if (dashboardTitle) {
    dashboardTitle.textContent = titles[viewId] || "Dashboard";
  }
}
// ===================================
// THEME FUNCTIONALITY
// ===================================
function initTheme() {
  // Load saved theme
  const savedTheme = localStorage.getItem("dashboard-theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  // Update theme toggle UI
  updateThemeToggleUI(savedTheme);
}
function initThemeToggle() {
  if (!themeToggle) return;
  themeToggle.querySelectorAll(".theme-option").forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      setTheme(option.getAttribute("data-theme"));
    });
  });
}
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("dashboard-theme", theme);
  updateThemeToggleUI(theme);
}
function updateThemeToggleUI(theme) {
  if (!themeToggle) return;
  themeToggle.querySelectorAll(".theme-option").forEach((option) => {
    option.classList.toggle("active", option.getAttribute("data-theme") === theme);
  });
}
// ===================================
// SEARCH FUNCTIONALITY
// ===================================
function initSearch() {
  mobileSearchBtn?.addEventListener("click", () => {
    searchContainer.classList.add("mobile-active");
    searchInput.focus();
  });
  searchClose?.addEventListener("click", () => {
    searchContainer.classList.remove("mobile-active");
    searchInput.value = "";
  });
}
// ===================================
// STATS & TABLE (real data from API)
// ===================================
async function loadStats() {
  try {
    const stats = await Api.getStats();
    const cards = document.querySelectorAll(".stat-card-value");
    if (cards[0]) cards[0].textContent = stats.total_projects;
    if (cards[1]) cards[1].textContent = stats.completed_tasks;
    if (cards[2]) cards[2].textContent = stats.pending_tasks;
    if (cards[3]) cards[3].textContent = stats.team_members;
  } catch (e) {
    console.error("Failed to load stats", e);
  }
}

async function loadProjectsTable() {
  try {
    const projects = await Api.listProjects();
    const tbody = document.querySelector(".dashboard-table tbody");
    if (!tbody) return;
    tbody.innerHTML = projects
      .map(
        (p) => `
      <tr>
        <td>
          <div class="project-title-cell">
            <div class="project-icon"><span class="material-symbols-rounded">${p.icon}</span></div>
            <div class="project-info">
              <div class="project-title-text">${p.title}</div>
              <div class="project-meta-text">${p.category} • ${p.tasks.length} tasks</div>
            </div>
          </div>
        </td>
        <td>${p.progress}%</td>
        <td><span class="status-badge ${p.status === "Completed" ? "success" : "warning"}">${p.status}</span></td>
        <td>${p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</td>
      </tr>`
      )
      .join("");
  } catch (e) {
    console.error("Failed to load projects", e);
  }
}

// ===================================
// CHART INITIALIZATION (real data from API)
// ===================================
async function initCharts() {
  try {
    const data = await Api.getChartData();
    initProgressChart(data);
    initCategoryChart(data);
  } catch (e) {
    console.error("Failed to load chart data", e);
  }
}
function initProgressChart(data) {
  const ctx = document.getElementById("progressChart");
  if (!ctx) return;
  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.progress_labels,
      datasets: [
        {
          label: "Project Progress",
          data: data.progress_values,
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: (value) => value + "%" },
        },
      },
    },
  });
}
function initCategoryChart(data) {
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.category_labels,
      datasets: [
        {
          data: data.category_values,
          backgroundColor: ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
      },
    },
  });
}