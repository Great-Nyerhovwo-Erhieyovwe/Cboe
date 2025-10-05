// login.js — GLOBAL SCOPE (SQL BACKEND)
document.addEventListener('DOMContentLoaded', () => {
    // 🌐 API Configuration: YOUR NEW DEPLOYED URL
    const API_BASE_URL = 'https://cboebackendapi.onrender.com';
    // 🛑 REMOVED: All references to window.auth and window.db as database operations are now server-side.
    
    // Get DOM elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePwd = document.getElementById('togglePwd');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = document.getElementById('modalIcon');
    const closeModalBtn = document.getElementById('closeModal');
    const modalSpinner = document.getElementById('modalSpinner');

    // 🔒 NEW: Prevent multiple submissions
    let isSubmitting = false;

    // Toggle password visibility
    if (togglePwd && passwordInput) {
        togglePwd.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePwd.classList.toggle('fa-eye-slash', isPassword);
            togglePwd.classList.toggle('fa-eye', !isPassword);
        });
    }

    // Show modal
    const showModal = (title, message, isError = true, showSpinner = false) => {
        if (modalTitle) modalTitle.textContent = title;
        if (modalMessage) modalMessage.textContent = message;
        if (modalIcon) {
            if (showSpinner) {
                modalIcon.style.display = 'none';
            } else {
                // Ensure icons are correctly set for Font Awesome
                modalIcon.className = `modal-icon fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}`;
                modalIcon.style.color = isError ? 'red' : 'green';
                modalIcon.style.display = 'inline';
            }
        }
        if (modalSpinner) modalSpinner.style.display = showSpinner ? 'block' : 'none';
        if (modal) modal.style.display = 'block';
    };

    // Close modal
    if (closeModalBtn) {
        closeModalBtn.onclick = () => { if (modal) modal.style.display = 'none'; };
    }
    if (modal) {
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }

    // Forgot password
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) {
                showModal('Error', 'Please enter your email address to send the reset link.', true);
                return;
            }

            showModal('Sending...', 'Requesting password reset link...', false, true);
            
            // 🌐 UPDATED: Call server endpoint using the deployed API_BASE_URL
            try {
                const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const result = await response.json();
                
                if (response.ok) {
                    showModal('Success', `Password reset link sent to ${email}. Check your inbox.`, false);
                } else {
                    let msg = result.message || 'Failed to send reset email.';
                    showModal('Error', msg, true);
                }
            } catch (error) {
                // 💥 CHANGE HERE: Replaced generic network error message with a specific login failure message
                console.error('Password reset error:', error);
                showModal('Error', 'Password reset failed. Please confirm the email address and try again.', true);
            }
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 🔒 Prevent multiple submissions
            if (isSubmitting) return;
            isSubmitting = true;

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            // In an SQL system, 'remember me' is usually handled by the server setting a longer-lived cookie/JWT.
            const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false; 

            // Validate
            if (!email || !password) {
                showModal('Error', 'Email and password are required.', true);
                isSubmitting = false;
                return;
            }

            showModal('Logging In...', 'Verifying credentials...', false, true);

            // 🌐 UPDATED: Call server endpoint using the deployed API_BASE_URL
            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, rememberMe })
                });

                const result = await response.json();

                if (response.ok) {
                    // Success: Server returns a token/sets a cookie. Client redirects.
                    // Assuming the server response includes user data like username for display
                    const username = result.username || email; 

                    showModal('Success', `Welcome back, ${username}!`, false);
                    setTimeout(() => {
                        window.location.href = '../dashboard/dashboard.html';
                    }, 1500);

                } else {
                    // Failure: Server returns an error (e.g., 401 Unauthorized, 403 Forbidden)
                    let msg = result.message || 'Login failed. Invalid credentials.';
                    
                    // Server must determine if account is banned/frozen and send appropriate message.
                    if (result.status === 'BANNED' || result.status === 'FROZEN') {
                        msg = result.message || 'Access Denied: Your account is restricted.';
                    }

                    showModal('Login Failed', msg, true);
                }

            } catch (error) {
                // 💥 CHANGE HERE: Replaced generic network error message with a specific login failure message
                console.error('Network or Server error:', error);
                showModal('Login Failed', 'Login failed. Please check your credentials and try again.', true);
            } finally {
                isSubmitting = false; // 🔓 Always reset
            }
        });
    }
});