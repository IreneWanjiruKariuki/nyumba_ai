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
const params       = new URLSearchParams(window.location.search);
const submissionID = parseInt(params.get('submission'), 10);
const isEdit       = params.get('edit') === '1';

// Predicted prices for the submission being listed (filled on load)
let predictedSale   = null;
let predictedRental = null;

// The listing being edited (edit mode only)
let currentListing  = null;

// HELPERS
function formatKES(amount) {
    return `KES ${Number(amount).toLocaleString()}`;
}

function showError(message) {
    const errorEl = document.getElementById('listError');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showFieldError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.add('error');
    if (error) error.classList.add('visible');
}

function clearFieldError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.remove('error');
    if (error) error.classList.remove('visible');
}

function disableForm() {
    document.querySelectorAll('#listForm input, #listForm select, ' +
                              '#listForm textarea, #listForm button')
        .forEach(el => { el.disabled = true; });
}

// Percentage difference of a price from its prediction, e.g. 12.5 or -8
function percentDiff(price, predicted) {
    return ((price - predicted) / predicted) * 100;
}

// Build an editable description from the submission's structured fields
function buildDescription(sub) {
    const location = sub.location ? sub.location.cityOrCounty : 'Nairobi';
    const rooms    = sub.bedrooms === 0
        ? `${sub.propertyType}`
        : `${sub.bedrooms}-bedroom ${sub.propertyType.toLowerCase()}`;

    const lines = [
        `${rooms} located in ${location}, Nairobi.`,
        `It has ${sub.bathrooms} bathroom${sub.bathrooms === 1 ? '' : 's'}` +
        (sub.sizeSqm > 0 ? ` and a total area of ${sub.sizeSqm} square metres.` : '.'),
    ];

    const amenities = [];
    if (sub.hasParking)  amenities.push('secure parking');
    if (sub.hasDSQ)      amenities.push('a DSQ (staff quarters)');
    if (sub.hasGarden)   amenities.push('a garden');
    if (sub.hasBorehole) amenities.push('a borehole');

    if (amenities.length === 1) {
        lines.push(`The property comes with ${amenities[0]}.`);
    } else if (amenities.length > 1) {
        const last = amenities.pop();
        lines.push(`The property comes with ${amenities.join(', ')} and ${last}.`);
    }

    lines.push(sub.isFurnished
        ? 'The property is fully furnished.'
        : 'The property is unfurnished.');

    return lines.join(' ');
}

// LOAD THE SUBMISSION BEING LISTED
async function loadSubmission() {
    if (!submissionID) {
        showError('No property selected. Go back to your dashboard ' +
                  'and click "List Property" on an approved submission.');
        disableForm();
        return;
    }

    try {
        const submissions = await apiFetch('/submissions');
        const sub = submissions.find(s => s.submissionID === submissionID);

        if (!sub) {
            showError('Submission not found.');
            disableForm();
            return;
        }

        if (sub.status !== 'approved' || !sub.prediction) {
            showError('Only approved submissions with a price ' +
                      'prediction can be listed.');
            disableForm();
            return;
        }

        const hasActiveListing = sub.listing && sub.listing.status === 'active';

        if (isEdit && !hasActiveListing) {
            showError('This property has no active listing to edit.');
            disableForm();
            return;
        }

        if (!isEdit && hasActiveListing) {
            showError('This property is already listed. You can manage ' +
                      'it from "My Active Listings" on your dashboard.');
            disableForm();
            return;
        }

        predictedSale   = sub.prediction.salePrice;
        predictedRental = sub.prediction.rentalPrice;

        document.getElementById('predictedSale').textContent =
            formatKES(predictedSale);
        document.getElementById('predictedRental').textContent =
            formatKES(predictedRental) + '/mo';

        // Price fields stay blank; the prediction is only a placeholder
        document.getElementById('askingSalePrice').placeholder =
            `Predicted: ${Number(predictedSale).toLocaleString()}`;
        document.getElementById('askingRentalPrice').placeholder =
            `Predicted: ${Number(predictedRental).toLocaleString()}`;

        if (isEdit) {
            fillFromListing(sub.listing);
        } else {
            document.getElementById('description').value = buildDescription(sub);
        }

    } catch (error) {
        showError(error.message || 'Could not load your submission.');
        disableForm();
    }
}

