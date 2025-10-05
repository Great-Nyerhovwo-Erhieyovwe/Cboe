// server.js - SQL BACKEND MAIN ENTRY POINT

// 1. Load Environment Variables (needed for DATABASE_URL and JWT_SECRET)
require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL client
const jwt = require('jsonwebtoken');
const cors = require('cors'); // <--- 🌟 FIX 1: ADD CORS MODULE

const app = express();

// -----------------------------------------------------
// 2. Configuration & Initialization
// -----------------------------------------------------

// Access environment variables
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// Check for critical configuration (important security step)
if (!DATABASE_URL) {
    console.error("FATAL ERROR: DATABASE_URL not found in environment variables.");
    process.exit(1);
}

const MIN_SECRET_LENGTH = 32;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
    console.error("FATAL ERROR: JWT_SECRET is missing or too short. Check your .env file.");
    process.exit(1);
}

// -----------------------------------------------------
// 3. Database Connection Pool
// -----------------------------------------------------

// Create a connection pool using the DATABASE_URL
const pool = new Pool({
    connectionString: DATABASE_URL,
    // Required for secure connections to services like Render
    ssl: {
        rejectUnauthorized: false
    }
});

// Test the database connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client from pool:', err.stack);
    }
    console.log('✅ Successfully connected to PostgreSQL database.');
    release();
});

// Attach the pool to the app object for use in routes
app.db = pool;


// -----------------------------------------------------
// 4. Middleware Setup
// -----------------------------------------------------

// Parse JSON request bodies (required for login/transaction submissions)
app.use(express.json());

// 🌟 FIX 2: ADD CORS MIDDLEWARE
// You MUST install this package first: npm install cors
const allowedOrigins = [
    'https://cboebackendapi.onrender.com', // Your own API URL (sometimes needed)
    'http://localhost:3000',               // Local dev server
    'http://127.0.0.1:5500',               // Common VS Code Live Server
    // 🔑 ADD THE URL WHERE YOUR FRONTEND IS HOSTED (e.g., GitHub Pages, Netlify)
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin on production)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // If the origin is not in the allowed list, but you want to test locally:
        // if (origin.includes('127.0.0.1') || origin.includes('localhost')) {
        //     return callback(null, true); 
        // }
        // For production, the else case should strictly deny
        console.warn(`CORS BLOCK: Attempted access from disallowed origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true // Crucial for sending/receiving session cookies or authorization headers
}));


// -----------------------------------------------------
// 5. JWT Authentication Middleware
// -----------------------------------------------------
// ... (Your authenticateToken function is correct)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expects 'Bearer TOKEN'

    if (token == null) {
        // When client code uses fetch and gets a 401, it should redirect to login
        return res.status(401).json({ message: 'Authentication required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.warn('JWT verification failed:', err.message);
            // Use 403 Forbidden for an invalid/expired token
            return res.status(403).json({ message: 'Invalid or expired session. Please log in again.' });
        }
        req.user = user;
        next();
    });
};


// -----------------------------------------------------
// 6. API Routes
// -----------------------------------------------------

// Unprotected routes (e.g., register, login, password reset)
app.use('/api', require('./routes/authRoutes'));

// 🌟 FIX 3: Add the wallet config route. It's usually UNPROTECTED.
// Your frontend fetches this immediately on load.
app.use('/api/config', require('./routes/configRoutes')); 


// Protected routes (require a valid JWT)
app.use('/api/user', authenticateToken, require('./routes/userRoutes'));
app.use('/api/transactions', authenticateToken, require('./routes/transactionRoutes'));


// -----------------------------------------------------
// 7. Frontend Serving
// -----------------------------------------------------

const FRONTEND_PATH = path.join(__dirname, 'Cboe', 'public');

// Serve static frontend files (HTML, CSS, JS, Assets)
app.use(express.static(FRONTEND_PATH));

// Catch-all route for serving the main entry point if the requested URL isn't a file or API route
app.get('*', (req, res) => {
    // Attempt to send index.html if no static file was found
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});


// -----------------------------------------------------
// 8. Server Startup
// -----------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}.`);
    console.log(`🌐 Frontend served from: ${FRONTEND_PATH}`);
    console.log(`🔒 SQL-backed API endpoints available at /api/...`);
});

module.exports = app;