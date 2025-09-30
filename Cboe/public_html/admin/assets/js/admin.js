import { 
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

/* ===========================
    FIREBASE CONFIGURATION
    
    NOTE: Use your actual Firebase project settings here.
    =========================== */
const firebaseConfig = {
    apiKey: "AIzaSyBTGdLyfpv9xzmh5hYoctay0Ev4W4lpAjM", 
    authDomain: "cboefirebaseserver.firebaseapp.com",
    projectId: "cboefirebaseserver",
    storageBucket: "cboefirebaseserver.firebasestorage.app",
    messagingSenderId: "755491003217",
    appId: "1:755491003217:web:2a10ffad1f38c9942f5170"
};

/* ===========================
    FIREBASE INITIALIZATION
    =========================== */
let app;
// Initialize app if it hasn't been already
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}
const auth = getAuth(app);


document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail'); 
    const passwordInput = document.getElementById('adminPassword');
    const errorMsg = document.getElementById('adminLoginError');

    // --- 1. Auth State Listener (Redirects if a user is already logged in) ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Logged in user detected. Redirecting to dashboard...");
            
            // PATH IS CORRECT: admin.html and dashboard.html are siblings in the 'admin/' folder.
            if (window.location.pathname.endsWith("admin.html")) {
                window.location.replace("dashboard.html"); 
            }
        }
    });

    // --- 2. Login Form Submission Handler ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.textContent = ''; // Clear any previous error message

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                errorMsg.textContent = 'Please enter both email and password.';
                return;
            }

            try {
                console.log("🔑 Attempting admin login...");
                // On success, the onAuthStateChanged listener above handles the redirection.
                await signInWithEmailAndPassword(auth, email, password);
                
                // Clear inputs while awaiting redirect
                emailInput.value = '';
                passwordInput.value = '';

            } catch (error) {
                console.error("❌ Firebase Login Error:", error);
                
                let message = 'Login failed. Please check your credentials.';
                
                // User-friendly error mapping
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                    message = 'Incorrect email or password.';
                } else if (error.code === 'auth/too-many-requests') {
                    message = 'Access temporarily blocked due to too many failed attempts.';
                }
                
                errorMsg.textContent = message;
            }
        });
    }
});