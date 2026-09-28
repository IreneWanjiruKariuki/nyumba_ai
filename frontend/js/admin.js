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

// ADMIN REVIEW PAGE
const reviewContent = document.getElementById('reviewContent');
const loadingState  = document.getElementById('loadingState');

if (reviewContent) {

    // Get submission ID from URL
    const params       = new URLSearchParams(window.location.search);
    const submissionID = params.get('id');

    if (!submissionID) {
        window.location.href = 'admin-dashboard.html';
    }

    // Load submission details
    async function loadSubmission() {
        try {
            const sub = await adminFetch(
                `/admin/submissions/${submissionID}`
            );

            // Hide loading, show content
            if (loadingState)  loadingState.style.display  = 'none';
            if (reviewContent) reviewContent.style.display = 'block';

            // Populate description
            document.getElementById('reviewTitle').textContent =
                `Review Submission #${sub.submissionID}`;
            document.getElementById('reviewDescription').textContent =
                sub.description;
            document.getElementById('reviewLocation').textContent =
                sub.location ? sub.location.cityOrCounty : '—';
            document.getElementById('reviewOwner').textContent =
                sub.client ? sub.client.name : '—';
            document.getElementById('reviewDate').textContent =
                new Date(sub.submittedAt).toLocaleString('en-KE');
            document.getElementById('reviewImageCount').textContent =
                `${sub.images ? sub.images.length : 0} image(s)`;

            // Populate image gallery
            const gallery = document.getElementById('imageGallery');
            if (gallery) {
                if (!sub.images || sub.images.length === 0) {
                    gallery.innerHTML = `
                        <div class="gallery-item no-image">
                            No images uploaded
                        </div>`;
                } else {
                    gallery.innerHTML = sub.images.map(img => `
                        <div class="gallery-item">
                            <img
                                src="http://127.0.0.1:8000/uploads/${
                                    img.filePath.replace(
                                        'uploads/submissions/', ''
                                    )
                                }"
                                alt="Property image"
                                onerror="this.parentElement.innerHTML=
                                    '<div class=\'no-image\'>Image unavailable</div>'"
                            >
                        </div>
                    `).join('');
                }
            }

        } catch (error) {
            if (loadingState) {
                loadingState.textContent =
                    'Could not load submission. ' + error.message;
            }
        }
    }

    loadSubmission();

    // APPROVE BUTTON
    const approveBtn = document.getElementById('approveBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', async () => {
            const checks = [
                document.getElementById('check1'),
                document.getElementById('check2'),
                document.getElementById('check3'),
            ];

            const allChecked = checks.every(c => c && c.checked);
            if (!allChecked) {
                alert(
                    'Please complete all checklist items ' +
                    'before approving.'
                );
                return;
            }

            if (!confirm(
                'Are you sure you want to approve this submission? ' +
                'This will trigger the price prediction pipeline.'
            )) return;

            approveBtn.disabled    = true;
            approveBtn.textContent = 'Approving...';

            try {
                await adminFetch(
                    `/admin/submissions/${submissionID}/approve`,
                    { method: 'PUT' }
                );

                const successEl =
                    document.getElementById('reviewSuccess');
                if (successEl) {
                    successEl.textContent =
                        'Submission approved successfully. ' +
                        'Price prediction has been triggered. ' +
                        'Redirecting to dashboard...';
                    successEl.classList.add('visible');
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 2500);

            } catch (error) {
                const errorEl =
                    document.getElementById('reviewError');
                if (errorEl) {
                    errorEl.textContent =
                        error.message || 'Approval failed.';
                    errorEl.classList.add('visible');
                }
                approveBtn.disabled    = false;
                approveBtn.textContent = '✓ Approve Submission';
            }
        });
    }

    // REJECT BUTTON
    const rejectBtn = document.getElementById('rejectBtn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
            const section =
                document.getElementById('rejectionSection');
            if (section) section.classList.toggle('visible');
        });
    }

    // CONFIRM REJECT BUTTON
    const confirmRejectBtn =
        document.getElementById('confirmRejectBtn');
    if (confirmRejectBtn) {
        confirmRejectBtn.addEventListener('click', async () => {
            const reason = document.getElementById(
                'rejectionReason'
            ).value.trim();

            if (!reason) {
                alert('Please enter a rejection reason.');
                return;
            }

            if (!confirm(
                'Are you sure you want to reject this submission?'
            )) return;

            confirmRejectBtn.disabled    = true;
            confirmRejectBtn.textContent = 'Rejecting...';

            try {
                await adminFetch(
                    `/admin/submissions/${submissionID}/reject`,
                    {
                        method: 'PUT',
                        body:   JSON.stringify({ reason }),
                    }
                );

                const successEl =
                    document.getElementById('reviewSuccess');
                if (successEl) {
                    successEl.textContent =
                        'Submission rejected. ' +
                        'The owner has been notified. ' +
                        'Redirecting to dashboard...';
                    successEl.classList.add('visible');
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 2500);

            } catch (error) {
                const errorEl =
                    document.getElementById('reviewError');
                if (errorEl) {
                    errorEl.textContent =
                        error.message || 'Rejection failed.';
                    errorEl.classList.add('visible');
                }
                confirmRejectBtn.disabled    = false;
                confirmRejectBtn.textContent = 'Confirm Rejection';
            }
        });
    }
}