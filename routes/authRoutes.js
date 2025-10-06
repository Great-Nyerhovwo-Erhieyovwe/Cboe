const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// FIX: Import the pool directly from the new, dedicated db.js file.
const pool = require('../db.js'); 
const JWT_SECRET = process.env.JWT_SECRET; // JWT_SECRET is accessed via environment

// Define default starting values for database columns that likely have NOT NULL constraints
const STARTING_BALANCE = 0.00;
const STARTING_ROI = 0.00;
const STARTING_ACTIVE_TRADES = 0;
const STARTING_DEPOSITS_COUNT = 0;

// ----------------------------------------------------------------------
// POST /api/register - Register a new user
// ----------------------------------------------------------------------
router.post('/register', async (req, res) => {
    // Collect all data sent from the frontend registration form
    const { 
        fullName, username, email, phone, password, 
        accountType, country, currency, agreedToTerms, ageAgreed 
    } = req.body;

    // Basic server-side validation
    if (!email || !password || !username || !fullName || !agreedToTerms || !ageAgreed) {
        return res.status(400).json({ message: 'Missing required registration fields.' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    try {
        // 1. Check for existing email or username (Concurrency check)
        const checkQuery = 'SELECT email, username FROM users WHERE email = $1 OR username = $2';
        const checkResult = await pool.query(checkQuery, [email, username]);

        if (checkResult.rows.length > 0) {
            if (checkResult.rows.some(row => row.email === email)) {
                return res.status(409).json({ message: 'Email already registered.', errorType: 'EMAIL_TAKEN' });
            }
            if (checkResult.rows.some(row => row.username === username)) {
                return res.status(409).json({ message: 'Username already taken.', errorType: 'USERNAME_TAKEN' });
            }
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Insert the new user into the database
        // FIX: CHANGED 'full_name' to 'fullName' to match the database schema name from the error log.
        const insertQuery = `
            INSERT INTO users (
                fullName, username, email, password_hash, phone, 
                account_type, country, currency, agreed_to_terms, age_agreed,
                balance, roi, active_trades, deposits_count
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, username, email;`;

        const values = [
            fullName, username, email, passwordHash, phone || null, 
            accountType, country, currency, agreedToTerms, ageAgreed,
            STARTING_BALANCE, 
            STARTING_ROI,
            STARTING_ACTIVE_TRADES,
            STARTING_DEPOSITS_COUNT
        ];
        
        const result = await pool.query(insertQuery, values);
        const newUser = result.rows[0];

        // 4. Send a success response
        res.status(201).json({ 
            message: 'Registration successful. Please log in.',
            userId: newUser.id,
            username: newUser.username
        });

    } catch (error) {
        console.error('Registration database error:', error); 
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


// ----------------------------------------------------------------------
// POST /api/login - Authenticate a user and issue a JWT
// ----------------------------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // 1. Find user by email
        const userQuery = 'SELECT id, email, password_hash, username FROM users WHERE email = $1';
        const result = await pool.query(userQuery, [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 2. Compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 3. Credentials are valid, create JWT payload
        const payload = { 
            id: user.id, 
            email: user.email,
            username: user.username
        };
        
        // Sign the token (expires in 24 hours)
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        // 4. Send the token back to the client
        res.json({ 
            message: 'Login successful', 
            token: token,
            userId: user.id
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

module.exports = router;
