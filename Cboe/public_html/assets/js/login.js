const loginForm = document.getElementById('loginForm');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalIcon = document.getElementById('modalIcon'); // Optional
const closeModal = document.getElementById('closeModal');
const modalSpinner = document.getElementById('modalSpinner'); // Optional

const toggle = document.getElementById('togglePwd');
const password = document.getElementById('password');

// 👁️ Toggle password visibility
toggle.addEventListener('click', () => {
    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    toggle.classList.toggle('fa-eye', !isPassword);
    toggle.classList.toggle('fa-eye-slash', isPassword);
    toggle.style.color = isPassword ? '#0066cc' : '#666';
});

// 📥 Handle login form submission
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
        showModal('Login Error', errors.join(' '));
        return;
    }

    try {
        // 🔍 Check credentials from JSON Server
        const response = await fetch(`http://localhost:5500/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(pwd)}`);
        const users = await response.json();

        if (users.length > 0) {
            const user = users[0];

            // ✅ Save session info
            sessionStorage.setItem('isUser', 'true');
            sessionStorage.setItem('user', JSON.stringify(user));

            // 🟢 Show success modal and redirect
            showModal('Login Successful', `Welcome back, ${user.username}! Redirecting to dashboard...`);

            setTimeout(() => {
                window.location.href = "../dashboard/dashboard.html";
            }, 2000);
        } else {
            // ❌ Invalid login
            showModal('Login Failed', 'Invalid email or password.');
        }

    } catch (err) {
        console.error('Login error:', err);
        showModal('Server Error', 'Something went wrong. Please try again later.');
    }
});

// 🧾 Show modal helper
function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.style.display = "block";
}

// ❌ Close modal handlers
closeModal.onclick = function () {
    modal.style.display = "none";
};

window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
};
