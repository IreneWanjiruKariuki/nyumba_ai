// PROTECT PAGE
requireAuth();

// POPULATE GREETING
const client = getClient();

if (client) {
    const firstName = client.name.split(' ')[0];
    const greeting  = document.getElementById('heroGreeting');
    const welcome   = document.getElementById('welcomeName');

    if (greeting) greeting.textContent = `Welcome back, ${firstName}`;
    if (welcome)  welcome.textContent  = firstName;
}

// LOGOUT
const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        removeToken();
        redirectTo('login.html');
    });
}

// LOAD RECENT ACTIVITY
async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    try {
        const submissions = await apiFetch('/submissions');

        if (!submissions || submissions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    No recent activity yet. Submit your first
                    property or browse listings to get started.
                </div>`;
            return;
        }

        // Show the 3 most recent submissions
        const recent = submissions.slice(0, 3);
        container.innerHTML = recent.map(sub => `
            <div class="activity-item">
                <span class="activity-text">
                    Submission — ${sub.description.substring(0, 50)}...
                </span>
                <div style="display:flex;align-items:center;gap:12px">
                    <span class="badge badge-${
                        sub.status === 'approved' ? 'success' :
                        sub.status === 'rejected' ? 'danger'  : 'neutral'
                    }">${sub.status}</span>
                    <span class="activity-time">
                        ${new Date(sub.submittedAt).toLocaleDateString('en-KE')}
                    </span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                Could not load recent activity.
            </div>`;
    }
}
loadRecentActivity();