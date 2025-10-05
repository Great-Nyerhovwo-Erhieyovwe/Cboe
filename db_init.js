// db_init.js - Initializes the PostgreSQL database tables
// Run this file once using 'node db_init.js'

require('dotenv').config();

const { Pool } = require('pg');

// 1. Configuration Check
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("FATAL ERROR: DATABASE_URL not found. Cannot initialize database.");
    process.exit(1);
}

// 2. Database Connection Setup
const pool = new Pool({
    connectionString: DATABASE_URL,
    // Add SSL for secure connections to remote hosts (like Render)
    ssl: {
        rejectUnauthorized: false 
    }
});

// 3. SQL Table Creation Statements
const createTablesQuery = `
-- Drop tables if they exist (USE WITH CAUTION: wipes all data)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS config;

-- -----------------------------------------------------
-- Table: users (Stores authentication and dashboard stats)
-- -----------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL DEFAULT 'Trader',
    
    -- Financial/Dashboard Data (matching your JS needs)
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    roi NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    active_trades NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    deposits_count INTEGER NOT NULL DEFAULT 0,

    -- Status flags
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table: transactions (Stores all pending, approved, and declined requests)
-- -----------------------------------------------------
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal'
    amount NUMERIC(15, 2) NOT NULL,
    
    -- Transaction Details
    coin VARCHAR(50), 
    network VARCHAR(50), 
    wallet_address VARCHAR(255), 
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'declined'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by user ID on transactions
CREATE INDEX idx_transactions_user_id ON transactions (user_id);


-- -----------------------------------------------------
-- Table: config (Stores global configurations like wallet addresses)
-- -----------------------------------------------------
CREATE TABLE config (
    key VARCHAR(50) PRIMARY KEY, -- Must be 'wallet_config' for dashboard.js to find it
    value JSONB NOT NULL,        -- Stores the nested coin/network structure
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Initial Data Insertion: Wallet Configuration
-- -----------------------------------------------------
-- The 'value' is stored as JSONB and must match the structure your dashboard.js expects.
INSERT INTO config (key, value) VALUES 
('wallet_config', '{
    "BTC": {
        "Bitcoin": {
            "address": "1BvBMSEYstWetqTFn5Au4m4GF2g7d5U",
            "qr_path": "/assets/qr/btc_qr.png"
        }
    },
    "ETH": {
        "ERC20": {
            "address": "0x45B5184B1c736E6F90c4A3A73E4770F7E04C74B5",
            "qr_path": "/assets/qr/eth_qr.png"
        },
        "BSC": {
            "address": "0x12c4D71a2B6A3F4C30dC8a562419a4A9c9C5E48B",
            "qr_path": "/assets/qr/bsc_qr.png"
        }
    }
}'::jsonb) 
ON CONFLICT (key) DO NOTHING;
`;

// 4. Initialization Function
async function initializeDatabase() {
    console.log("Starting database initialization...");
    let client;
    try {
        client = await pool.connect();
        await client.query(createTablesQuery);
        console.log("✅ Database tables created and initial config data inserted successfully!");
    } catch (err) {
        console.error("❌ ERROR: Database initialization failed:", err.message);
        console.error("Stack:", err.stack);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end(); // Close the pool after initialization is done
        console.log("Database connection pool closed.");
    }
}

// 5. Run the script immediately
initializeDatabase();