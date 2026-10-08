/**
 * CraveNest - Core API Client & Global Helpers
 * Handles JWT Authorization, Toast Notifications, and HTTP requests
 */

const API_BASE = '/api';

// Toast Notification System
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-check-circle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';
  if (type === 'warning') iconClass = 'fa-exclamation-triangle';

  toast.innerHTML = `
    <i class="fas ${iconClass} toast-icon"></i>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Authentication Helpers
const AuthHelper = {
  getToken() {
    return localStorage.getItem('cravenest_token');
  },
  setToken(token) {
    localStorage.setItem('cravenest_token', token);
  },
  getUser() {
    try {
      const u = localStorage.getItem('cravenest_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },
  setUser(user) {
    localStorage.setItem('cravenest_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('cravenest_token');
    localStorage.removeItem('cravenest_user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  }
};

// Generic HTTP Requester
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = AuthHelper.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/register')) {
        AuthHelper.clear();
        // Redirect to login if token invalid on protected pages
        if (window.location.pathname.includes('checkout') || window.location.pathname.includes('profile') || window.location.pathname.includes('admin')) {
          window.location.href = 'login.html';
        }
      }
      throw new Error(data.message || 'An unexpected error occurred');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

const API = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' })
};

// Format currency in Indian Rupees
function formatPrice(amount) {
  return `₹${Math.round(amount)}`;
}

// Debounce helper for instant live search
function debounce(func, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}
