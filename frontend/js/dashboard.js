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

// RENDER STATS
function renderStats(submissions) {
    const total       = submissions.length;
    const predictions = submissions.filter(s => s.status === 'approved').length;
    const listings    = submissions.filter(
        s => s.listing && s.listing.status === 'active'
    ).length;

    document.getElementById('totalSubmissions').textContent = total;
    document.getElementById('totalPredictions').textContent = predictions;
    document.getElementById('totalListings').textContent    = listings;
}