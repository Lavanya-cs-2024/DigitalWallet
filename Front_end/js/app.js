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
  
  // Check authentication status
  checkAuth();
  
  // Initialize password toggle buttons
  initPasswordToggles();
  
  // Initialize any forms
  initForms();
});

// ===== AUTH CHECK =====
function checkAuth() {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user_data');
  
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
  
  // Redirect logic can be handled by page-specific scripts
  return AppState.isAuthenticated;
}

// ===== PASSWORD TOGGLE =====
function initPasswordToggles() {
  document.querySelectorAll('.toggle-eye').forEach(btn => {
    btn.addEventListener('click', function() {
      const input = document.getElementById(this.dataset.target);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        // Update icon if needed
        this.classList.toggle('active');
      }
    });
  });
}

// ===== FORM INITIALIZATION =====
function initForms() {
  // Add form submit handlers for any forms with class 'needs-validation'
  document.querySelectorAll('form.needs-validation').forEach(form => {
    form.addEventListener('submit', function(e) {
      if (!this.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('was-validated');
      }
    });
  });
}

// ===== AUTH FUNCTIONS =====
function login(email, password) {
  // Mock login - replace with actual API call
  return new Promise((resolve, reject) => {
    // Simulate API request
    setTimeout(() => {
      if (email && password && password.length >= 6) {
        const user = {
          id: 'user_' + Date.now(),
          email: email,
          name: email.split('@')[0],
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('auth_token', 'mock_jwt_token_' + Date.now());
        localStorage.setItem('user_data', JSON.stringify(user));
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
  // Mock registration
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userData.email && userData.password && userData.password.length >= 6) {
        const user = {
          id: 'user_' + Date.now(),
          ...userData,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('auth_token', 'mock_jwt_token_' + Date.now());
        localStorage.setItem('user_data', JSON.stringify(user));
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
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  AppState.currentUser = null;
  AppState.isAuthenticated = false;
  window.location.href = '/pages/login.html';
}

function getCurrentUser() {
  if (AppState.currentUser) return AppState.currentUser;
  
  const userData = localStorage.getItem('user_data');
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
  
  // Auto-dismiss after 5 seconds
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
// Make functions globally available
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