/**
 * CraveNest - Authentication Management
 * Handles Login, Registration, Session sync, Demo fills, and Navigation updates
 */

document.addEventListener('DOMContentLoaded', () => {
  renderNavbarAuthState();
  initLoginForm();
  initRegisterForm();
  initDemoCredentials();
  initLogout();
});

// Update Header according to logged in state
function renderNavbarAuthState() {
  const authContainer = document.getElementById('navbar-auth-container');
  if (!authContainer) return;

  const user = AuthHelper.getUser();

  if (user && AuthHelper.isLoggedIn()) {
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const isAdmin = user.role === 'admin';

    authContainer.innerHTML = `
      <div class="user-menu-wrap">
        <div class="user-profile-btn" id="user-menu-trigger">
          <div class="user-avatar-sm">${initials}</div>
          <span class="user-name-sm">${user.name.split(' ')[0]}</span>
          <i class="fas fa-chevron-down" style="font-size: 0.75rem; color: var(--text-muted);"></i>
        </div>
        <div class="user-dropdown" id="user-dropdown-menu">
          <div class="dropdown-header">
            <div class="dropdown-name">${user.name}</div>
            <div class="dropdown-email">${user.email}</div>
          </div>
          <a href="profile.html" class="dropdown-item">
            <i class="fas fa-user-circle"></i> My Profile
          </a>
          <a href="orders.html" class="dropdown-item">
            <i class="fas fa-receipt"></i> Orders & Tracking
          </a>
          <a href="profile.html#favorites" class="dropdown-item">
            <i class="fas fa-heart"></i> Saved Favorites
          </a>
          ${isAdmin ? `
            <div class="dropdown-divider"></div>
            <a href="admin.html" class="dropdown-item" style="color: var(--primary); font-weight: 700;">
              <i class="fas fa-shield-alt"></i> Admin Dashboard
            </a>
          ` : ''}
          <div class="dropdown-divider"></div>
          <button type="button" class="dropdown-item logout-btn-action" style="color: var(--accent-rose); width: 100%; text-align: left;">
            <i class="fas fa-sign-out-alt"></i> Sign Out
          </button>
        </div>
      </div>
    `;

    // Dropdown toggle logic
    const trigger = document.getElementById('user-menu-trigger');
    const dropdown = document.getElementById('user-dropdown-menu');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      if (dropdown) dropdown.classList.remove('show');
    });
  } else {
    authContainer.innerHTML = `
      <div class="auth-btn-group">
        <a href="login.html" class="btn-secondary">Sign In</a>
        <a href="register.html" class="btn-primary">Register</a>
      </div>
    `;
  }
}

// Handle Login Form
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

      const res = await API.post('/auth/login', { email, password });

      if (res.success) {
        AuthHelper.setToken(res.token);
        AuthHelper.setUser(res.user);
        showToast(`Welcome back, ${res.user.name}!`, 'success');

        setTimeout(() => {
          if (res.user.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            // Check return URL or default to home/cart
            const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
            window.location.href = redirect;
          }
        }, 800);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In to CraveNest';
    }
  });
}

// Handle Register Form
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password')?.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!name || !email || !password) {
      showToast('Please fill out all required fields', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

      const res = await API.post('/auth/register', { name, email, phone, password });

      if (res.success) {
        AuthHelper.setToken(res.token);
        AuthHelper.setUser(res.user);
        showToast('Registration successful! Welcome to CraveNest.', 'success');

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Create Account';
    }
  });
}

// Demo Credentials Autofill
function initDemoCredentials() {
  const userBtn = document.getElementById('demo-user-btn');
  const adminBtn = document.getElementById('demo-admin-btn');

  if (userBtn) {
    userBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput && passInput) {
        emailInput.value = 'user@example.com';
        passInput.value = 'user123';
        showToast('Demo User credentials filled!', 'info');
      }
    });
  }

  if (adminBtn) {
    adminBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput && passInput) {
        emailInput.value = 'admin@example.com';
        passInput.value = 'admin123';
        showToast('Demo Admin credentials filled!', 'info');
      }
    });
  }
}

// Handle Logout
function initLogout() {
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.logout-btn-action')) {
      try {
        await API.post('/auth/logout', {});
      } catch (err) {
        // Ignore network errors on logout
      }
      AuthHelper.clear();
      showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    }
  });
}
