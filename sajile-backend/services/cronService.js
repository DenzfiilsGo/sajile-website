// saji-backend/services/cronService.js
const cron = require('node-cron');
const User = require('../models/User');

const initCronJobs = () => {
    /**
     * RESET KREDIT AI HARIAN
     * Berjalan setiap hari tepat pukul 00:00 (Tengah Malam)
     * Pola Cron: 'menit jam tgl_bulan bulan hari_minggu'
     */
    cron.schedule('0 0 * * *', async () => {
        console.log('--- [CRON] MEMULAI RESET KREDIT HARIAN MASSAL ---');
        
        try {
            // Definisikan limit berdasarkan membership
            const packageLimits = {
                'free': 5,
                'starter_taster': 10,
                'starter_pro': 15,
                'premium_home': 25,
                'premium_elite': 50,
                'legend_year': 120,
                'legend_eternal': 300
            };

            // Ambil semua user
            const users = await User.find({});
            const now = new Date();

            // Lakukan update untuk setiap user
            const updatePromises = users.map(user => {
                const limit = packageLimits[user.membership] || 5;
                user.aiCredits = limit;
                user.lastAiReset = now;
                return user.save();
            });

            await Promise.all(updatePromises);

            console.log(`✅ [CRON] Berhasil mereset kredit untuk ${users.length} pengguna.`);
        } catch (err) {
            console.error('❌ [CRON] Gagal melakukan reset massal:', err);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Jakarta" // Pastikan sesuai waktu server/lokal Anda
    });
};

module.exports = initCronJobs;