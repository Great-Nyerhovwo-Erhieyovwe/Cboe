// routes/userRoutes.js

const express = require('express');
const router = express.Router();

// ✅ FIX: Import the pool directly from the dedicated db.js file.
// This resolves the 'db' property circular dependency warning (like the one seen in image_668e68.jpg).
const pool = require('../db.js'); 

// ----------------------------------------------------------------------
// GET /api/user/profile - Fetch user's dashboard stats (PROTECTED)
// ----------------------------------------------------------------------
router.get('/profile', async (req, res) => {
    // The user's ID is available in req.user due to the authentication middleware
    const userId = req.user.id; 

    try {
        // Fetch all required dashboard metrics in a single query
        const query = `
            SELECT 
                id, 
                email, 
                username, 
                balance, 
                roi, 
                active_trades, 
                deposits_count, 
                is_banned, 
                is_frozen 
            FROM users 
            WHERE id = $1`;
            
        const result = await pool.query(query, [userId]);
        const profile = result.rows[0];

        if (!profile) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        
        // Map DB fields to client-side JS keys (if necessary, for consistency with Firebase names)
        const clientProfile = {
            id: profile.id,
            email: profile.email,
            username: profile.username,
            balance: parseFloat(profile.balance), // Ensure numeric types are parsed
            roi: parseFloat(profile.roi),
            activeTrades: parseFloat(profile.active_trades),
            deposits: profile.deposits_count, // Matches client-side 'deposits'
            isBanned: profile.is_banned,
            isFrozen: profile.is_frozen
        };

        res.json(clientProfile);

    } catch (error) {
        console.error('User profile fetch error:', error);
        res.status(500).json({ message: 'Server error fetching user data.' });
    }
});

module.exports = router;