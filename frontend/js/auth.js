// VALIDATION HELPERS 
function showError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.add('error');
    if (error) error.classList.add('visible');
}

function clearError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.remove('error');
    if (error) error.classList.remove('visible');
}

function clearAllErrors() {
    document.querySelectorAll('.form-error').forEach(el => {
        el.classList.remove('visible');
    });
    document.querySelectorAll('.form-group input').forEach(el => {
        el.classList.remove('error');
    });
}

function showAlert(alertId, message) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.textContent = message;
        alert.classList.add('visible');
    }
}

function hideAlert(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.textContent = '';
        alert.classList.remove('visible');
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setLoading(btnId, textId, spinnerId, loading) {
    const btn     = document.getElementById(btnId);
    const text    = document.getElementById(textId);
    const spinner = document.getElementById(spinnerId);
    if (btn)     btn.disabled = loading;
    if (text)    text.style.opacity = loading ? '0.5' : '1';
    if (spinner) spinner.classList.toggle('visible', loading);
}
// CLEAR ERRORS ON INPUT
document.querySelectorAll('.form-group input').forEach(input => {
    input.addEventListener('input', () => {
        clearError(input.id, `${input.id}Error`);
        hideAlert('loginError');
        hideAlert('registerError');
    });
});
// LOGIN FORM
const loginForm = document.getElementById('loginForm');

if (loginForm) {

    // Redirect if already logged in
    if (isLoggedIn()) {
        redirectTo('home.html');
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();
        hideAlert('loginError');

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // VALIDATION
        let valid = true;

        if (!email || !isValidEmail(email)) {
            showError('email', 'emailError');
            valid = false;
        }

        if (!password || password.length < 6) {
            showError('password', 'passwordError');
            valid = false;
        }

        if (!valid) return;

        // SUBMIT
        setLoading('loginBtn', 'loginBtnText', 'loginSpinner', true);

        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            saveToken(data.access_token);
            saveClient(data.client);
            redirectTo('home.html');

        } catch (error) {
            showAlert('loginError', error.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading('loginBtn', 'loginBtnText', 'loginSpinner', false);
        }
    });
}
// REGISTER FORM
const registerForm = document.getElementById('registerForm');

if (registerForm) {

    // Redirect if already logged in
    if (isLoggedIn()) {
        redirectTo('home.html');
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();
        hideAlert('registerError');
        hideAlert('registerSuccess');

        const name            = document.getElementById('name').value.trim();
        const email           = document.getElementById('email').value.trim();
        const password        = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // VALIDATION
        let valid = true;

        if (!name || name.length < 2) {
            showError('name', 'nameError');
            valid = false;
        }

        if (!email || !isValidEmail(email)) {
            showError('email', 'emailError');
            valid = false;
        }

        if (!password || password.length < 6) {
            showError('password', 'passwordError');
            valid = false;
        }

        if (!confirmPassword || confirmPassword !== password) {
            showError('confirmPassword', 'confirmPasswordError');
            valid = false;
        }

        if (!valid) return;

        // SUBMIT
        setLoading('registerBtn', 'registerBtnText', 'registerSpinner', true);

        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password }),
            });

            showAlert('registerSuccess',
                'Account created successfully. Redirecting to login...');

            setTimeout(() => redirectTo('login.html'), 2000);

        } catch (error) {
            showAlert('registerError',
                error.message || 'Registration failed. Please try again.');
        } finally {
            setLoading('registerBtn', 'registerBtnText', 'registerSpinner', false);
        }
    });
}
// ADMIN LOGIN FORM
const adminLoginForm = document.getElementById('adminLoginForm');

if (adminLoginForm) {

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();
        hideAlert('adminLoginError');

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // VALIDATION
        let valid = true;

        if (!email || !isValidEmail(email)) {
            showError('email', 'emailError');
            valid = false;
        }

        if (!password) {
            showError('password', 'passwordError');
            valid = false;
        }

        if (!valid) return;

        // SUBMIT
        setLoading('adminLoginBtn', 'adminLoginBtnText', 'adminLoginSpinner', true);

        try {
            const data = await apiFetch('/admin/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            localStorage.setItem('admin', JSON.stringify(data.administrator));
            localStorage.setItem('adminToken', data.access_token);
            redirectTo('admin-dashboard.html');

        } catch (error) {
            showAlert('adminLoginError',
                error.message || 'Login failed. Invalid administrator credentials.');
        } finally {
            setLoading('adminLoginBtn', 'adminLoginBtnText', 'adminLoginSpinner', false);
        }
    });
}