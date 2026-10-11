// ============================================ //
// js/dashboard.js — Dashboard logic             //
// ============================================ //

// ===== API BASE URL ===== //
const API_BASE = 'https://api.digitalwallet.dpdns.org/api';                    // backend base URL

// ============================================ //
// RUN ON PAGE LOAD                              //
// ============================================ //
document.addEventListener('DOMContentLoaded', async function () { // wait for DOM
  const token = localStorage.getItem('accessToken');              // get JWT token

  if (!token) {                                                   // no token?
    window.location.href = 'login.html';                          // redirect to login
    return;                                                       // stop execution
  }

  loadUserInfo();                                                 // fill sidebar with user data
  fillWelcomeNames();                                             // fill "Welcome, <name>" spans
  attachLogoutHandler(token);                                     // wire logout button
  await loadDashboard(token);                                     // load wallet state
});

// ============================================ //
// LOAD USER INFO INTO SIDEBAR                   //
// ============================================ //
function loadUserInfo() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}'); // parse user from storage
    if (!user.name) return;                                       // nothing to fill

    const nameEl = document.getElementById('userName');           // sidebar name
    const emailEl = document.getElementById('userEmail');         // sidebar email
    const avatarEl = document.getElementById('userAvatar');       // sidebar avatar

    if (nameEl) nameEl.textContent = user.name;                   // set name
    if (emailEl) emailEl.textContent = user.email;                // set email

    if (avatarEl) {                                               // generate initials
      const initials = (user.name || 'U')
        .split(' ')                                               // split by space
        .map((n) => n[0])                                         // first letter of each
        .join('')                                                 // join
        .toUpperCase()                                            // uppercase
        .substring(0, 2);                                         // max 2 chars
      avatarEl.textContent = initials;                            // set initials
    }
  } catch (e) {
    console.error('Failed to load user info:', e);                // silent fail
  }
}

// ============================================ //
// FILL "WELCOME, <name>!" SPANS                 //
// ============================================ //
function fillWelcomeNames() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}'); // parse user
    const firstName = (user.name || 'User').split(' ')[0];        // first word of name

    // Fill BOTH welcome spans (no-wallet state and wallet state)
    const noWalletNameEl = document.getElementById('welcomeNoWalletName');
    const walletNameEl = document.getElementById('welcomeName');

    if (noWalletNameEl) noWalletNameEl.textContent = firstName;   // no-wallet welcome
    if (walletNameEl) walletNameEl.textContent = firstName;       // wallet welcome
  } catch (e) {
    console.error('Failed to fill welcome names:', e);            // silent fail
  }
}

// ============================================ //
// LOAD DASHBOARD STATE                          //
// ============================================ //
async function loadDashboard(token) {
  showState('loadingState');                                      // show spinner first

  try {
    const res = await fetch(`${API_BASE}/wallet`, {               // call backend
      headers: { Authorization: `Bearer ${token}` },              // send JWT
    });

    if (res.status === 401) {                                     // session expired
      localStorage.clear();                                       // clear storage
      window.location.href = 'login.html';                        // redirect
      return;                                                     // stop
    }

    if (res.status === 429) {                                     // rate limited
      showState('noWalletState');                                 // fallback UI
      return;                                                     // stop
    }

    const data = await res.json();                                // parse JSON
    const hasWallet = data?.data?.hasWallet === true;             // check flag

    if (hasWallet) {                                              // wallet exists?
      showState('walletState');                                   // show full dashboard
      renderWallet(data.data.wallet);                             // fill balance
      updateSidebar(true);                                        // enable wallet links
    } else {                                                      // no wallet
      showState('noWalletState');                                 // show create wallet
      updateSidebar(false);                                       // disable wallet links
    }

  } catch (err) {                                                 // network error
    console.error('Dashboard load failed:', err);                 // log
    showState('noWalletState');                                   // fallback UI
    updateSidebar(false);                                         // disable wallet links
  }
}

// ============================================ //
// SHOW ONE STATE, HIDE OTHERS                   //
// ============================================ //
function showState(stateId) {
  document.querySelectorAll('.dashboard-state')                   // all state sections
    .forEach((el) => { el.style.display = 'none'; });             // hide all

  const el = document.getElementById(stateId);                    // find target
  if (el) el.style.display = 'block';                             // show target
}

// ============================================ //
// RENDER WALLET DATA (balance, count)           //
// ============================================ //
function renderWallet(wallet) {
  if (!wallet) return;                                            // nothing to render

  const balance = parseFloat(wallet.balance || 0).toFixed(2);     // format balance

  const totalEl = document.getElementById('totalBalance');        // total balance cell
  const availEl = document.getElementById('availableBalance');     // available cell
  const lockedEl = document.getElementById('lockedBalance');      // locked cell
  const countEl = document.getElementById('transactionCount');    // transaction count

  if (totalEl) totalEl.textContent = `₹${balance}`;               // set total
  if (availEl) availEl.textContent = `₹${balance}`;               // set available
  if (lockedEl) lockedEl.textContent = `₹${wallet.lockedBalance || '0.00'}`; // set locked
  if (countEl) countEl.textContent = wallet.transactions?.length || 0; // set count
}

// ============================================ //
// UPDATE SIDEBAR (enable/disable links)         //
// ============================================ //
function updateSidebar(hasWallet) {
  document.querySelectorAll('[data-wallet-required="true"]')      // all wallet links
    .forEach((el) => {
      if (!hasWallet) {                                           // no wallet?
        el.classList.add('disabled');                             // dim + disable
      } else {                                                    // wallet exists?
        el.classList.remove('disabled');                          // re-enable
      }
    });
}

// ============================================ //
// CREATE WALLET — redirect to form page         //
// ============================================ //
function createWallet() {
  window.location.href = '../wallet/create-wallet.html';           // go to create form
}

// ============================================ //
// LOGOUT HANDLER                                //
// ============================================ //
function attachLogoutHandler(token) {
  const logoutBtn = document.getElementById('logoutBtn');         // find button
  if (!logoutBtn) return;                                         // none → exit

  logoutBtn.addEventListener('click', async function () {         // click handler
    try {
      await fetch(`${API_BASE}/auth/logout`, {                    // notify backend
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Logout API failed:', err);                   // silent fail
    }

    localStorage.clear();                                         // clear session
    window.location.href = 'login.html';                          // redirect
  });
}

// ============================================ //
// TOAST HELPER (uses alert.js if loaded)        //
// ============================================ //
function showToast(message, type = 'info') {
  if (typeof showSuccess === 'function' && type === 'success') {  // alert.js present?
    showSuccess(message);
    return;
  }
  if (typeof showError === 'function' && type === 'error') {      // alert.js present?
    showError(message);
    return;
  }
  if (typeof showWarning === 'function' && type === 'warning') {  // alert.js present?
    showWarning(message);
    return;
  }
  if (typeof showInfo === 'function' && type === 'info') {        // alert.js present?
    showInfo(message);
    return;
  }

  console.log(`[${type.toUpperCase()}] ${message}`);              // fallback: console
}