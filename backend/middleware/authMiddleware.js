// backend/middleware/authMiddleware.js -- FINAL CORRECT VERSION

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // 1. Get the token from the request header (support both formats)
    let token = req.header('x-auth-token');
    
    // If no x-auth-token, check for Authorization: Bearer format
    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    // 2. Check if there is no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // 3. If there is a token, verify it
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add the user from the token's payload to the request object
        req.user = decoded.user;

        // Move on to the next piece of middleware or the route handler
        next();
    } catch (err) {
        // If the token is not valid
        res.status(401).json({ msg: 'Token is not valid' });
    }
};