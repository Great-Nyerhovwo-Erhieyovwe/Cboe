// login.js — GLOBAL SCOPE (NO MODULES)
document.addEventListener('DOMContentLoaded', () => {
    // ✅ Access Firebase from global window
    const auth = window.auth;
    const db = window.db;

    if (!auth || !db) {
        alert("Firebase not loaded. Check console.");
        return;
    }

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
                modalIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
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
                showModal('Error', 'Please enter your email address.');
                return;
            }

            showModal('Sending...', 'Sending password reset link...', false, true);
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                showModal('Success', `Password reset link sent to ${email}.`, false);
            } catch (error) {
                let msg = 'Failed to send reset email.';
                if (error.code === 'auth/user-not-found') msg = 'Email not registered.';
                showModal('Error', msg, true);
            }
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            // Validate
            if (!email || !password) {
                showModal('Error', 'Email and password are required.');
                return;
            }

            // Set persistence
            try {
                await firebase.auth().setPersistence(
                    rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
                );
            } catch (e) {
                console.warn("Persistence setting failed:", e);
            }

            // Sign in
            showModal('Logging In...', 'Verifying credentials...', false, true);
            try {
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Fetch user profile
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    await firebase.auth().signOut();
                    showModal('Error', 'User profile not found. Contact support.', true);
                    return;
                }

                const userData = userDoc.data();
                if (userData.isBanned) {
                    await firebase.auth().signOut();
                    showModal('Access Denied', 'Your account is banned.', true);
                    return;
                }

                // Success
                showModal('Success', `Welcome back, ${userData.username || email}!`, false);
                setTimeout(() => {
                    window.location.href = '../dashboard/dashboard.html';
                }, 1500);

            } catch (error) {
                let msg = 'Invalid email or password.';
                if (error.code === 'auth/too-many-requests') {
                    msg = 'Too many attempts. Try again later.';
                }
                showModal('Login Failed', msg, true);
            }
        });
    }
});