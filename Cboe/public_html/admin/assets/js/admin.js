// admin.js
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { app } from "../../firebase-config.js"; // adjust path if needed

const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;
  const errorDiv = document.getElementById("error-message");

  errorDiv.textContent = ""; // clear old errors

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if user is in admins collection
    const adminRef = doc(db, "admins", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (adminSnap.exists()) {
      // ✅ Redirect to dashboard
      window.location.href = "dashboard.html";
    } else {
      // ❌ Not an admin, log them out
      await signOut(auth);
      errorDiv.textContent = "You are not authorized as an admin.";
    }

  } catch (error) {
    console.error("Login failed:", error);
    errorDiv.textContent = "Invalid email or password.";
  }
});