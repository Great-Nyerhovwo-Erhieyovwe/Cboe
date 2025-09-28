// ./assets/js/firebase-config.js

// Replace the placeholder values below with your actual Firebase project settings
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", 
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase App
const app = firebase.initializeApp(firebaseConfig);

// Create handy references to the services you use often
// This makes 'auth' and 'db' available globally to other scripts
const auth = firebase.auth();
const db = firebase.firestore();