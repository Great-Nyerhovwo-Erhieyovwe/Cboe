// server.js - SQL BACKEND MAIN ENTRY POINT

// 1. Load Environment Variables 
require('dotenv').config();

const express = require('express');
// REMOVED: const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors'); 

const app = express();

// -----------------------------------------------------
// 2. Configuration & Initialization
// -----------------------------------------------------

const PORT = process.env.PORT || 3000;
// REMOVED: DATABASE_URL is now checked in db.js
const JWT_SECRET = process.env.JWT_SECRET;

const MIN_SECRET_LENGTH = 32;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
    console.error("FATAL ERROR: JWT_SECRET is missing or too short. Check your .env file.");
    process.exit(1);
}

// -----------------------------------------------------
// 3. Database Connection Pool (REMOVED - Now in db.js)
// -----------------------------------------------------


// -----------------------------------------------------
// 4. Middleware Setup
// -----------------------------------------------------

app.use(express.json());

// CORS Configuration
const allowedOrigins = [
    'http://localhost:3000',               
    'http://127.0.0.1:5500',               
    'https://cboebackendapi.onrender.com', 
    'https://cboetradeservice.onrender.com',
    // ADD YOUR PRODUCTION FRONTEND URL HERE
];

app.use(cors({
    origin: (origin, callback) => {
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
// ... (Your authenticateToken function remains unchanged)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
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
// app.use('/api/config', require('./routes/configRoutes')); 


// -----------------------------------------------------
// 7. Server Startup
// -----------------------------------------------------

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}.`);
    console.log(`🔒 SQL-backed API endpoints available at /api/...`);
});

// FIX: Export ONLY the app, eliminating any possibility of a circular dependency error.
module.exports = app;