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
        ? `KES ${Number(sub.prediction.salePrice).toLocaleString()}`
        : '—';

    const rentalPrice = sub.prediction
        ? `KES ${Number(sub.prediction.rentalPrice).toLocaleString()}/mo`
        : '—';

    const isListed  = sub.listing && sub.listing.status === 'active';
    const actionBtn = sub.status === 'approved' && !isListed
        ? `<a href="list-property.html?submission=${sub.submissionID}"
              class="btn btn-sm btn-secondary">
               List Property
           </a>`
        : isListed
        ? `<span class="badge badge-success">Listed</span>`
        : sub.status === 'rejected'
        ? `<a href="submit-property.html?resubmit=${sub.submissionID}"
              class="btn btn-sm btn-ghost">
               Resubmit
           </a>`
        : '—';

    return `
        <tr>
            <td style="font-size:13.5px;font-weight:600">
                ${sub.propertyType}
            </td>
            <td style="font-size:13px;color:var(--text-muted)">
                ${sub.location ? sub.location.cityOrCounty : '—'}
            </td>
            <td style="font-size:13px;color:var(--text-muted)">
                ${sub.bedrooms} bed · ${sub.bathrooms} bath
                · ${sub.sizeSqm} sqm
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

// RENDER LISTINGS
function renderListings(submissions) {
    const container = document.getElementById('listingsContainer');
    const active    = submissions.filter(
        s => s.listing && s.listing.status === 'active'
    );

    if (active.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>No active listings yet</strong>
                <p>
                    After receiving a prediction you can list
                    your property for sale or rental.
                </p>
            </div>`;
        return;
    }

    const typeLabels = { sale: 'For Sale', rent: 'For Rent', both: 'Sale & Rent' };

    container.innerHTML = `
        <div class="listings-grid">
            ${active.map(sub => {
                const listing = sub.listing;
                const thumb   = sub.images && sub.images.length > 0
                    ? `<img class="listing-thumb"
                            src="${API_BASE}/${sub.images[0].filePath.replace(/\\/g, '/')}"
                            alt="Property photo">`
                    : `<div class="listing-thumb">No image</div>`;

                const prices = [];
                if (listing.askingSalePrice !== null) {
                    prices.push(`KES ${Number(listing.askingSalePrice).toLocaleString()}`);
                }
                if (listing.askingRentalPrice !== null) {
                    prices.push(`KES ${Number(listing.askingRentalPrice).toLocaleString()}/mo`);
                }

                const description = listing.description.length > 110
                    ? listing.description.substring(0, 110) + '…'
                    : listing.description;

                return `
                <div class="listing-card">
                    ${thumb}
                    <div class="listing-info">
                        <div class="listing-title">
                            ${sub.bedrooms === 0
                                ? ''
                                : sub.bedrooms + '-bed '}${sub.propertyType}
                            in ${sub.location
                                ? sub.location.cityOrCounty
                                : '—'}
                        </div>
                        <div class="listing-meta"
                             style="margin-bottom:4px;">
                            <span>${escapeHtml(description)}</span>
                        </div>
                        <div class="listing-meta">
                            <span class="badge badge-success">
                                ${typeLabels[listing.listingType] || listing.listingType}
                            </span>
                            <span style="font-weight:600;color:var(--text)">
                                ${prices.join(' · ')}
                            </span>
                            <span>
                                Contact: ${escapeHtml(listing.contactValue)}
                            </span>
                        </div>
                    </div>
                    <div class="listing-actions">
                        <a
                            href="list-property.html?submission=${sub.submissionID}&edit=1"
                            class="btn btn-sm btn-secondary"
                        >
                            Edit
                        </a>
                        <button
                            class="btn btn-sm btn-ghost"
                            onclick="pullDownListing(${sub.listing.listingID})"
                        >
                            Pull Down
                        </button>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
}

// Owner-typed text (descriptions, contact details) must not be rendered as HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// LOAD AND SHOW NOTIFICATIONS
async function loadNotifications() {
    try {
        const notifications = await apiFetch('/notifications');
        if (!notifications || notifications.length === 0) return;

        // Show the most recent notification
        const latest  = notifications[0];
        const banner  = document.getElementById('notificationBanner');
        const message = document.getElementById('notificationMessage');

        if (banner && message) {
            message.textContent = latest.message;
            banner.classList.add(
                'visible',
                latest.type === 'approval' ? 'approval' : 'rejection'
            );
        }
    } catch (error) {
        // Notifications are non-critical — fail silently
    }
}

// PULL DOWN LISTING
async function pullDownListing(listingID) {
    if (!confirm('Are you sure you want to pull down this listing?')) return;
    try {
        await apiFetch(`/listing/${listingID}/pulldown`, { method: 'PUT' });
        loadDashboard();
    } catch (error) {
        alert('Could not pull down listing. Please try again.');
    }
}

loadDashboard();