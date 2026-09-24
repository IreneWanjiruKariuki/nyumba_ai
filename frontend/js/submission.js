window.addEventListener('beforeunload', function(e) {
    console.log('Page is about to unload');
});
// PROTECT PAGE
requireAuth();

// FORM SUBMIT
// Registered first, before anything else below has a chance to throw,
// so a later error can never leave the button without a handler and
// fall back to a native (page-reloading) form submission.
const submitForm = document.getElementById('submitForm');

if (submitForm) {
    submitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!validateForm()) return;

        const description = descField.value.trim();
        const locationID  = document.getElementById('locationID').value;
        const activeFiles = selectedFiles.filter(f => f !== null);

        // Build multipart form data
        const formData = new FormData();
        formData.append('description', description);
        formData.append('locationID',  locationID);
        activeFiles.forEach(file => {
            formData.append('images', file);
        });

        // Show loading
        document.getElementById('submitBtn').disabled      = true;
        document.getElementById('submitBtnText').style.opacity = '0.5';
        document.getElementById('submitSpinner')
            .classList.add('visible');

        try {
            console.log('Sending submission to backend...');

            const result = await apiFetchForm('/submissions', formData);

            console.log('Backend response:', result);
            console.log('About to show success message...');

            const successEl = document.getElementById('submitSuccess');
            console.log('Success element found:', successEl);

            if (successEl) {
                successEl.textContent =
                    'Property submitted successfully! ' +
                    'The administrator will review it shortly. ' +
                    'Redirecting to dashboard...';
                successEl.style.display      = 'block';
                successEl.style.padding      = '12px 16px';
                successEl.style.backgroundColor = '#DCFCE7';
                successEl.style.color        = '#166534';
                successEl.style.borderLeft   = '4px solid #52B788';
                successEl.style.borderRadius = '6px';
                successEl.style.marginBottom = '16px';
                successEl.style.fontSize     = '13.5px';
                successEl.style.fontWeight   = '500';
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });

            console.log('Success message shown. Redirecting in 2.5 seconds...');

            setTimeout(function() {
                window.location.href = 'owner-dashboard.html';
            }, 2500);

        } catch (error) {
            console.log('Error caught:', error);
            console.log('Error message:', error.message);

            const errorEl = document.getElementById('submitError');
            if (errorEl) {
                errorEl.textContent =
                    error.message || 'Submission failed. Please try again.';
                errorEl.style.display        = 'block';
                errorEl.style.padding        = '12px 16px';
                errorEl.style.backgroundColor = '#FEE2E2';
                errorEl.style.color          = '#B91C1C';
                errorEl.style.borderLeft     = '4px solid #B91C1C';
                errorEl.style.borderRadius   = '6px';
                errorEl.style.marginBottom   = '16px';
                errorEl.style.fontSize       = '13.5px';
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });

        } finally {
            const btn     = document.getElementById('submitBtn');
            const btnText = document.getElementById('submitBtnText');
            const spinner = document.getElementById('submitSpinner');

            if (btn)     btn.disabled          = false;
            if (btnText) btnText.style.opacity = '1';
            if (spinner) spinner.classList.remove('visible');
        }
    });
}

// POPULATE NAVBAR
const client    = getClient();
const firstName = client && client.name ? client.name.split(' ')[0] : '';
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

// CHARACTER COUNTER
const descField  = document.getElementById('description');
const charCount  = document.getElementById('charCount');

if (descField) {
    descField.addEventListener('input', () => {
        charCount.textContent = descField.value.length;
        document.getElementById('descriptionError')
            .classList.remove('visible');
        descField.classList.remove('error');
    });
}

// IMAGE UPLOAD AND PREVIEW
let selectedFiles = [];

const imageInput  = document.getElementById('imageInput');
const previewGrid = document.getElementById('previewGrid');
const uploadZone  = document.getElementById('uploadZone');

// Drag and drop
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
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    files.forEach(file => {
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            alert(`${file.name} is not a JPG or PNG file.`);
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
function validateForm() {
    let valid = true;

    const description = descField ? descField.value.trim() : '';
    const locationID  = document.getElementById('locationID').value;
    const activeFiles = selectedFiles.filter(f => f !== null);

    if (!description || description.length < 30) {
        document.getElementById('descriptionError')
            .classList.add('visible');
        if (descField) descField.classList.add('error');
        valid = false;
    }

    if (!locationID) {
        document.getElementById('locationError')
            .classList.add('visible');
        document.getElementById('locationID')
            .classList.add('error');
        valid = false;
    }

    if (activeFiles.length === 0) {
        document.getElementById('imageError')
            .classList.add('visible');
        valid = false;
    }

    return valid;
}
