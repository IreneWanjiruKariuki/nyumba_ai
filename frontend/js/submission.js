// PROTECT PAGE
requireAuth();

// POPULATE NAVBAR
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