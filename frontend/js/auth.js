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