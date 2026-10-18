// PROTECT PAGE
requireAuth();

// NAVBAR
const client    = getClient();
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

// STATE
let allListings = [];

const TYPE_LABELS = { sale: 'For Sale', rent: 'For Rent', both: 'Sale & Rent' };

const filterEls = {
    type:     document.getElementById('filterType'),
    location: document.getElementById('filterLocation'),
    property: document.getElementById('filterProperty'),
    bedrooms: document.getElementById('filterBedrooms'),
    sort:     document.getElementById('sortBy'),
};

// HELPERS
// Owner-typed text (descriptions, contact details) must not be rendered as HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function formatKES(amount) {
    return `KES ${Number(amount).toLocaleString()}`;
}

function imageUrl(image) {
    return `${API_BASE}/${image.filePath.replace(/\\/g, '/')}`;
}

function listingTitle(listing) {
    return listing.bedrooms === 0
        ? listing.propertyType
        : `${listing.bedrooms}-bed ${listing.propertyType}`;
}

function locationName(listing) {
    return listing.location ? listing.location.cityOrCounty : 'Nairobi';
}

function hasSale(listing)   { return listing.askingSalePrice   !== null; }
function hasRental(listing) { return listing.askingRentalPrice !== null; }

// WhatsApp links need the number in international format, e.g. 254712345678
function whatsappNumber(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('0'))   return '254' + digits.slice(1);
    return digits;
}

// LOAD DATA
async function loadLocations() {
    try {
        const locations = await apiFetch('/locations');
        locations.forEach(loc => {
            const option       = document.createElement('option');
            option.value       = loc.cityOrCounty;
            option.textContent = loc.cityOrCounty;
            filterEls.location.appendChild(option);
        });
    } catch (error) {
        console.error('Could not load locations:', error);
    }
}

async function loadListings() {
    try {
        allListings = await apiFetch('/listings');
        renderListings();
    } catch (error) {
        const errorEl = document.getElementById('browseError');
        errorEl.textContent = error.message || 'Could not load listings.';
        errorEl.classList.add('visible');
        document.getElementById('resultsCount').textContent = '';
    }
}

// FILTER AND SORT
function filteredListings() {
    const type     = filterEls.type.value;
    const location = filterEls.location.value;
    const property = filterEls.property.value;
    const bedrooms = filterEls.bedrooms.value;
    const sort     = filterEls.sort.value;

    const results = allListings.filter(listing => {
        if (type === 'sale' && !hasSale(listing))                 return false;
        if (type === 'rent' && !hasRental(listing))               return false;
        if (location && locationName(listing) !== location)       return false;
        if (property && listing.propertyType !== property)        return false;
        if (bedrooms === '0' && listing.bedrooms !== 0)           return false;
        if (bedrooms && bedrooms !== '0'
            && listing.bedrooms < Number(bedrooms))               return false;
        return true;
    });

    if (sort === 'newest') return results;   // API already returns newest first

    // Price sorting compares like with like: rent when browsing rentals,
    // otherwise sale prices first, followed by rent-only listings
    const byRent = type === 'rent';
    const key = listing => byRent || !hasSale(listing)
        ? listing.askingRentalPrice
        : listing.askingSalePrice;
    const group = listing => byRent || hasSale(listing) ? 0 : 1;
    const direction = sort === 'priceAsc' ? 1 : -1;

    return results.slice().sort((a, b) =>
        group(a) - group(b) || direction * (key(a) - key(b))
    );
}

// RENDER CARDS
function priceHtml(listing) {
    // Show the price that matches what the customer is looking for first
    const rentFirst = filterEls.type.value === 'rent' || !hasSale(listing);
    const sale = hasSale(listing)   ? formatKES(listing.askingSalePrice)        : null;
    const rent = hasRental(listing) ? `${formatKES(listing.askingRentalPrice)}/mo` : null;

    const [primary, secondary] = rentFirst ? [rent, sale] : [sale, rent];
    return `${primary}${secondary
        ? `<span class="secondary">or ${secondary}</span>`
        : ''}`;
}

