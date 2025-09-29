// ./assets/js/admin.js

import { 
  signInWithEmailAndPassword,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth === 'undefined') {
        alert("❌ Firebase Auth not initialized. Check firebase-config.js.");
        return;
    }
    
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail'); 
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('adminLoginError');

    // ✅ Only redirect if we're on login page AND user is already signed in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Logged in as:", user.email);
            if (window.location.pathname.endsWith("admin.html")) {
                window.location.replace("dashboard.html");
            }
        }
    });

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
                console.log("🔑 Attempting login with:", email);
                await signInWithEmailAndPassword(auth, email, password);
                console.log("✅ Login success — redirect will happen in onAuthStateChanged");
            } catch (error) {
                console.error("❌ Firebase Login Error:", error);
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