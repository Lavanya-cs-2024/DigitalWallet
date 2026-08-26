/**
 * Digital Wallet - Authentication Module
 * Handles login, registration, and password reset
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize auth forms
  initLoginForm();
  initRegisterForm();
  initForgotPasswordForm();
  initPasswordStrength();
  initPasswordMatch();
});

// ===== LOGIN FORM =====
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember')?.checked || false;
    
    // Clear previous errors
    clearErrors(this);
    
    // Validate
    if (!email || !password) {
      showFieldError('email', 'Please enter your email and password');
      return;
    }
    
    if (!App.validateEmail(email)) {
      showFieldError('email', 'Please enter a valid email address');
      return;
    }
    
    try {
      // Show loading state
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Logging in...';
      submitBtn.disabled = true;
      
      await App.login(email, password);
      
      // Redirect to dashboard
      window.location.href = '/dashboard.html';
      
    } catch (error) {
      App.showAlert(error.message || 'Login failed. Please try again.', 'error');
    } finally {
      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Log In';
        submitBtn.disabled = false;
      }
    }
  });
}

// ===== REGISTER FORM =====
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms')?.checked || false;
    
    // Clear previous errors
    clearErrors(this);
    
    // Validate
    if (!fullName || fullName.length < 2) {
      showFieldError('fullName', 'Please enter your full name');
      return;
    }
    
    if (!email || !App.validateEmail(email)) {
      showFieldError('email', 'Please enter a valid email address');
      return;
    }
    
    if (mobile && !App.validatePhone(mobile)) {
      showFieldError('mobile', 'Please enter a valid phone number');
      return;
    }
    
    if (!App.validatePassword(password)) {
      showFieldError('password', 'Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      showFieldError('confirmPassword', 'Passwords do not match');
      return;
    }
    
    if (!terms) {
      App.showAlert('Please agree to the Terms & Conditions', 'error');
      return;
    }
    
    try {
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating account...';
      submitBtn.disabled = true;
      
      await App.register({
        name: fullName,
        email: email,
        mobile: mobile,
        password: password
      });
      
      App.showAlert('Account created successfully! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
      
    } catch (error) {
      App.showAlert(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled = false;
      }
    }
  });
}

// ===== FORGOT PASSWORD FORM =====
function initForgotPasswordForm() {
  const form = document.getElementById('forgotPasswordForm');
  if (!form) return;
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    if (!email || !App.validateEmail(email)) {
      App.showAlert('Please enter a valid email address', 'error');
      return;
    }
    
    // Simulate password reset
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
      App.showAlert('Password reset link sent to your email!', 'success');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      this.reset();
    }, 1500);
  });
}

// ===== PASSWORD STRENGTH =====
function initPasswordStrength() {
  const pwInput = document.getElementById('password');
  if (!pwInput) return;
  
  const bars = document.querySelectorAll('.strength-bars .bar');
  const strengthLabel = document.querySelector('.strength-label');
  
  if (!bars.length || !strengthLabel) return;
  
  function scorePassword(pw) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }
  
  pwInput.addEventListener('input', function() {
    const score = this.value.length === 0 ? 0 : Math.max(1, scorePassword(this.value));
    bars.forEach((bar, i) => bar.classList.toggle('on', i < score));
    const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    strengthLabel.textContent = labels[score] || 'Weak';
  });
}

// ===== PASSWORD MATCH =====
function initPasswordMatch() {
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  
  if (!password || !confirmPassword) return;
  
  function checkMatch() {
    if (confirmPassword.value.length > 0) {
      if (password.value !== confirmPassword.value) {
        confirmPassword.style.borderColor = 'var(--danger)';
      } else {
        confirmPassword.style.borderColor = 'var(--success)';
      }
    } else {
      confirmPassword.style.borderColor = '';
    }
  }
  
  password.addEventListener('input', checkMatch);
  confirmPassword.addEventListener('input', checkMatch);
}

// ===== HELPER FUNCTIONS =====
function clearErrors(form) {
  form.querySelectorAll('.field-error').forEach(el => el.remove());
  form.querySelectorAll('.input-wrap input').forEach(input => {
    input.style.borderColor = '';
  });
}

function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  
  input.style.borderColor = 'var(--danger)';
  
  const wrap = input.closest('.field') || input.closest('.input-wrap');
  if (wrap) {
    const error = document.createElement('div');
    error.className = 'field-error';
    error.style.cssText = 'color: var(--danger); font-size: 11px; margin-top: 4px;';
    error.textContent = message;
    wrap.appendChild(error);
  }
}