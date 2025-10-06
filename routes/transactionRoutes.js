// routes/transactionRoutes.js

const express = require('express');
const router = express.Router();

// ✅ FIX: Import the pool directly from the dedicated db.js file.
// This resolves the 'db' property circular dependency warning.
const pool = require('../db.js'); 

// ----------------------------------------------------------------------
// POST /api/transactions/deposit - Submit a new deposit request (PROTECTED)
// ----------------------------------------------------------------------
router.post('/deposit', async (req, res) => {
    // req.user is set by the authenticateToken middleware in server.js
    const userId = req.user.id; 
    const { amount, coin, network } = req.body;
    const type = 'deposit';
    
    if (isNaN(amount) || amount <= 0 || !coin || !network) {
        return res.status(400).json({ message: 'Invalid deposit amount or configuration.' });
    }

    try {
        const query = `
            INSERT INTO transactions (user_id, type, amount, coin, network, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING id, created_at, status;`;
            
        const result = await pool.query(query, [userId, type, amount, coin, network]);

        res.status(201).json({ 
            message: 'Deposit request submitted successfully.', 
            transaction: result.rows[0] 
        });

    } catch (error) {
        console.error('Deposit submission error:', error);
        res.status(500).json({ message: 'Server error processing deposit request.' });
    }
});

// ----------------------------------------------------------------------
// POST /api/transactions/withdrawal - Submit a new withdrawal request (PROTECTED)
// ----------------------------------------------------------------------
router.post('/withdrawal', async (req, res) => {
    const userId = req.user.id;
    const { amount, walletAddress } = req.body;
    const type = 'withdrawal';

    if (isNaN(amount) || amount <= 0 || !walletAddress) {
        return res.status(400).json({ message: 'Invalid amount or wallet address.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start transaction

        // 1. Check user balance (Server-side validation)
        const balanceQuery = 'SELECT balance FROM users WHERE id = $1 FOR UPDATE'; // Lock row
        const userResult = await client.query(balanceQuery, [userId]);
        const currentBalance = userResult.rows[0] ? parseFloat(userResult.rows[0].balance) : 0;

        if (amount > currentBalance) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Insufficient balance for withdrawal.' });
        }

        // 2. Insert withdrawal request
        const insertQuery = `
            INSERT INTO transactions (user_id, type, amount, wallet_address, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING id;`;
            
        const transactionResult = await client.query(insertQuery, [userId, type, amount, walletAddress]);

        // 3. Commit the transaction
        await client.query('COMMIT'); 

        res.status(201).json({ 
            message: 'Withdrawal request submitted successfully.', 
            transactionId: transactionResult.rows[0].id 
        });

    } catch (error) {
        await client?.query('ROLLBACK'); // Rollback on any error
        console.error('Withdrawal submission error:', error);
        res.status(500).json({ message: 'Server error processing withdrawal request.' });
    } finally {
        if (client) client.release();
    }
});

// ----------------------------------------------------------------------
// GET /api/transactions/latest - Fetch latest 20 transactions (PROTECTED)
// ----------------------------------------------------------------------
router.get('/latest', async (req, res) => {
    const userId = req.user.id;
    
    try {
        const query = `
            SELECT id, type, amount, status, created_at 
            FROM transactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 20;`;
            
        const result = await pool.query(query, [userId]);

        // The client-side JS expects an array of transactions
        res.json(result.rows);

    } catch (error) {
        console.error('Transactions fetch error:', error);
        res.status(500).json({ message: 'Server error fetching transaction history.' });
    }
});

module.exports = router;