function renderListings() {
    const grid    = document.getElementById('browseGrid');
    const results = filteredListings();

    document.getElementById('resultsCount').textContent =
        `${results.length} of ${allListings.length} ` +
        `listing${allListings.length === 1 ? '' : 's'}`;

    if (results.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <strong>${allListings.length === 0
                    ? 'No properties are listed yet'
                    : 'No listings match your filters'}</strong>
                <p>${allListings.length === 0
                    ? 'Check back soon for new verified listings.'
                    : 'Try a different neighbourhood or clear the filters.'}</p>
            </div>`;
        return;
    }

    grid.innerHTML = results.map(listing => {
        const image = listing.images.length > 0
            ? `<img src="${escapeHtml(imageUrl(listing.images[0]))}"
                    alt="${escapeHtml(listingTitle(listing))}" loading="lazy">`
            : 'No image';

        return `
            <button class="browse-card" data-id="${listing.listingID}">
                <div class="browse-card-image">
                    ${image}
                    <span class="type-tag">${TYPE_LABELS[listing.listingType]}</span>
                </div>
                <div class="browse-card-body">
                    <div class="browse-card-price">${priceHtml(listing)}</div>
                    <div class="browse-card-title">
                        ${escapeHtml(listingTitle(listing))}
                    </div>
                    <div class="browse-card-meta">
                        📍 ${escapeHtml(locationName(listing))}
                    </div>
                    <div class="browse-card-meta">
                        ${listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bd`}
                        · ${listing.bathrooms} ba
                        ${listing.sizeSqm > 0 ? `· ${listing.sizeSqm} m²` : ''}
                    </div>
                </div>
            </button>`;
    }).join('');
}

// DETAIL POPUP
const modal     = document.getElementById('listingModal');
const modalBody = document.getElementById('modalBody');
let lastFocused = null;

// "12% above the AI estimate of KES 10,000,000"
function estimateHtml(asking, predicted) {
    if (!predicted) return '';
    const diff = ((asking - predicted) / predicted) * 100;
    const rounded = Math.abs(diff).toFixed(0);

    if (rounded === '0') {
        return `In line with the AI estimate of ${formatKES(predicted)}`;
    }
    return `<span class="${diff > 0 ? 'above' : 'below'}">` +
           `${rounded}% ${diff > 0 ? 'above' : 'below'}</span> ` +
           `the AI estimate of ${formatKES(predicted)}`;
}

function contactAction(listing) {
    const value = listing.contactValue;
    switch (listing.contactMethod) {
        case 'whatsapp':
            return { label: 'Chat on WhatsApp',
                     href:  `https://wa.me/${whatsappNumber(value)}`,
                     detail: `WhatsApp: ${value}` };
        case 'email':
            return { label: 'Send an email',
                     href:  `mailto:${value}?subject=` +
                            encodeURIComponent(
                                `Enquiry: ${listingTitle(listing)} in ${locationName(listing)}`),
                     detail: `Email: ${value}` };
        default:
            return { label: 'Call owner',
                     href:  `tel:${value.replace(/\s/g, '')}`,
                     detail: `Phone: ${value}` };
    }
}

