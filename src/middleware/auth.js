const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Simple file logging function
const logToFile = (message) => {
    const logPath = path.join(__dirname, '../../debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
};

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        logToFile('Auth middleware debug:');
        logToFile(`- Auth header present: ${!!authHeader}`);
        logToFile(`- Auth header starts with Bearer: ${authHeader?.startsWith('Bearer ')}`);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without user (for unauthenticated access)
            logToFile('- No valid auth header, setting req.user = null');
            req.user = null;
            return next();
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        logToFile(`- Token length: ${token.length}`);
        logToFile(`- Token starts with: ${token.substring(0, 20)}...`);
        
        // Verify the token (you'll need to use the same secret as your auth service)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
        logToFile('- Token decoded successfully');
        logToFile(`- Decoded payload: ${JSON.stringify(decoded, null, 2)}`);
        logToFile(`- Decoded id: ${decoded.id}`);
        logToFile(`- Decoded userId: ${decoded.userId}`);
        
        // Set user information
        req.user = {
            _id: decoded.userId || decoded.id,
            email: decoded.email,
            username: decoded.username
        };
        
        logToFile(`- Set req.user: ${JSON.stringify(req.user)}`);
        logToFile(`- req.user._id: ${req.user._id}`);
        
        next();
    } catch (error) {
        logToFile(`Auth middleware error: ${error.message}`);
        // Token is invalid, but don't block the request
        req.user = null;
        next();
    }
};

module.exports = authMiddleware; 