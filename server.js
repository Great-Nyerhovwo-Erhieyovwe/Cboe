// server.js - SQL BACKEND MAIN ENTRY POINT

// 1. Load Environment Variables 
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const jwt = require('jsonwebtoken');
const cors = require('cors'); // ✅ FIX: Require the CORS module

const app = express();

// -----------------------------------------------------
// 2. Configuration & Initialization
// -----------------------------------------------------

// Access environment variables
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// Check for critical configuration
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


// -----------------------------------------------------
// 4. Middleware Setup
// -----------------------------------------------------

// Parse JSON request bodies 
app.use(express.json());

// ✅ FIX: CORS Configuration (Must be placed before routes)
const allowedOrigins = [
    'http://localhost:3000',               // Local dev server
    'http://127.0.0.1:5500',               // Common VS Code Live Server
    'https://cboebackendapi.onrender.com', // Sometimes needed for self-reference
    // 🔑 ADD THE PRODUCTION URL OF YOUR FRONTEND HERE (e.g., your GitHub Pages URL)
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like API testing tools or Curl) or allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`CORS BLOCK: Attempted access from disallowed origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true
}));


// -----------------------------------------------------
// 5. JWT Authentication Middleware
// -----------------------------------------------------

// Middleware to verify JWT and attach user data (req.user)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.warn('JWT verification failed:', err.message);
            return res.status(403).json({ message: 'Invalid or expired session. Please log in again.' });
        }
        req.user = user; 
        next();
    });
};


// -----------------------------------------------------
// 6. API Routes
// -----------------------------------------------------

// Unprotected routes (e.g., register, login)
app.use('/api', require('./routes/authRoutes'));

// Protected routes (require a valid JWT)
app.use('/api/user', authenticateToken, require('./routes/userRoutes'));
app.use('/api/transactions', authenticateToken, require('./routes/transactionRoutes'));
// app.use('/api/config', require('./routes/configRoutes')); // Commented out until file is created


// -----------------------------------------------------
// 7. Server Startup
// -----------------------------------------------------

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}.`);
    console.log(`🔒 SQL-backed API endpoints available at /api/...`);
});

// ✅ FIX: Export the database pool directly to resolve the circular dependency warning 
// and the 'db' property not found in authRoutes.js.
module.exports = { app, pool };