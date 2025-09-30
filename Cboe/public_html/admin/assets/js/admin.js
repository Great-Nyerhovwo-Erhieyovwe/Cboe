// ./assets/js/admin.js (Final Fix)

import { 
    signInWithEmailAndPassword,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const auth = window.auth; // Assuming it's set globally

document.addEventListener('DOMContentLoaded', () => {
    
    if (typeof auth === 'undefined') {
        alert("❌ Firebase Auth not initialized. Check your Firebase configuration script.");
        return;
    }
    
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail'); 
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('adminLoginError');

    // 2. Auth State Listener (Checks if user is already logged in)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Logged in as:", user.email);
            
            // 🛑 CRITICAL FIX: Redirect to the correct relative path for the admin dashboard.
            // Assuming admin.html is at the root and admin/dashboard.html is the target.
            if (window.location.pathname.endsWith("admin.html")) {
                window.location.replace("admin/dashboard.html"); // <--- CORRECTED REDIRECT PATH
            }
        }
    });

    // ... (Login form submission logic remains the same)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            // ... (submission logic using signInWithEmailAndPassword)
            // ...
        });
    }
});