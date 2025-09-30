// assets/js/admin.js
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "../../firebase-config.js"; 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const errorDiv = document.getElementById("adminLoginError");

  errorDiv.textContent = ""; // clear old errors

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ Check if user is in admins collection
    const adminRef = doc(db, "admins", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (adminSnap.exists()) {
      // Redirect to admin dashboard
      window.location.href = "./admin-dashboard.html";
    } else {
      // ❌ Not an admin, sign out and show error
      await signOut(auth);
      errorDiv.textContent = "You are not authorized as an admin.";
    }

  } catch (error) {
    console.error("Login failed:", error);
    errorDiv.textContent = "Invalid email or password.";
  }
});