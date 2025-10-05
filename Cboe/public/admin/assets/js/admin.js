// assets/js/admin.js

// --- Configuration ---
// The base URL for your running backend server (must match the port)
const API_BASE_URL = 'http://localhost:3000/api'; 
const ADMIN_DASHBOARD_PATH = './admin-dashboard.html';

document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const errorDiv = document.getElementById("adminLoginError");

    errorDiv.textContent = ""; // clear old errors

    try {
        // 1. Send Login Request to your Node.js/Express Backend
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        // 2. Handle the Server Response
        const data = await response.json();

        if (response.ok) {
            // Check if the user is an admin based on the server response
            // NOTE: Your server's login endpoint must return an 'isAdmin' flag or similar.
            // If it doesn't, this logic needs to be simplified or the server updated.
            if (data.isAdmin) { 
                
                // 3. Store the JWT Token (Crucial for accessing protected routes)
                localStorage.setItem('jwtToken', data.token);

                // 4. Redirect to Admin Dashboard
                window.location.href = ADMIN_DASHBOARD_PATH;
            } else {
                // Not authorized (if the user exists but isn't marked as admin)
                errorDiv.textContent = "You are not authorized as an admin.";
            }

        } else {
            // Handle HTTP errors (e.g., 401 Unauthorized, 404 Not Found)
            if (response.status === 401) {
                errorDiv.textContent = "Invalid email or password.";
            } else {
                errorDiv.textContent = data.message || "An unexpected error occurred during login.";
            }
        }

    } catch (error) {
        console.error("Network or server error:", error);
        errorDiv.textContent = "Could not connect to the server. Please try again.";
    }
});