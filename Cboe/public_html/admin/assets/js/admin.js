// ./assets/js/admin.js (Updated for Firebase v12 modular SDK)

import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth === 'undefined') {
        console.error("Firebase Auth is not initialized. Check firebase-config.js.");
        return;
    }
    
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail'); 
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('adminLoginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.textContent = '';

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                errorMsg.textContent = 'Please enter both email and password.';
                return;
            }

            try {
                // ✅ Correct usage for modular SDK
                await signInWithEmailAndPassword(auth, email, password);

                console.log("Login successful. Redirecting to dashboard...");
                window.location.href = './dashboard.html'; 

            } catch (error) {
                console.error("Firebase Login Error:", error);

                let message = 'Login failed. Invalid email or password.';
                if (error.code === 'auth/invalid-email') {
                    message = 'Invalid email format.';
                } else if (error.code === 'auth/user-not-found') {
                    message = 'No account found with this email.';
                } else if (error.code === 'auth/wrong-password') {
                    message = 'Incorrect password.';
                }
                errorMsg.textContent = message;
            }
        });
    }
});