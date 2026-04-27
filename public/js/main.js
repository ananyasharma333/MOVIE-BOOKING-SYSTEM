// ============================================================
//  GLOBAL UTILITIES  — BookMyShow Full-Stack v2
// ============================================================

const API_URL = 'http://localhost:5000/api';

// ---- Auth Helpers ----
function getToken() { return localStorage.getItem('bms_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('bms_user')); } catch { return null; } }
function setAuth(token, user) {
  localStorage.setItem('bms_token', token);
  localStorage.setItem('bms_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('bms_token');
  localStorage.removeItem('bms_user');
}
function isLoggedIn() { return !!getToken() && !!getUser(); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

function requireLogin(redirectTo) {
  if (!isLoggedIn()) {
    const ret = redirectTo || window.location.href;
    window.location.href = `login.html?redirect=${encodeURIComponent(ret)}`;
    return false;
  }
  return true;
}
function requireAdmin() {
  if (!isAdmin()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ---- API Fetch Wrapper ----
async function fetchAPI(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.error || `Server error (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

// ---- Toast Notifications ----
function ensureToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type = 'success', duration = 3500) {
  const container = ensureToastContainer();
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => { toast.classList.add('show'); }); });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ---- Navbar / Auth State ----
function updateNavAuth() {
  const loginLink  = document.getElementById('login-link');
  const signupLink = document.getElementById('signup-link');
  const userMenu   = document.getElementById('user-menu');
  const userNameEl = document.getElementById('user-name');
  const adminLink  = document.getElementById('admin-link');
  const myBookings = document.getElementById('my-bookings-link');

  if (isLoggedIn()) {
    const user = getUser();
    if (loginLink)  loginLink.style.display  = 'none';
    if (signupLink) signupLink.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'flex';
      if (userNameEl) userNameEl.textContent = user.name.split(' ')[0];
      // Set avatar initials
      const avatar = userMenu.querySelector('.avatar');
      if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
    }
    if (adminLink)  adminLink.style.display  = isAdmin() ? 'block' : 'none';
    if (myBookings) myBookings.style.display = 'block';
  } else {
    if (loginLink)  loginLink.style.display  = 'inline-flex';
    if (signupLink) signupLink.style.display = 'inline-flex';
    if (userMenu)   userMenu.style.display   = 'none';
    if (adminLink)  adminLink.style.display  = 'none';
    if (myBookings) myBookings.style.display = 'none';
  }
}

function logout() {
  clearAuth();
  showToast('Logged out successfully', 'info');
  setTimeout(() => { window.location.href = 'index.html'; }, 800);
}

// ---- Format Utilities ----
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}
function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(timeStr) {
  if (!timeStr) return '--';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---- Loading Helpers ----
function renderLoading(container, text = 'Loading...') {
  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p class="loading-text">${text}</p>
    </div>`;
}
function renderError(container, msg = 'Something went wrong.') {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h3>Error</h3>
      <p>${msg}</p>
    </div>`;
}
function renderEmpty(container, icon = '🎬', title = 'Nothing here', desc = '') {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>`;
}

// ---- Modal Helpers ----
function openModal(id)  { document.getElementById(id)?.classList.add('open');  }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ---- Header Search (event delegation) ----
function initHeaderSearch() {
  const searchInput = document.getElementById('header-search-input');
  if (!searchInput) return;

  let searchTimeout;
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) window.location.href = `index.html?search=${encodeURIComponent(q)}`;
    }
  });
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = e.target.value.trim();
      if (q.length > 2 && window.location.pathname.includes('index')) {
        window.dispatchEvent(new CustomEvent('search', { detail: q }));
      }
    }, 350);
  });
}

// ---- Global DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  initHeaderSearch();

  // Logout button
  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  });
});
