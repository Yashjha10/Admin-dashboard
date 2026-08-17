// ===================================
// API CLIENT
// ===================================
const API_BASE = "http://127.0.0.1:8000"; // change to your deployed backend URL later

function getToken() {
  return localStorage.getItem("dashboard-token");
}

function setToken(token) {
  localStorage.setItem("dashboard-token", token);
}

function clearToken() {
  localStorage.removeItem("dashboard-token");
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid — send back to login
    clearToken();
    showLoginScreen();
    throw new Error("Not authenticated");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  // DELETE requests may return no body
  if (res.status === 204) return null;
  return res.json();
}

// ---------- Auth ----------
const Api = {
  signup: (name, email, password) =>
    apiRequest("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  login: (email, password) =>
    apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: () => apiRequest("/auth/me"),

  // ---------- Projects ----------
  listProjects: () => apiRequest("/projects"),
  createProject: (data) => apiRequest("/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id, data) => apiRequest(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id) => apiRequest(`/projects/${id}`, { method: "DELETE" }),

  // ---------- Tasks ----------
  listTasks: () => apiRequest("/tasks"),
  createTask: (data) => apiRequest("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id, data) => apiRequest(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id) => apiRequest(`/tasks/${id}`, { method: "DELETE" }),

  // ---------- Stats ----------
  getStats: () => apiRequest("/stats"),
  getChartData: () => apiRequest("/stats/charts"),
};
