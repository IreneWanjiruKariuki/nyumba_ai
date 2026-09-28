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