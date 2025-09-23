document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    const usernameInput = document.getElementById('adminUsername');
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('adminLoginError');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = usernameInput.value;
        const password = passwordInput.value;

        if (username === 'admin' && password === 'password123') {
            sessionStorage.setItem('isAdmin', 'true');
            window.location.href = './dashboard.html';
        } else {
            errorMsg.textContent = 'Invalid credentials!.';
        }
    });
});