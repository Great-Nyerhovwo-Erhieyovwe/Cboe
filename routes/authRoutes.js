// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// The main application pool is available via app.db when required in server.js
// const pool = require('../server.js').db; 
const { pool } = require('../server')
const JWT_SECRET = process.env.JWT_SECRET;

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