// CONSTANTS
const API_BASE = 'http://127.0.0.1:8000';

// CORE FETCH HELPER
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Something went wrong');
        }

        return data;

    } catch (error) {
        throw error;
    }
}
// MULTIPART FETCH (for file uploads)
async function apiFetchForm(endpoint, formData, method = 'POST') {
    const token = localStorage.getItem('token');

    const headers = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Something went wrong');
        }

        return data;

    } catch (error) {
        throw error;
    }
}// AUTH HELPERS
function saveToken(token) {
    localStorage.setItem('token', token);
}

function getToken() {
    return localStorage.getItem('token');
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('client');
}

function saveClient(clientData) {
    localStorage.setItem('client', JSON.stringify(clientData));
}

function getClient() {
    const data = localStorage.getItem('client');
    return data ? JSON.parse(data) : null;
}

function isLoggedIn() {
    return !!localStorage.getItem('token');
}
// ── REDIRECT HELPERS ─────────────────────────────────────────
function redirectTo(page) {
    window.location.href = page;
}

function requireAuth() {
    if (!isLoggedIn()) {
        redirectTo('login.html');
    }
}

function requireAdminAuth() {
    const admin = localStorage.getItem('admin');
    if (!admin) {
        redirectTo('admin-login.html');
    }
}