// Front_end/js/auth-guard.js
// Purpose: Protect pages that require authentication

(function authGuard() {
    // ============================================
    // 1. CHECK TOKEN EXISTS
    // ============================================
    const accessToken = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');

    // If no token → redirect to login
    if (!accessToken) {
        console.log('🚫 No token found. Redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    // ============================================
    // 2. PARSE USER DATA
    // ============================================
    let user = null;
    try {
        user = userData ? JSON.parse(userData) : null;
    } catch (e) {
        console.error('❌ Invalid user data in localStorage');
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    // If no user data → redirect to login
    if (!user) {
        console.log('🚫 No user data. Redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    // ============================================
    // 3. CHECK ACCOUNT STATUS
    // ============================================
    if (user.status === 'PENDING_VERIFICATION') {
        console.log('⚠️ Email not verified. Redirecting to verify...');
        localStorage.setItem('pendingEmail', user.email);
        window.location.href = 'verify.html';
        return;
    }

    // ============================================
    // 4. VERIFY TOKEN WITH BACKEND
    // ============================================
    fetch('http://localhost:5000/api/auth/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(res => {
        if (res.status === 401) {
            // Token expired or invalid
            console.log('🚫 Token invalid. Logging out...');
            localStorage.clear();
            window.location.href = 'login.html';
            return null;
        }
        return res.json();
    })
    .then(data => {
        if (!data) return;
        
        if (data.success && data.data?.user) {
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(data.data.user));
            if (data.data.wallet) {
                localStorage.setItem('wallet', JSON.stringify(data.data.wallet));
            }
            console.log('✅ User authenticated:', data.data.user.name);
        } else {
            // Something wrong
            console.log('❌ Auth failed. Redirecting to login...');
            localStorage.clear();
            window.location.href = 'login.html';
        }
    })
    .catch(error => {
        console.error('❌ Auth check error:', error);
        // Don't redirect on network error — user might be offline
    });

})();