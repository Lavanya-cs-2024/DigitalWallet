/**
 * Digital Wallet - Main Application
 * Handles routing, navigation, and shared functionality
 */

// ===== APP STATE =====
const AppState = {
  currentUser: null,
  isAuthenticated: false,
  theme: 'dark'
};

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('💰 Digital Wallet App initialized');

  checkAuth();
  initPasswordToggles();
  initForms();
});

// ===== AUTH CHECK =====
function checkAuth() {
  // use the SAME keys as wallet/payment pages
  const token = localStorage.getItem('accessToken');
  const user = localStorage.getItem('user');

  if (token && user) {
    try {
      AppState.currentUser = JSON.parse(user);
      AppState.isAuthenticated = true;
      console.log('✅ User authenticated:', AppState.currentUser.email);
    } catch (e) {
      console.error('Failed to parse user data');
      logout();
    }
  }

  return AppState.isAuthenticated;
}

// ===== PASSWORD TOGGLE =====
function initPasswordToggles() {
  document.querySelectorAll('.toggle-eye').forEach(btn => {
    btn.addEventListener('click', function () {
      const input = document.getElementById(this.dataset.target);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        this.classList.toggle('active');
      }
    });
  });
}

// ===== FORM INITIALIZATION =====
function initForms() {
  document.querySelectorAll('form.needs-validation').forEach(form => {
    form.addEventListener('submit', function (e) {
      if (!this.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('was-validated');
      }
    });
  });
}

// ===== AUTH FUNCTIONS =====
// NOTE: login/register are MOCK here.
// Your real login page (pages/login.html) already calls the backend.
// This file is a fallback/shared utility — do not use these for real auth.
function login(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password && password.length >= 6) {
        const user = {
          id: 'user_' + Date.now(),
          email: email,
          name: email.split('@')[0],
          createdAt: new Date().toISOString()
        };
        // use the same keys as wallet pages
        localStorage.setItem('accessToken', 'mock_jwt_token_' + Date.now());
        localStorage.setItem('user', JSON.stringify(user));
        AppState.currentUser = user;
        AppState.isAuthenticated = true;
        resolve(user);
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 500);
  });
}

function register(userData) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userData.email && userData.password && userData.password.length >= 6) {
        const user = {
          id: 'user_' + Date.now(),
          ...userData,
          createdAt: new Date().toISOString()
        };
        // use the same keys as wallet pages
        localStorage.setItem('accessToken', 'mock_jwt_token_' + Date.now());
        localStorage.setItem('user', JSON.stringify(user));
        AppState.currentUser = user;
        AppState.isAuthenticated = true;
        resolve(user);
      } else {
        reject(new Error('Registration failed'));
      }
    }, 500);
  });
}

function logout() {
  // clear the SAME keys that wallet pages use
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  AppState.currentUser = null;
  AppState.isAuthenticated = false;
  window.location.href = '/pages/login.html';
}

function getCurrentUser() {
  if (AppState.currentUser) return AppState.currentUser;

  const userData = localStorage.getItem('user');
  if (userData) {
    try {
      AppState.currentUser = JSON.parse(userData);
      AppState.isAuthenticated = true;
      return AppState.currentUser;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// ===== UTILITY FUNCTIONS =====
function showAlert(message, type = 'info', containerId = 'alert-container') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('Alert container not found');
    return;
  }

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;

  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transition = 'opacity 0.3s';
    setTimeout(() => alert.remove(), 300);
  }, 5000);

  container.appendChild(alert);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function validatePhone(phone) {
  return /^[\d\s\-()+]{8,15}$/.test(phone);
}

// ===== EXPORTS =====
window.App = {
  state: AppState,
  login,
  register,
  logout,
  getCurrentUser,
  checkAuth,
  showAlert,
  validateEmail,
  validatePassword,
  validatePhone
};