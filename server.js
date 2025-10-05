// server.js - SQL BACKEND MAIN ENTRY POINT

// 1. Load Environment Variables (needed for DATABASE_URL and JWT_SECRET)
require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL client
const jwt = require('jsonwebtoken');

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

// if (!JWT_SECRET || JWT_SECRET.includes("26816b64b74bc02ef1f8e2e821970032913f0a8ef135ea5eeca44d8179d818b91eb44a4dfdaf26a5d83f6f0667bdd41b764631bd12658d079f58465f0f0c1f03")) {
//     console.error("FATAL ERROR: JWT_SECRET is not set or is using the placeholder value.");
//     process.exit(1);
// }
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

// -----------------------------------------------------
// 5. JWT Authentication Middleware
// -----------------------------------------------------

// Middleware to verify JWT and attach user data (userId, etc.) to the request
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expects 'Bearer TOKEN'

    if (token == null) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Log this error to help diagnose expired/bad tokens
            console.warn('JWT verification failed:', err.message);
            return res.status(403).json({ message: 'Invalid or expired session. Please log in again.' });
        }
        req.user = user; // The user object contains the payload (e.g., { id: 123, email: '...' })
        next();
    });
};


// -----------------------------------------------------
// 6. API Routes (Replacing JSON Server)
// -----------------------------------------------------

// You need to create these files in a 'routes' folder:
// - authRoutes.js: Handles POST /api/login and POST /api/forgot-password
// - userRoutes.js: Handles GET /api/user/profile (protected)
// - transactionRoutes.js: Handles POST /api/transactions/deposit and GET /api/transactions/latest (protected)

// Unprotected routes (e.g., login, password reset)
app.use('/api', require('./routes/authRoutes'));

// Protected routes (require a valid JWT)
app.use('/api/user', authenticateToken, require('./routes/userRoutes'));
app.use('/api/transactions', authenticateToken, require('./routes/transactionRoutes'));
// app.use('/api/config', require('./routes/configRoutes')); // Wallet config is often unprotected or protected by API Key


// -----------------------------------------------------
// 7. Frontend Serving (Keeping Your Original JSON Server Logic)
// -----------------------------------------------------

const FRONTEND_PATH = path.join(__dirname, 'Cboe', 'public');

// Serve static frontend files (HTML, CSS, JS, Assets)
app.use(express.static(FRONTEND_PATH));

// Catch-all route for serving the main entry point if the requested URL isn't a file or API route
// NOTE: For multi-page apps (like yours: login.html, dashboard.html), this is often omitted,
// as the static middleware handles direct requests. However, keeping this fallback is common.
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