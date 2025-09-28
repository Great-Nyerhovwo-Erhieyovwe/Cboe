// --- Configuration (No longer needed, Firebase is initialized in HTML) ---
// const API_BASE_URL = 'https://cboejsonserver.onrender.com/api'; // ❌ REMOVED: Using Firebase

// 🛑 FIREBASE IMPORTS 🛑
import { 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// 🛑 FIREBASE SERVICES (Accessed globally from the HTML script) 🛑
const auth = window.auth;
const db = window.db; 

// --- DOM Elements ---
const loginForm = document.getElementById('loginForm');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalIcon = document.getElementById('modalIcon');
const closeModalBtn = document.getElementById('closeModal');
const modalSpinner = document.getElementById('modalSpinner');
const toggle = document.getElementById('togglePwd');
const password = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgotPasswordLink'); // NEW: Added in login.html update
const rememberMeCheckbox = document.getElementById('remember-me'); // NEW

// --- Helper Functions ---

// 👁️ Toggle password visibility
if (toggle && password) {
    toggle.addEventListener('click', () => {
        const isPassword = password.type === 'password';
        password.type = isPassword ? 'text' : 'password';
        // 💬 UPDATED: Changed class toggles to be clearer
        toggle.classList.toggle('fa-eye-slash', isPassword);
        toggle.classList.toggle('fa-eye', !isPassword); 
        toggle.style.color = isPassword ? '#666' : '#0066cc';
    });
}

// 🧾 Show modal helper
function showModal(title, message, isError = true, showSpinner = false) {
    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    if (modalIcon) {
        if (showSpinner) {
            modalIcon.className = 'hidden';
        } else {
            modalIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
            modalIcon.style.color = isError ? 'red' : 'green';
            modalIcon.classList.remove('hidden');
        }
    }
    if (modalSpinner) modalSpinner.style.display = showSpinner ? 'block' : 'none';
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

// 🔑 Forgot Password Handler (Firebase Auth)
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            showModal('Password Reset', 'Please enter your email address in the field above.', true);
            return;
        }

        showModal('Sending...', 'Sending password reset link...', false, true); // true for spinner

        try {
            await sendPasswordResetEmail(auth, email);
            showModal('Success!', `Password reset link sent to ${email}. Check your inbox.`, false);
        } catch (error) {
            console.error("Password reset error:", error);
            // 💬 IMPROVED ERROR HANDLING: Firebase error codes are more specific
            let message = "Failed to send reset email. Ensure the email is correct.";
            if (error.code === 'auth/user-not-found') {
                message = "That email is not registered.";
            }
            showModal('Password Reset Failed', message, true);
        }
    });
}


// 📥 Handle login form submission (Firebase Auth & Firestore)
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const pwd = password.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false; // NEW

        let errors = [];

        if (!email) errors.push('Email is required.');
        if (!pwd) errors.push('Password is required.');
        if (email && !emailPattern.test(email)) errors.push('Invalid email format.');

        if (errors.length > 0) {
            showModal('Login Error', errors.join(' '), true);
            return;
        }
        
        // Show loading state
        showModal('Logging In...', 'Verifying credentials...', false, true); // true for spinner

        try {
            // 1. 🔑 STEP 1: Set Persistence (Session or Local)
            if (auth) {
                await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            }
            
            // 2. 🔐 STEP 2: Sign in with Email and Password
            const userCredential = await signInWithEmailAndPassword(auth, email, pwd);
            const user = userCredential.user;
            
            // 3. 👤 STEP 3: Fetch User Profile from Firestore to check status
            const userDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) {
                // This means Auth succeeded but the Firestore profile is missing (Deleted/Error)
                // 💬 NEW: Handle missing Firestore profile
                await auth.signOut(); // Log them out immediately
                showModal('Account Error', '🚫 User profile data missing. Your account may be deactivated.', true);
                return; 
            }

            const userData = docSnap.data();

            // 4. 🚫 STEP 4: Check for Banned Status
            if (userData.isBanned === true) {
                // 💬 NEW: Log them out immediately and prevent dashboard access
                await auth.signOut(); 
                showModal('Access Denied', '🛑 Your account is banned. Contact support immediately.', true);
                return;
            }

            // 5. ✅ Successful Login
            
            // ❌ Removed JSON Server session storage logic: 
            // sessionStorage.setItem('isUser', 'true');
            // sessionStorage.setItem('user', JSON.stringify(user)); 
            // 💬 NOTE: Firebase Auth handles the session. The dashboard scripts now fetch user data via UID.

            // 🟢 Show success modal and redirect
            const username = userData.username || user.email; // Use Firestore data or email
            showModal('Login Successful', `Welcome back, ${username}! Redirecting to dashboard...`, false); 

            setTimeout(() => {
                window.location.href = "../dashboard/dashboard.html";
            }, 1500); // Reduced delay for faster UX

        } catch (error) {
            console.error('Firebase Login Error:', error);
            
            // 💬 IMPROVED ERROR HANDLING based on Firebase Auth codes
            let errorMessage = "An unexpected error occurred. Please try again.";

            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid email or password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email format.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Try again later.';
                    break;
                default:
                    errorMessage = error.message.replace('Firebase: ', '');
                    break;
            }
            showModal('Login Failed', errorMessage, true);
        }
    });
}