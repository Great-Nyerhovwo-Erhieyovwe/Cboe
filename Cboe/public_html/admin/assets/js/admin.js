// ./assets/js/admin.js

import { 
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import { 
    getAuth, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* ===========================
    FIREBASE CONFIGURATION
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
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}
const auth = getAuth(app);
const db = getFirestore(app);

/* ===========================
    ADMIN CHECK FUNCTION
   =========================== */
async function isAdmin(user) {
    try {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);
        return adminSnap.exists() && adminSnap.data().isAdmin === true;
    } catch (err) {
        console.error("Error checking admin:", err);
        return false;
    }
}

/* ===========================
    DOM LOADED
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("adminLoginForm");
    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");
    const errorMsg = document.getElementById("adminLoginError");

    // --- 1. Auth State Listener ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("✅ Logged in user detected, checking admin privileges...");
            const allowed = await isAdmin(user);
            if (allowed) {
                console.log("✅ User is admin. Redirecting...");
                if (window.location.pathname.endsWith("admin.html")) {
                    window.location.replace("dashboard.html");
                }
            } else {
                console.warn("❌ Not an admin. Signing out...");
                await signOut(auth);
                errorMsg.textContent = "You are not authorized as admin.";
            }
        }
    });

    // --- 2. Login Form Submission ---
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorMsg.textContent = "";

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                errorMsg.textContent = "Please enter both email and password.";
                return;
            }

            try {
                console.log("🔑 Attempting admin login...");
                await signInWithEmailAndPassword(auth, email, password);

                // Inputs cleared while awaiting redirect
                emailInput.value = "";
                passwordInput.value = "";
            } catch (error) {
                console.error("❌ Firebase Login Error:", error);
                let message = "Login failed. Please check your credentials.";
                if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found") {
                    message = "Incorrect email or password.";
                } else if (error.code === "auth/too-many-requests") {
                    message = "Access temporarily blocked due to too many failed attempts.";
                }
                errorMsg.textContent = message;
            }
        });
    }
});