function openListing(listingID) {
    const listing = allListings.find(l => l.listingID === listingID);
    if (!listing) return;

    const prediction = listing.prediction || {};

    // Gallery
    const gallery = listing.images.length > 0
        ? `<div class="modal-gallery-main">
               <img id="modalMainImage"
                    src="${escapeHtml(imageUrl(listing.images[0]))}"
                    alt="${escapeHtml(listingTitle(listing))}">
           </div>
           ${listing.images.length > 1 ? `
           <div class="modal-thumbs">
               ${listing.images.map((img, i) => `
                   <button class="${i === 0 ? 'active' : ''}"
                           data-src="${escapeHtml(imageUrl(img))}"
                           aria-label="Show photo ${i + 1}">
                       <img src="${escapeHtml(imageUrl(img))}" alt="">
                   </button>`).join('')}
           </div>` : ''}`
        : `<div class="modal-gallery-main">No images available</div>`;

    // Prices, each compared with the AI estimate
    const priceBoxes = [];
    if (hasSale(listing)) {
        priceBoxes.push(`
            <div class="price-box">
                <div class="price-label">Asking sale price</div>
                <div class="price-amount">${formatKES(listing.askingSalePrice)}</div>
                <div class="price-estimate">
                    ${estimateHtml(listing.askingSalePrice, prediction.salePrice)}
                </div>
            </div>`);
    }
    if (hasRental(listing)) {
        priceBoxes.push(`
            <div class="price-box">
                <div class="price-label">Asking rent</div>
                <div class="price-amount">
                    ${formatKES(listing.askingRentalPrice)}<small>/mo</small>
                </div>
                <div class="price-estimate">
                    ${estimateHtml(listing.askingRentalPrice, prediction.rentalPrice)}
                </div>
            </div>`);
    }

    // Amenities
    const amenities = [];
    if (listing.hasParking)  amenities.push('🚗 Secure parking');
    if (listing.hasDSQ)      amenities.push('🏠 DSQ');
    if (listing.hasGarden)   amenities.push('🌿 Garden');
    if (listing.hasBorehole) amenities.push('💧 Borehole');
    amenities.push(listing.isFurnished ? '🛋️ Furnished' : 'Unfurnished');

    const contact = contactAction(listing);
    const listedOn = new Date(listing.createdAt).toLocaleDateString('en-KE', {
        day: 'numeric', month: 'short', year: 'numeric',
    });

    modalBody.innerHTML = `
        ${gallery}
        <div class="modal-content">
            <span class="badge badge-success">
                ${TYPE_LABELS[listing.listingType]}
            </span>
            <h2 id="modalTitle" style="margin-top:8px;">
                ${escapeHtml(listingTitle(listing))}
            </h2>
            <div class="modal-location">
                📍 ${escapeHtml(locationName(listing))}, Nairobi
                · Listed ${listedOn}
            </div>

            <div class="price-panel">${priceBoxes.join('')}</div>

            <div class="modal-section-title">Property details</div>
            <div class="facts-grid">
                <div class="fact">
                    <span class="fact-value">${escapeHtml(listing.propertyType)}</span>
                    <span class="fact-label">Type</span>
                </div>
                <div class="fact">
                    <span class="fact-value">${listing.bedrooms}</span>
                    <span class="fact-label">Bedrooms</span>
                </div>
                <div class="fact">
                    <span class="fact-value">${listing.bathrooms}</span>
                    <span class="fact-label">Bathrooms</span>
                </div>
                <div class="fact">
                    <span class="fact-value">
                        ${listing.sizeSqm > 0 ? `${listing.sizeSqm} m²` : '—'}
                    </span>
                    <span class="fact-label">Size</span>
                </div>
            </div>

            <div class="modal-section-title">Amenities</div>
            <div class="amenity-list">
                ${amenities.map(a => `<span class="amenity-chip">${a}</span>`).join('')}
            </div>

            <div class="modal-section-title">Description</div>
            <p class="modal-description">${escapeHtml(listing.description)}</p>

            <div class="contact-panel">
                <div>
                    <div class="contact-owner">
                        Listed by ${escapeHtml(listing.ownerName)}
                    </div>
                    <div class="contact-detail">${escapeHtml(contact.detail)}</div>
                </div>
                <a class="btn btn-primary"
                   href="${escapeHtml(contact.href)}"
                   ${listing.contactMethod === 'whatsapp'
                       ? 'target="_blank" rel="noopener"' : ''}>
                    ${contact.label}
                </a>
            </div>
        </div>`;

    // Thumbnail clicks swap the main photo
    modalBody.querySelectorAll('.modal-thumbs button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modalMainImage').src = btn.dataset.src;
            modalBody.querySelectorAll('.modal-thumbs button')
                .forEach(b => b.classList.toggle('active', b === btn));
        });
    });

    lastFocused = document.activeElement;
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    modal.scrollTop = 0;
    document.getElementById('modalClose').focus();
}

function closeListing() {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocused) lastFocused.focus();
}

document.getElementById('modalClose').addEventListener('click', closeListing);

// Clicking the dark area outside the popup closes it
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeListing();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('visible')) closeListing();
});

// Open the popup when a card is clicked
document.getElementById('browseGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.browse-card');
    if (card) openListing(Number(card.dataset.id));
});

// FILTER EVENTS
Object.values(filterEls).forEach(el => {
    el.addEventListener('change', renderListings);
});

document.getElementById('clearFilters').addEventListener('click', () => {
    filterEls.type.value     = '';
    filterEls.location.value = '';
    filterEls.property.value = '';
    filterEls.bedrooms.value = '';
    filterEls.sort.value     = 'newest';
    renderListings();
});

loadLocations();
loadListings();
