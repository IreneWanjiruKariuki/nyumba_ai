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

// ADMIN DASHBOARD
const pendingTableBody = document.getElementById('pendingTableBody');

async function loadAdminDashboard() {
    if (!pendingTableBody) return;

    try {
        const submissions = await adminFetch('/admin/submissions');
        renderStats(submissions);
        renderPendingTable(submissions);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        if (pendingTableBody) {
            pendingTableBody.innerHTML = `
                <tr>
                    <td colspan="7"
                        style="text-align:center;
                               padding:32px;
                               color:#9CA3AF;">
                        Could not load submissions.
                    </td>
                </tr>`;
        }
    }
}

function renderStats(submissions) {
    const pending  = submissions.filter(s => s.status === 'pending').length;
    const approved = submissions.filter(s => s.status === 'approved').length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;

    const statPending  = document.getElementById('statPending');
    const statApproved = document.getElementById('statApproved');
    const statRejected = document.getElementById('statRejected');
    const sidebarCount = document.getElementById('sidebarPendingCount');
    const pendingCount = document.getElementById('pendingCount');

    if (statPending)  statPending.textContent  = pending;
    if (statApproved) statApproved.textContent = approved;
    if (statRejected) statRejected.textContent = rejected;
    if (sidebarCount) sidebarCount.textContent = pending;
    if (pendingCount) pendingCount.textContent =
        `${pending} submission${pending !== 1 ? 's' : ''} awaiting review`;
}

function renderPendingTable(submissions) {
    const pending = submissions.filter(s => s.status === 'pending');

    if (pending.length === 0) {
        pendingTableBody.innerHTML = `
            <tr>
                <td colspan="7"
                    style="text-align:center;
                           padding:40px;
                           color:#9CA3AF;">
                    No pending submissions at this time.
                </td>
            </tr>`;
        return;
    }

    pendingTableBody.innerHTML = pending.map(sub => `
        <tr>
            <td style="color:var(--text-muted);font-size:13px">
                #${sub.submissionID}
            </td>
            <td style="font-weight:600">
                ${sub.client ? sub.client.name : '—'}
            </td>
            <td style="max-width:220px;
                       white-space:nowrap;
                       overflow:hidden;
                       text-overflow:ellipsis;
                       color:var(--text-muted);
                       font-size:13px">
                ${sub.description}
            </td>
            <td style="font-size:13px">
                ${sub.location ? sub.location.cityOrCounty : '—'}
            </td>
            <td style="font-size:13px;color:var(--text-muted)">
                ${sub.images ? sub.images.length : 0} image(s)
            </td>
            <td style="font-size:12px;color:var(--text-muted)">
                ${new Date(sub.submittedAt)
                    .toLocaleDateString('en-KE')}
            </td>
            <td>
                
                    href="admin-review.html?id=${sub.submissionID}"
                    class="btn btn-sm btn-primary"
                >
                    Review
                </a>
            </td>
        </tr>
    `).join('');
}

if (pendingTableBody) {
    loadAdminDashboard();
}