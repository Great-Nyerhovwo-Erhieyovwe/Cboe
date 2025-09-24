const express = require('express');
const path = require('path');
const jsonServer = require('json-server');

const app = express();

// Serve static frontend from "public_html"
app.use(express.static(path.join(__dirname, 'Cboe', 'public_html')));

// JSON Server API
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();
app.use('/api', middlewares);
app.use('/api', router);

// Catch-all route (optional, for SPAs)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'Cboe', 'public_html', 'index.html'));
});

// Use Render's assigned port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
