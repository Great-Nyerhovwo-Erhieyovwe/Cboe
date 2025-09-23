const express = require('express');
const path = require('path');
const jsonServer = require('json-server');

const app = express();

// server static frontend file from 'public' folder
app.use(express.static(path.join(__dirname, 'Cboe', 'public')));

// Json server api
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
app.use('/api', middlewares);
app.use('/api', router);

// Catch-all route (optional, for SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Cboe', 'public_html', 'index.html'));
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`JSON server is running on port ${PORT}`);
});
