const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import model User

module.exports = async function(req, res, next) {
    let token = req.header('x-auth-token');
    
    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    if (!token) return res.status(401).json({ msg: 'Tidak ada token, otorisasi ditolak.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userData = decoded.user || decoded;

        // Ambil data TERBARU dari database (termasuk status membership terbaru)
        const user = await User.findById(userData.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ msg: 'User tidak ditemukan.' });
        }

        // Simpan objek user asli dari DB ke req.user
        req.user = user; 
        
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') return res.status(401).json({ msg: 'Token kedaluwarsa.' });
        return res.status(401).json({ msg: 'Token tidak valid.' });
    }
};