// EDIT MODE: SWITCH THE PAGE TEXT AND PREFILL THE CURRENT LISTING
function fillFromListing(listing) {
    currentListing = listing;

    document.title = 'Edit Listing — NyumbaAI';
    document.getElementById('pageTitle').textContent = 'Edit Your Listing';
    document.getElementById('pageSubtitle').textContent =
        'Update the description, asking price or contact details ' +
        'of your active listing';
    document.getElementById('progressSteps').style.display = 'none';
    document.getElementById('listBtnText').textContent = 'Save Changes';

    listingTypeEl.value = listing.listingType;
    updatePriceFields();

    document.getElementById('description').value = listing.description;

    // Fill the prices and fire 'input' so the deviation hints update
    [['askingSalePrice',   listing.askingSalePrice],
     ['askingRentalPrice', listing.askingRentalPrice]].forEach(([id, price]) => {
        const input = document.getElementById(id);
        input.value = price !== null ? price : '';
        input.dispatchEvent(new Event('input'));
    });

    // Set the method first so its change handler updates the label,
    // then put back the saved contact value
    contactMethodEl.value = listing.contactMethod;
    contactMethodEl.dispatchEvent(new Event('change'));
    contactValueEl.value  = listing.contactValue;
}

loadSubmission();

// SHOW ONLY THE PRICE FIELDS THAT MATCH THE LISTING TYPE
const listingTypeEl = document.getElementById('listingType');

function updatePriceFields() {
    const type = listingTypeEl.value;
    document.getElementById('salePriceGroup')
        .classList.toggle('hidden', type === 'rent');
    document.getElementById('rentalPriceGroup')
        .classList.toggle('hidden', type === 'sale');
}

listingTypeEl.addEventListener('change', () => {
    clearFieldError('listingType', 'listingTypeError');
    updatePriceFields();
});

// LIVE HINT: HOW FAR THE ENTERED PRICE IS FROM THE PREDICTION
function updatePriceDiff(inputId, hintId, getPredicted) {
    const input = document.getElementById(inputId);
    const hint  = document.getElementById(hintId);

    input.addEventListener('input', () => {
        clearFieldError(inputId, `${inputId}Error`);
        const price     = parseFloat(input.value);
        const predicted = getPredicted();

        hint.classList.remove('deviates', 'matches');
        if (!price || !predicted) {
            hint.textContent = '';
            return;
        }

        const diff = percentDiff(price, predicted);
        if (diff === 0) {
            hint.textContent = 'Matches the predicted price';
            hint.classList.add('matches');
        } else {
            hint.textContent =
                `${Math.abs(diff).toFixed(1)}% ` +
                `${diff > 0 ? 'above' : 'below'} the predicted price`;
            hint.classList.add('deviates');
        }
    });
}

updatePriceDiff('askingSalePrice',   'salePriceDiff',   () => predictedSale);
updatePriceDiff('askingRentalPrice', 'rentalPriceDiff', () => predictedRental);

// CONTACT METHOD: ADJUST LABEL AND PREFILL EMAIL
const contactMethodEl = document.getElementById('contactMethod');
const contactValueEl  = document.getElementById('contactValue');

contactMethodEl.addEventListener('change', () => {
    const method = contactMethodEl.value;
    const label  = document.getElementById('contactValueLabel');

    clearFieldError('contactValue', 'contactValueError');

    if (method === 'email') {
        label.textContent          = 'Email address  *';
        contactValueEl.placeholder = 'e.g. you@example.com';
        if (!contactValueEl.value && client) contactValueEl.value = client.email;
    } else {
        label.textContent = method === 'whatsapp'
            ? 'WhatsApp number  *'
            : 'Phone number  *';
        contactValueEl.placeholder = 'e.g. 0712 345 678';
        if (client && contactValueEl.value === client.email) {
            contactValueEl.value = '';
        }
    }
});

['description', 'contactValue'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        clearFieldError(id, `${id}Error`);
    });
});

