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
  initAddProjectButton();
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
    if (viewId === "tasks") ensureTasksViewInitialized();
    if (viewId === "projects") ensureProjectsViewInitialized();
    if (viewId === "reports") ensureReportsViewInitialized();
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
let progressChartInstance = null;
let categoryChartInstance = null;

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
  if (progressChartInstance) {
    progressChartInstance.destroy();
  }
  progressChartInstance = new Chart(ctx, {
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
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }
  categoryChartInstance = new Chart(ctx, {
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

// ===================================
// ADD PROJECT
// ===================================
function initAddProjectButton() {
  const header = document.querySelector(".dashboard-table-header");
  if (!header || document.getElementById("addProjectBtn")) return;

  const btn = document.createElement("button");
  btn.id = "addProjectBtn";
  btn.className = "btn btn-primary";
  btn.textContent = "+ Add Project";
  btn.style.marginLeft = "8px";
  btn.addEventListener("click", showAddProjectModal);
  header.appendChild(btn);
}

function showAddProjectModal() {
  let overlay = document.getElementById("addProjectOverlay");
  if (overlay) {
    overlay.style.display = "flex";
    return;
  }
  overlay = document.createElement("div");
  overlay.id = "addProjectOverlay";
  overlay.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:2000;";
  overlay.innerHTML = `
    <form id="addProjectForm" style="width:340px;display:flex;flex-direction:column;gap:12px;background:var(--color-background);padding:24px;border-radius:12px;">
      <h2 style="margin-bottom:4px;">Add Project</h2>
      <input id="projTitle" placeholder="Project title" required style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);" />
      <input id="projCategory" placeholder="Category (e.g. Frontend)" required style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);" />
      <label style="font-size:var(--text-sm);color:var(--color-text-secondary);">Progress: <span id="progressLabel">50</span>%</label>
      <input id="projProgress" type="range" min="0" max="100" value="50" />
      <select id="projStatus" style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);">
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
        <option value="On Hold">On Hold</option>
      </select>
      <div style="display:flex;gap:8px;">
        <button type="submit" class="btn btn-primary" style="flex:1;">Create</button>
        <button type="button" id="cancelAddProject" class="btn btn-secondary" style="flex:1;">Cancel</button>
      </div>
      <p id="addProjectError" style="color:var(--color-error);font-size:var(--text-sm);"></p>
    </form>`;
  document.body.appendChild(overlay);

  const progressInput = document.getElementById("projProgress");
  progressInput.addEventListener("input", () => {
    document.getElementById("progressLabel").textContent = progressInput.value;
  });

  document.getElementById("cancelAddProject").addEventListener("click", () => {
    overlay.style.display = "none";
  });

  document.getElementById("addProjectForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("addProjectError");
    try {
      await Api.createProject({
        title: document.getElementById("projTitle").value,
        category: document.getElementById("projCategory").value,
        icon: "folder",
        progress: parseInt(document.getElementById("projProgress").value, 10),
        status: document.getElementById("projStatus").value,
      });
      overlay.style.display = "none";
      document.getElementById("addProjectForm").reset();
      // Refresh everything so the new project shows up immediately.
      // Each call is independent so one failure doesn't block the others.
      await loadStats().catch((e) => console.error("stats refresh failed", e));
      await initCharts().catch((e) => console.error("chart refresh failed", e));
      await loadProjectsTable().catch((e) => console.error("table refresh failed", e));
      if (document.getElementById("projectsListContainer")) {
        await loadProjectsList().catch((e) => console.error("projects list refresh failed", e));
      }
      if (document.getElementById("reportsStatsGrid")) {
        await loadReportsData().catch((e) => console.error("reports refresh failed", e));
      }
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}
// ===================================
// TASKS VIEW
// ===================================
let tasksViewInitialized = false;

function ensureTasksViewInitialized() {
  if (tasksViewInitialized) {
    loadTasksList();
    return;
  }
  tasksViewInitialized = true;

  const tasksView = document.getElementById("tasks");
  if (!tasksView) return;

  // Replace the placeholder empty-state with a header + button + list container
  tasksView.innerHTML = `
    <div class="dashboard-table-container">
      <div class="dashboard-table-header">
        <h3 class="dashboard-table-title">Tasks</h3>
        <button id="addTaskBtn" class="btn btn-primary">+ Add Task</button>
      </div>
      <div id="tasksListContainer" style="padding: var(--space-md) var(--space-lg);">
        <p style="color: var(--color-text-secondary);">Loading tasks...</p>
      </div>
    </div>`;

  document.getElementById("addTaskBtn").addEventListener("click", showAddTaskModal);
  loadTasksList();
}

async function loadTasksList() {
  const container = document.getElementById("tasksListContainer");
  if (!container) return;
  try {
    const tasks = await Api.listTasks();
    if (tasks.length === 0) {
      container.innerHTML = `<p style="color: var(--color-text-secondary);">No tasks yet. Click "+ Add Task" to create one.</p>`;
      return;
    }
    container.innerHTML = tasks
      .map(
        (t) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--color-border);">
        <div>
          <div style="font-weight:var(--weight-medium);color:var(--color-text);">${t.title}</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-secondary);">Priority: ${t.priority}</div>
        </div>
        <span class="status-badge ${t.status === "completed" ? "success" : "warning"}">${t.status.replace("_", " ")}</span>
      </div>`
      )
      .join("");
  } catch (e) {
    container.innerHTML = `<p style="color: var(--color-error);">Failed to load tasks.</p>`;
    console.error(e);
  }
}

async function showAddTaskModal() {
  let overlay = document.getElementById("addTaskOverlay");
  if (overlay) {
    overlay.style.display = "flex";
    return;
  }

  // Need a project to attach the task to
  let projects = [];
  try {
    projects = await Api.listProjects();
  } catch (e) {
    alert("Couldn't load projects. Create a project first.");
    return;
  }
  if (projects.length === 0) {
    alert("Create a project first — tasks must belong to a project.");
    return;
  }

  overlay = document.createElement("div");
  overlay.id = "addTaskOverlay";
  overlay.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:2000;";
  overlay.innerHTML = `
    <form id="addTaskForm" style="width:340px;display:flex;flex-direction:column;gap:12px;background:var(--color-background);padding:24px;border-radius:12px;">
      <h2 style="margin-bottom:4px;">Add Task</h2>
      <input id="taskTitle" placeholder="Task title" required style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);" />
      <select id="taskProject" style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);">
        ${projects.map((p) => `<option value="${p.id}">${p.title}</option>`).join("")}
      </select>
      <select id="taskStatus" style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);">
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>
      <select id="taskPriority" style="padding:10px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-background);color:var(--color-text);">
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
      </select>
      <div style="display:flex;gap:8px;">
        <button type="submit" class="btn btn-primary" style="flex:1;">Create</button>
        <button type="button" id="cancelAddTask" class="btn btn-secondary" style="flex:1;">Cancel</button>
      </div>
      <p id="addTaskError" style="color:var(--color-error);font-size:var(--text-sm);"></p>
    </form>`;
  document.body.appendChild(overlay);

  document.getElementById("cancelAddTask").addEventListener("click", () => {
    overlay.style.display = "none";
  });

  document.getElementById("addTaskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("addTaskError");
    try {
      await Api.createTask({
        title: document.getElementById("taskTitle").value,
        project_id: parseInt(document.getElementById("taskProject").value, 10),
        status: document.getElementById("taskStatus").value,
        priority: document.getElementById("taskPriority").value,
      });
      overlay.style.display = "none";
      document.getElementById("addTaskForm").reset();
      // Refresh stat cards (completed/pending counts) and the tasks list itself
      await loadStats().catch((e) => console.error("stats refresh failed", e));
      await loadTasksList().catch((e) => console.error("tasks list refresh failed", e));
      if (document.getElementById("reportsStatsGrid")) {
        await loadReportsData().catch((e) => console.error("reports refresh failed", e));
      }
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

// ===================================
// PROJECTS VIEW (full list, with delete)
// ===================================
let projectsViewInitialized = false;

function ensureProjectsViewInitialized() {
  if (projectsViewInitialized) {
    loadProjectsList();
    return;
  }
  projectsViewInitialized = true;

  const projectsView = document.getElementById("projects");
  if (!projectsView) return;

  projectsView.innerHTML = `
    <div class="dashboard-table-container">
      <div class="dashboard-table-header">
        <h3 class="dashboard-table-title">All Projects</h3>
        <button id="addProjectBtnProjectsTab" class="btn btn-primary">+ Add Project</button>
      </div>
      <div id="projectsListContainer" style="padding: var(--space-md) var(--space-lg);">
        <p style="color: var(--color-text-secondary);">Loading projects...</p>
      </div>
    </div>`;

  document.getElementById("addProjectBtnProjectsTab").addEventListener("click", showAddProjectModal);
  loadProjectsList();
}

async function loadProjectsList() {
  const container = document.getElementById("projectsListContainer");
  if (!container) return;
  try {
    const projects = await Api.listProjects();
    if (projects.length === 0) {
      container.innerHTML = `<p style="color: var(--color-text-secondary);">No projects yet. Click "+ Add Project" to create one.</p>`;
      return;
    }
    container.innerHTML = projects
      .map(
        (p) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--color-border);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="project-icon"><span class="material-symbols-rounded">${p.icon}</span></div>
          <div>
            <div style="font-weight:var(--weight-medium);color:var(--color-text);">${p.title}</div>
            <div style="font-size:var(--text-sm);color:var(--color-text-secondary);">${p.category} • ${p.progress}% • ${p.tasks.length} tasks</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="status-badge ${p.status === "Completed" ? "success" : "warning"}">${p.status}</span>
          <button class="btn btn-secondary delete-project-btn" data-id="${p.id}" style="padding:6px 10px;">Delete</button>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll(".delete-project-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this project and all its tasks?")) return;
        try {
          await Api.deleteProject(parseInt(btn.dataset.id, 10));
          await loadProjectsList();
          await loadStats().catch((e) => console.error(e));
          await initCharts().catch((e) => console.error(e));
          await loadProjectsTable().catch((e) => console.error(e));
          if (document.getElementById("reportsStatsGrid")) {
            await loadReportsData().catch((e) => console.error(e));
          }
        } catch (e) {
          alert("Failed to delete: " + e.message);
        }
      });
    });
  } catch (e) {
    container.innerHTML = `<p style="color: var(--color-error);">Failed to load projects.</p>`;
    console.error(e);
  }
}

// ===================================
// REPORTS VIEW
// ===================================
let reportsViewInitialized = false;
let reportsProgressChartInstance = null;
let reportsCategoryChartInstance = null;
let reportsStatusChartInstance = null;

function ensureReportsViewInitialized() {
  if (reportsViewInitialized) {
    loadReportsData();
    return;
  }
  reportsViewInitialized = true;

  const reportsView = document.getElementById("reports");
  if (!reportsView) return;

  reportsView.innerHTML = `
    <div class="stats-grid" id="reportsStatsGrid" style="margin-bottom: var(--space-lg);"></div>
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <h3 class="chart-card-title">Project Progress</h3>
          <p class="chart-card-subtitle">Completion by project</p>
        </div>
        <div class="chart-container"><canvas id="reportsProgressChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <h3 class="chart-card-title">Projects by Category</h3>
          <p class="chart-card-subtitle">Distribution across categories</p>
        </div>
        <div class="chart-container"><canvas id="reportsCategoryChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <h3 class="chart-card-title">Task Status Breakdown</h3>
          <p class="chart-card-subtitle">Pending vs. in progress vs. completed</p>
        </div>
        <div class="chart-container"><canvas id="reportsStatusChart"></canvas></div>
      </div>
    </div>`;

  loadReportsData();
}

async function loadReportsData() {
  try {
    const [stats, chartData, tasks] = await Promise.all([
      Api.getStats(),
      Api.getChartData(),
      Api.listTasks(),
    ]);

    // Summary cards
    const grid = document.getElementById("reportsStatsGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Total Projects</div></div>
          <div class="stat-card-value">${stats.total_projects}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Completed Tasks</div></div>
          <div class="stat-card-value">${stats.completed_tasks}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Pending Tasks</div></div>
          <div class="stat-card-value">${stats.pending_tasks}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Total Tasks</div></div>
          <div class="stat-card-value">${tasks.length}</div>
        </div>`;
    }

    // Progress chart (bar, per project)
    const progressCtx = document.getElementById("reportsProgressChart");
    if (progressCtx) {
      if (reportsProgressChartInstance) reportsProgressChartInstance.destroy();
      reportsProgressChartInstance = new Chart(progressCtx, {
        type: "bar",
        data: {
          labels: chartData.progress_labels,
          datasets: [
            {
              label: "Progress %",
              data: chartData.progress_values,
              backgroundColor: "#8b5cf6",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" } } },
        },
      });
    }

    // Category chart (doughnut)
    const categoryCtx = document.getElementById("reportsCategoryChart");
    if (categoryCtx) {
      if (reportsCategoryChartInstance) reportsCategoryChartInstance.destroy();
      reportsCategoryChartInstance = new Chart(categoryCtx, {
        type: "doughnut",
        data: {
          labels: chartData.category_labels,
          datasets: [
            {
              data: chartData.category_values,
              backgroundColor: ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { padding: 16, usePointStyle: true } } },
        },
      });
    }

    // Task status chart (bar), computed client-side from raw task list
    const statusCounts = { pending: 0, in_progress: 0, completed: 0 };
    tasks.forEach((t) => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
    });
    const statusCtx = document.getElementById("reportsStatusChart");
    if (statusCtx) {
      if (reportsStatusChartInstance) reportsStatusChartInstance.destroy();
      reportsStatusChartInstance = new Chart(statusCtx, {
        type: "bar",
        data: {
          labels: ["Pending", "In Progress", "Completed"],
          datasets: [
            {
              label: "Tasks",
              data: [statusCounts.pending, statusCounts.in_progress, statusCounts.completed],
              backgroundColor: ["#f59e0b", "#3b82f6", "#10b981"],
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    }
  } catch (e) {
    console.error("Failed to load reports data", e);
  }
}
