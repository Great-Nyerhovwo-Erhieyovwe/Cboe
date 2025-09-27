// --- Configuration ---
const API_BASE_URL = 'https://cboejsonserver.onrender.com/api';

// --- DOM Elements ---
const loginForm = document.getElementById('loginForm');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalIcon = document.getElementById('modalIcon'); // Optional
const closeModalBtn = document.getElementById('closeModal'); // Renamed to avoid conflict
const modalSpinner = document.getElementById('modalSpinner'); // Optional

const toggle = document.getElementById('togglePwd');
const password = document.getElementById('password');

// 👁️ Toggle password visibility
if (toggle && password) {
    toggle.addEventListener('click', () => {
        const isPassword = password.type === 'password';
        password.type = isPassword ? 'text' : 'password';
        toggle.classList.toggle('fa-eye', !isPassword);
        toggle.classList.toggle('fa-eye-slash', isPassword);
        // Assuming your toggle is a font-awesome icon:
        if (toggle.classList.contains('fa-eye')) {
            toggle.style.color = '#0066cc';
        } else {
            toggle.style.color = '#666';
        }
    });
}

// 🧾 Show modal helper
function showModal(title, message, isError = true) {
    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    if (modalIcon) {
        // Simple icon handling: check the title or error flag
        modalIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        modalIcon.style.color = isError ? 'red' : 'green';
    }
    if (modalSpinner) modalSpinner.style.display = 'none'; // Hide spinner if present
    if (modal) modal.style.display = "block";
}

// ❌ Close modal handlers
if (closeModalBtn) {
    closeModalBtn.onclick = function () {
        if (modal) modal.style.display = "none";
    };
}

window.onclick = function (event) {
    if (event.target === modal) {
        if (modal) modal.style.display = "none";
    }
};

// 📥 Handle login form submission
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const pwd = password.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        let errors = [];

        if (!email) errors.push('Email is required.');
        if (!pwd) errors.push('Password is required.');
        if (email && !emailPattern.test(email)) errors.push('Invalid email format.');
        if (pwd && pwd.length < 6) errors.push('Password must be at least 6 characters.');

        if (errors.length > 0) {
            showModal('Login Error', errors.join(' '), true);
            return;
        }

        try {
            // 1. 🔍 STEP 1: Check if a user with this email EXISTS (regardless of password)
            const existsResponse = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(email)}`);
            
            if (!existsResponse.ok) {
                throw new Error("Could not connect to the authentication server.");
            }

            const existingUsers = await existsResponse.json();

            // 🛑 NEW CHECK: ACCOUNT DELETED ENFORCEMENT 🛑
            if (existingUsers.length === 0) {
                // If no user is found by email, treat it as a deleted account.
                // NOTE: Using a specific message for security reasons is generally discouraged,
                // but we honor the user request here.
                showModal('Account Deactivated', '🚫 Your account has been deleted. Please contact support to see why.', true);
                return; // STOP execution
            }

            const user = existingUsers[0]; // User exists, now check credentials and status

            // 2. 🔑 STEP 2: Check password (Client-side match, as JSON Server doesn't support POST/hash)
            if (user.password !== pwd) {
                 // To maintain security, use a generic message if the password fails
                 showModal('Login Failed', 'Invalid email or password.', true);
                 return; // STOP execution
            }

            // 3. 🚫 STEP 3: Check for Banned Status
            if (user.isBanned === true) {
                showModal('Access Denied', '🛑 Your account is banned. Contact support immediately.', true);
                return; // STOP execution
            }

            // 4. ✅ Successful Login
            
            // Save session info (use the user object fetched, which has the latest statuses)
            sessionStorage.setItem('isUser', 'true');
            sessionStorage.setItem('user', JSON.stringify(user));

            // 🟢 Show success modal and redirect
            showModal('Login Successful', `Welcome back, ${user.username}! Redirecting to dashboard...`, false); // false for success

            setTimeout(() => {
                window.location.href = "../dashboard/dashboard.html";
            }, 2000);

        } catch (err) {
            console.error('Login error:', err);
            showModal('Server Error', err.message || 'Something went wrong. Please try again later.', true);
        }
    });
}