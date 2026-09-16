// PROTECT PAGE
requireAuth();

// POPULATE NAVBAR
const client   = getClient();
const firstName = client ? client.name.split(' ')[0] : '';
const welcomeEl = document.getElementById('welcomeName');
if (welcomeEl) welcomeEl.textContent = firstName;

// LOGOUT
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        removeToken();
        redirectTo('login.html');
    });
}

// CLOSE NOTIFICATION BANNER
const closeNotif = document.getElementById('closeNotification');
if (closeNotif) {
    closeNotif.addEventListener('click', () => {
        document.getElementById('notificationBanner')
            .classList.remove('visible', 'approval', 'rejection');
    });
}

// LOAD DASHBOARD DATA
async function loadDashboard() {
    try {
        const submissions = await apiFetch('/submissions');
        renderStats(submissions);
        renderPredictions(submissions);
        renderListings(submissions);
        await loadNotifications();
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}