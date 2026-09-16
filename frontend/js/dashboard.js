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

// RENDER PREDICTION TABLE 
function renderPredictions(submissions) {
    const tbody = document.getElementById('predictionsTableBody');
    if (!submissions || submissions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="text-align:center;padding:32px;color:#9CA3AF;">
                    No submissions yet.
                    <a href="submit-property.html"
                       style="color:var(--primary);">
                        Submit your first property
                    </a>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = submissions.map(sub => {
        const statusBadge = {
            pending:  'badge-neutral',
            approved: 'badge-success',
            rejected: 'badge-danger',
        }[sub.status] || 'badge-neutral';

        const salePrice = sub.prediction
            ? `KES ${sub.prediction.salePrice.toLocaleString()}`
            : '—';

        const rentalPrice = sub.prediction
            ? `KES ${sub.prediction.rentalPrice.toLocaleString()}/mo`
            : '—';

        const actionBtn = sub.status === 'approved' && !sub.listing
            ? `<a href="submit-property.html?list=${sub.submissionID}"
                  class="btn btn-sm btn-secondary">
                   List Property
               </a>`
            : sub.status === 'rejected'
            ? `<a href="submit-property.html?resubmit=${sub.submissionID}"
                  class="btn btn-sm btn-ghost">
                   Resubmit
               </a>`
            : '—';

        return `
            <tr>
                <td class="td-description">
                    ${sub.description}
                </td>
                <td style="font-size:13px;color:var(--text-muted)">
                    ${sub.location ? sub.location.cityOrCounty : '—'}
                </td>
                <td class="td-price">${salePrice}</td>
                <td class="td-price">${rentalPrice}</td>
                <td>
                    <span class="badge ${statusBadge}">
                        ${sub.status}
                    </span>
                </td>
                <td>${actionBtn}</td>
            </tr>`;
    }).join('');
}