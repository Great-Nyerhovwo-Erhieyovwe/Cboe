// ./assets/js/admin.js (Final Code)

import { 
    signInWithEmailAndPassword,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Assuming 'auth' is initialized and set globally by a separate Firebase config script
const auth = window.auth; 

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initial check for Firebase Auth service availability
    if (typeof auth === 'undefined') {
        alert("❌ Firebase Auth not initialized. Check your Firebase configuration script.");
        return;
    }
    
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail'); 
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('adminLoginError');

    // 2. Auth State Listener: Handles immediate redirect if the user is ALREADY logged in.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Logged in as:", user.email);
            
            // Redirect to the Admin Dashboard (admin/dashboard.html)
            if (window.location.pathname.endsWith("admin.html")) {
                window.location.replace("admin/dashboard.html"); 
            }
        }
    });

    // 3. Login Form Submission Handler
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
                console.log("🔑 Attempting admin login with:", email);
                // signInWithEmailAndPassword triggers the onAuthStateChanged listener on success.
                await signInWithEmailAndPassword(auth, email, password);
                
                // Clear inputs while awaiting redirect
                emailInput.value = '';
                passwordInput.value = '';

            } catch (error) {
                console.error("❌ Firebase Login Error:", error);
                let message = 'Login failed. Invalid email or password.';
                
                // Detailed error messaging
                if (error.code === 'auth/too-many-requests') {
                    message = 'Access temporarily blocked due to too many failed attempts.';
                } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                    message = 'Incorrect email or password.';
                }
                
                errorMsg.textContent = message;
            }
        });
    }
});