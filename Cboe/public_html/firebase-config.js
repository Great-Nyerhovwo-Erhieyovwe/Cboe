// firebase-config.js

// Your unique Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBTGdLyfpv9xzmh5hYoctay0Ev4W4lpAjM",
    authDomain: "cboefirebaseserver.firebaseapp.com",
    databaseURL: "https://cboefirebaseserver-default-rtdb.firebaseio.com",
    projectId: "cboefirebaseserver",
    storageBucket: "cboefirebaseserver.firebasestorage.app",
    messagingSenderId: "755491003217",
    appId: "1:755491003217:web:2a10ffad1f38c9942f5170",
    measurementId: "G-FCZEERNC06"
};

// 1. Initialize Firebase App (MANDATORY)
const app = firebase.initializeApp(firebaseConfig);

// 2. Create handy references to the services (MANDATORY for your other scripts)
// This makes 'auth' and 'db' globally available to admin.js and admin-dashboard.js
const auth = firebase.auth();
const db = firebase.firestore(); 

// NOTE: You can remove the unused measurementId and databaseURL 
// fields from the config object if you are not using Analytics or Realtime Database.