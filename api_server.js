const bcrypt = require('bcrypt'); 
// ... (existing import)

// --- API ENDPOINTS (add these two new endpoints) ---

// 0.1 User registration (POST /api/register)
app.post('/api/register', async (req, res) => {
    const {email, password } = req.body;
    if (!email || !password) return res.status(400).send({ message: 'Missing email or password' });

    // Note: In real app, use a unique ID generator for user_id, but email is fine for now.
    const userId = email;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // insert user into the user table
        await Pool.query(
            'INSERT INTO users (user_id, email, password_hash) VALUES($1, $2, $3)',
            [userId, email, hashedPassword]
        );

        res.status(201).json({ message: 'Registration successful. You can now log in.' });
    } catch (error) {
        if (error.code === '23505') { // unique violation (user exists)
            return res.status(409).send({ message: 'User already registered.' });
        }
    }
})