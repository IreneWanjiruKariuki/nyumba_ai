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
}