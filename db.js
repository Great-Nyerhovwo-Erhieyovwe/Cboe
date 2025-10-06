// db.js - Handles the connection pool setup

const { Pool } = require('pg');
require('dotenv').config(); // Ensure environment variables are loaded if this file is run directly

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("FATAL ERROR: DATABASE_URL not found in environment variables.");
    process.exit(1);
}

// Create a connection pool
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        // Required for secure connections (Render)
        rejectUnauthorized: false
    }
});

// Test the database connection on startup
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client from pool:', err.stack);
    }
    console.log('✅ [db.js] Successfully connected to PostgreSQL database.');
    release(); 
});

// Export only the pool object for use in routes
module.exports = pool;
