// ./assets/js/admin.js (Updated for Firebase Auth)

document.addEventListener('DOMContentLoaded', () => {
    // Ensure 'auth' is globally defined in your firebase-config.js
    if (typeof auth === 'undefined') {
        console.error("Firebase Auth is not initialized. Check firebase-config.js.");
        return;
    }
    
    const loginForm = document.getElementById('adminLoginForm');
    
    // 🛑 IMPORTANT: Input IDs must match the updated HTML (Email/Password)
    const emailInput = document.getElementById('adminEmail'); 
    const passwordInput = document.getElementById('adminPassword');
    
    const errorMsg = document.getElementById('adminLoginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.textContent = ''; // Clear previous errors

            const email = emailInput.value;
            const password = passwordInput.value;
            
            // Basic input validation
            if (!email || !password) {
                errorMsg.textContent = 'Please enter both email and password.';
                return;
            }

            try {
                // 1. Sign in with Firebase Authentication (Server-side check)
                await auth.signInWithEmailAndPassword(email, password);

                // 2. Successful authentication. 
                //    Redirect to the dashboard (index.html), which will perform the 
                //    SECURE Admin Role Check using Firestore Security Rules.
                console.log("Login successful. Checking admin status on dashboard page...");
                window.location.href = './dashboard.html'; 

            } catch (error) {
                console.error("Firebase Login Error:", error);
                
                // Display user-friendly error messages
                let message = 'Login failed. Invalid email or password.';
                if (error.code === 'auth/invalid-email') {
                    message = 'Invalid email format.';
                }
                errorMsg.textContent = message;
            }
        });
    }
});