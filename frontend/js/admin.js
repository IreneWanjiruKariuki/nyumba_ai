// ADMIN AUTH GUARD
function requireAdminAuth() {
    const admin = localStorage.getItem('admin');
    if (!admin) {
        window.location.href = 'admin-login.html';
    }
}

requireAdminAuth();

// POPULATE NAVBAR
const adminData   = JSON.parse(localStorage.getItem('admin') || '{}');
const adminWelcome = document.getElementById('adminWelcome');
if (adminWelcome && adminData.name) {
    adminWelcome.textContent = adminData.name;
}

// LOGOUT
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('admin');
        localStorage.removeItem('adminToken');
        window.location.href = 'admin-login.html';
    });
}

// ADMIN FETCH HELPER
async function adminFetch(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || 'Something went wrong');
    }

    return data;
}