// VALIDATION
function validateForm() {
    let valid = true;

    const type        = listingTypeEl.value;
    const description = document.getElementById('description').value.trim();
    const salePrice   = parseFloat(document.getElementById('askingSalePrice').value);
    const rentPrice   = parseFloat(document.getElementById('askingRentalPrice').value);
    const method      = contactMethodEl.value;
    const contact     = contactValueEl.value.trim();

    if (!type) {
        showFieldError('listingType', 'listingTypeError');
        valid = false;
    }

    if (description.length < 20 || description.length > 2000) {
        showFieldError('description', 'descriptionError');
        valid = false;
    }

    if ((type === 'sale' || type === 'both') && !(salePrice > 0)) {
        showFieldError('askingSalePrice', 'askingSalePriceError');
        valid = false;
    }

    if ((type === 'rent' || type === 'both') && !(rentPrice > 0)) {
        showFieldError('askingRentalPrice', 'askingRentalPriceError');
        valid = false;
    }

    const contactValid = method === 'email'
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
        : /^\+?[\d\s-]{9,15}$/.test(contact);

    if (!contactValid) {
        showFieldError('contactValue', 'contactValueError');
        valid = false;
    }

    return valid;
}

// Ask the owner to confirm any price that differs from the prediction.
// When editing, a price left unchanged was already confirmed, so it is skipped.
// Returns true if there is no deviation or the owner confirms it.
function confirmDeviations(type, salePrice, rentPrice) {
    const deviations = [];
    const unchanged  = (price, field) =>
        currentListing !== null && price === currentListing[field];

    if ((type === 'sale' || type === 'both') && salePrice !== predictedSale
            && !unchanged(salePrice, 'askingSalePrice')) {
        const diff = percentDiff(salePrice, predictedSale);
        deviations.push(
            `• Sale price: ${formatKES(salePrice)} is ` +
            `${Math.abs(diff).toFixed(1)}% ${diff > 0 ? 'above' : 'below'} ` +
            `the predicted ${formatKES(predictedSale)}`
        );
    }

    if ((type === 'rent' || type === 'both') && rentPrice !== predictedRental
            && !unchanged(rentPrice, 'askingRentalPrice')) {
        const diff = percentDiff(rentPrice, predictedRental);
        deviations.push(
            `• Monthly rent: ${formatKES(rentPrice)} is ` +
            `${Math.abs(diff).toFixed(1)}% ${diff > 0 ? 'above' : 'below'} ` +
            `the predicted ${formatKES(predictedRental)}`
        );
    }

    if (deviations.length === 0) return true;

    return confirm(
        'Your asking price differs from the predicted price:\n\n' +
        deviations.join('\n') +
        '\n\nAre you sure you want to deviate from the predicted price?'
    );
}

// FORM SUBMIT
document.getElementById('listForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    document.getElementById('listError').classList.remove('visible');
    if (!validateForm()) return;

    const type      = listingTypeEl.value;
    const salePrice = parseFloat(document.getElementById('askingSalePrice').value);
    const rentPrice = parseFloat(document.getElementById('askingRentalPrice').value);

    if (!confirmDeviations(type, salePrice, rentPrice)) return;

    const payload = {
        submissionID:      submissionID,
        listingType:       type,
        askingSalePrice:   type === 'rent' ? null : salePrice,
        askingRentalPrice: type === 'sale' ? null : rentPrice,
        description:       document.getElementById('description').value.trim(),
        contactMethod:     contactMethodEl.value,
        contactValue:      contactValueEl.value.trim(),
    };

    const listBtn = document.getElementById('listBtn');
    listBtn.disabled = true;
    document.getElementById('listBtnText').style.opacity = '0.5';
    document.getElementById('listSpinner').classList.add('visible');

    try {
        if (isEdit) {
            delete payload.submissionID;
            await apiFetch(`/listings/${currentListing.listingID}`, {
                method: 'PUT',
                body:   JSON.stringify(payload),
            });
        } else {
            await apiFetch('/listings', {
                method: 'POST',
                body:   JSON.stringify(payload),
            });
        }

        const successEl = document.getElementById('listSuccess');
        successEl.textContent =
            (isEdit
                ? 'Your listing has been updated successfully. '
                : 'Your property has been listed successfully. ') +
            'Redirecting to your dashboard...';
        successEl.classList.add('visible');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => redirectTo('owner-dashboard.html'), 2000);

    } catch (error) {
        showError(error.message || (isEdit
            ? 'Could not save your changes.'
            : 'Could not publish your listing.'));
        listBtn.disabled = false;
        document.getElementById('listBtnText').style.opacity = '1';
        document.getElementById('listSpinner').classList.remove('visible');
    }
});
