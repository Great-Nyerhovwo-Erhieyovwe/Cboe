const express = require('express');
const path = require('path');
const jsonServer = require('json-server');

const app = express();

// --- JSON Server Configuration (API) ---

// 1. Create a custom JSON Server router instance
const router = jsonServer.router(path.join(__dirname, 'db.json'));

// 2. Load JSON Server default middlewares (logger, static, cors, no-cache)
const middlewares = jsonServer.defaults();

// 3. Optional: Add custom middleware for data consistency (highly recommended for JSON Server)
// This ensures that string IDs are handled properly in requests if you use string UUIDs.
router.db._.id = 'id'; // Enforce the ID field name (optional, but good practice)

// --- Express App Setup ---

// 4. Serve the JSON Server middlewares first under the '/api' prefix
app.use('/api', middlewares);

// 5. Use the JSON Server router under the '/api' prefix
app.use('/api', router);


// 6. Serve static frontend files (HTML, CSS, JS, Assets) from the "Cboe/public_html" directory
// The client files (login.html, dashboard.html) will be accessible here.
app.use(express.static(path.join(__dirname, 'Cboe', 'public_html')));

// 7. Catch-all route for frontend routing (important for Single Page Applications/deep links)
// If a route doesn't match the API or a static file, return the main index.html file.
app.get('*', (req, res) => {
    // NOTE: If your app uses multiple HTML files (e.g., login.html, dashboard.html), 
    // you might need to adjust this, but for a typical SPA structure, index.html is the target.
    // For your current multi-page structure, we rely on the static middleware above. 
    // We will keep this catch-all pointing to index.html as a fallback.
    res.sendFile(path.join(__dirname, 'Cboe', 'public_html', 'index.html'));
});

// --- Server Startup ---

// Use the PORT environment variable (for Render/Heroku) or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}. Frontend served from /`);
    console.log(`✅ API endpoints available at /api/...`);
});