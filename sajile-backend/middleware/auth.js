const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Support 2 format token:
    // 1. x-auth-token header
    // 2. Authorization: Bearer <token>
    
    let token = req.header('x-auth-token');
    
    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    if (!token) {
        console.warn('[AUTH] No token provided - request rejected', {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(401).json({ msg: 'Tidak ada token, otorisasi ditolak.' });
    }

    try {
        // Debug: log trimmed token start so we can inspect
        console.log('[AUTH] Verifying token (start):', token.substring(0, 15) + '...');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('[AUTH] JWT verify error:', { name: err.name, message: err.message });
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token kedaluwarsa.' });
        }
        return res.status(401).json({ msg: 'Token tidak valid.' });
    }
};