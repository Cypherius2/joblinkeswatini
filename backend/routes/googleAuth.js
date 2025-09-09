// backend/routes/googleAuth.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Initialize Google OAuth2 client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Route to handle Google OAuth login/register
router.post('/google', async (req, res) => {
    try {
        const { credential, role = 'seeker' } = req.body;

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        if (!email || !name) {
            return res.status(400).json({ msg: 'Invalid Google token data' });
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
            // User exists - login
            const jwtPayload = { user: { id: user.id } };
            const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '5h' });
            
            res.json({ 
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                isNewUser: false
            });
        } else {
            // User doesn't exist - register new user
            user = new User({
                name,
                email,
                password: 'google_oauth_user', // Placeholder password for OAuth users
                role,
                headline: role === 'company' ? 'Company' : 'Job Seeker',
            });

            // If Google provided a profile picture URL, we could save it
            // For now, we'll leave it as placeholder since we're using GridFS

            await user.save();

            const jwtPayload = { user: { id: user.id } };
            const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '5h' });

            res.json({ 
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                isNewUser: true
            });
        }
    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(400).json({ msg: 'Invalid Google token or authentication failed' });
    }
});

// Route to handle Google OAuth with specific role for registration
router.post('/google/register', async (req, res) => {
    try {
        const { credential, role = 'seeker' } = req.body;

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        if (!email || !name) {
            return res.status(400).json({ msg: 'Invalid Google token data' });
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ msg: 'User already exists with this email. Please sign in instead.' });
        }

        // Create new user
        user = new User({
            name,
            email,
            password: 'google_oauth_user', // Placeholder password for OAuth users
            role,
            headline: role === 'company' ? 'Company' : 'Job Seeker',
        });

        await user.save();

        const jwtPayload = { user: { id: user.id } };
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '5h' });

        res.json({ 
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            isNewUser: true
        });
    } catch (error) {
        console.error('Google OAuth registration error:', error);
        res.status(400).json({ msg: 'Invalid Google token or registration failed' });
    }
});

module.exports = router;
