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

// LOAD LOCATIONS INTO DROPDOWN
async function loadLocations() {
    try {
        const locations = await apiFetch('/locations');
        const select    = document.getElementById('locationID');
        locations.forEach(loc => {
            const option       = document.createElement('option');
            option.value       = loc.locationID;
            option.textContent = loc.cityOrCounty;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Could not load locations:', error);
    }
}

loadLocations();

// CHECKBOX HIGHLIGHT
document.querySelectorAll('.checkbox-item input[type="checkbox"]')
    .forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.closest('.checkbox-item');
            if (label) {
                label.classList.toggle('checked', this.checked);
            }
        });
    });

// IMAGE UPLOAD AND PREVIEW
let selectedFiles = [];

const imageInput  = document.getElementById('imageInput');
const previewGrid = document.getElementById('previewGrid');
const uploadZone  = document.getElementById('uploadZone');

if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        handleFiles(Array.from(e.dataTransfer.files));
    });
}

if (imageInput) {
    imageInput.addEventListener('change', () => {
        handleFiles(Array.from(imageInput.files));
    });
}

function handleFiles(files) {
    const MAX_SIZE = 5 * 1024 * 1024;
    files.forEach(file => {
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            alert(`${file.name} must be a JPG or PNG file.`);
            return;
        }
        if (file.size > MAX_SIZE) {
            alert(`${file.name} exceeds the 5MB limit.`);
            return;
        }
        selectedFiles.push(file);
        addPreview(file, selectedFiles.length - 1);
    });
    document.getElementById('imageError')
        .classList.remove('visible');
}

function addPreview(file, index) {
    const reader  = new FileReader();
    reader.onload = (e) => {
        const div         = document.createElement('div');
        div.className     = 'preview-item';
        div.dataset.index = index;
        div.innerHTML     = `
            <img src="${e.target.result}" alt="Preview">
            <button
                class="remove-btn"
                type="button"
                onclick="removePreview(${index})"
            >✕</button>`;
        previewGrid.appendChild(div);
    };
    reader.readAsDataURL(file);
}

function removePreview(index) {
    selectedFiles[index] = null;
    const item = previewGrid.querySelector(
        `[data-index="${index}"]`
    );
    if (item) item.remove();
}

// FORM VALIDATION
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

// Clear errors on input
['propertyType', 'locationID', 'bedrooms',
 'bathrooms', 'sizeSqm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', () => {
            clearFieldError(id, `${id}Error`);
        });
    }
});

function validateForm() {
    let valid = true;

    const propertyType = document.getElementById('propertyType').value;
    const locationID   = document.getElementById('locationID').value;
    const bedrooms     = document.getElementById('bedrooms').value;
    const bathrooms    = document.getElementById('bathrooms').value;
    const sizeSqm      = document.getElementById('sizeSqm').value;
    const activeFiles  = selectedFiles.filter(f => f !== null);

    if (!propertyType) {
        showFieldError('propertyType', 'propertyTypeError');
        valid = false;
    }

    if (!locationID) {
        showFieldError('locationID', 'locationError');
        valid = false;
    }

    if (bedrooms === '') {
        showFieldError('bedrooms', 'bedroomsError');
        valid = false;
    }

    if (!bathrooms) {
        showFieldError('bathrooms', 'bathroomsError');
        valid = false;
    }

    if (!sizeSqm || parseFloat(sizeSqm) <= 0) {
        showFieldError('sizeSqm', 'sizeSqmError');
        valid = false;
    }

    if (activeFiles.length === 0) {
        document.getElementById('imageError')
            .classList.add('visible');
        valid = false;
    }

    return valid;
}

// FORM SUBMIT
const submitForm = document.getElementById('submitForm');

if (submitForm) {
    submitForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!validateForm()) return;

        const propertyType = document.getElementById('propertyType').value;
        const locationID   = document.getElementById('locationID').value;
        const bedrooms     = document.getElementById('bedrooms').value;
        const bathrooms    = document.getElementById('bathrooms').value;
        const sizeSqm      = document.getElementById('sizeSqm').value;
        const hasParking   = document.getElementById('hasParking').checked;
        const hasDSQ       = document.getElementById('hasDSQ').checked;
        const hasGarden    = document.getElementById('hasGarden').checked;
        const hasBorehole  = document.getElementById('hasBorehole').checked;
        const isFurnished  = document.getElementById('isFurnished').checked;
        const activeFiles  = selectedFiles.filter(f => f !== null);

        // Build multipart form data
        const formData = new FormData();
        formData.append('propertyType', propertyType);
        formData.append('locationID',   locationID);
        formData.append('bedrooms',     bedrooms);
        formData.append('bathrooms',    bathrooms);
        formData.append('sizeSqm',      sizeSqm);
        formData.append('hasParking',   hasParking);
        formData.append('hasDSQ',       hasDSQ);
        formData.append('hasGarden',    hasGarden);
        formData.append('hasBorehole',  hasBorehole);
        formData.append('isFurnished',  isFurnished);
        activeFiles.forEach(file => {
            formData.append('images', file);
        });

        // Show loading
        document.getElementById('submitBtn').disabled      = true;
        document.getElementById('submitBtnText').style.opacity = '0.5';
        document.getElementById('submitSpinner')
            .classList.add('visible');

        try {
            await apiFetchForm('/submissions', formData);

            const successEl =
                document.getElementById('submitSuccess');
            if (successEl) {
                successEl.textContent =
                    'Property submitted successfully. ' +
                    'The administrator will review your ' +
                    'submission shortly. Redirecting...';
                successEl.style.display         = 'block';
                successEl.style.padding         = '12px 16px';
                successEl.style.backgroundColor = '#DCFCE7';
                successEl.style.color           = '#166534';
                successEl.style.borderLeft      = '4px solid #52B788';
                successEl.style.borderRadius    = '6px';
                successEl.style.marginBottom    = '16px';
                successEl.style.fontSize        = '13.5px';
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(function() {
                window.location.href = 'owner-dashboard.html';
            }, 2500);

        } catch (error) {
            const errorEl = document.getElementById('submitError');
            if (errorEl) {
                errorEl.textContent =
                    error.message || 'Submission failed. Please try again.';
                errorEl.style.display         = 'block';
                errorEl.style.padding         = '12px 16px';
                errorEl.style.backgroundColor = '#FEE2E2';
                errorEl.style.color           = '#B91C1C';
                errorEl.style.borderLeft      = '4px solid #B91C1C';
                errorEl.style.borderRadius    = '6px';
                errorEl.style.marginBottom    = '16px';
                errorEl.style.fontSize        = '13.5px';
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } finally {
            document.getElementById('submitBtn').disabled      = false;
            document.getElementById('submitBtnText').style.opacity = '1';
            document.getElementById('submitSpinner')
                .classList.remove('visible');
        }
    });
}