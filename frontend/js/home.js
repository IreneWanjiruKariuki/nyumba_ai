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