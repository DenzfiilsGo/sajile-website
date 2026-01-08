// middleware/premiumCheck.js
const User = require('../models/User');

module.exports = async function(req, res, next) {
    try {
        const user = req.user; 

        // 1. JIKA FREE: Langsung Tolak
        if (!user.membership || user.membership === 'free') {
            return res.status(403).json({ 
                msg: "Akses ditolak. Silakan berlangganan paket Premium/Legend untuk melihat resep eksklusif." 
            });
        }

        // 2. JIKA STARTER: Tolak Akses Resep Eksklusif (Hanya boleh AI)
        if (user.membership.startsWith('starter')) {
            return res.status(403).json({ 
                msg: "Paket Starter tidak termasuk akses Resep Eksklusif. Silakan upgrade ke Premium atau Legend." 
            });
        }

        // 3. CEK MASA BERLAKU UNTUK PREMIUM & LEGEND
        // Sekarang Legend tidak lagi lifetime otomatis, tapi mengikuti durasi paketnya
        if (user.membership.startsWith('premium') || user.membership.startsWith('legend')) {
            const now = new Date();
            
            // Periksa apakah masa berlaku sudah habis
            if (!user.premiumUntil || now > user.premiumUntil) {
                // Proses DownGrade otomatis ke Free jika expired
                const userInDb = await User.findById(user._id);
                userInDb.membership = 'free';
                userInDb.premiumUntil = null;
                userInDb.aiCredits = 5; // Reset ke jatah kredit gratis
                await userInDb.save();

                return res.status(403).json({ 
                    msg: `Masa langganan ${user.membership.split('_')[0].toUpperCase()} Anda telah berakhir. Silakan perpanjang paket.` 
                });
            }

            // Jika masih aktif, izinkan akses ke resep eksklusif
            return next();
        }

        // Fallback jika ada tipe membership yang tidak dikenal
        res.status(403).json({ msg: "Akses tidak diizinkan untuk tipe akun ini." });

    } catch (err) {
        console.error('Error di premiumCheck middleware:', err.message);
        res.status(500).send('Server Error');
    }
};