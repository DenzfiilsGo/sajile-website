// File: saji-backend/utils/cleanupJob.js

const cron = require('node-cron');
const User = require('../models/User');

// Jadwal: Setiap hari pada pukul 03:00 pagi (sesuaikan jika perlu)
// Format: menit jam hari_bulan bulan hari_minggu
const scheduleCleanup = () => {
    // Tugas akan berjalan setiap hari pada pukul 03:00 pagi (3:00 AM)
    cron.schedule('0 3 * * *', async () => {
        try {
            console.log('[CLEANUP] Memulai tugas pembersihan akun yang tidak terverifikasi...');

            // Hapus semua user yang:
            // 1. isVerified = false (Belum diverifikasi)
            // 2. verificationTokenExpires < Date.now() (Sudah kadaluarsa)
            const result = await User.deleteMany({
                isVerified: false,
                verificationTokenExpires: { $lt: Date.now() }
            });

            console.log(`[CLEANUP] Tugas pembersihan selesai. ${result.deletedCount} akun tidak terverifikasi telah dihapus.`);
        } catch (error) {
            console.error('[CLEANUP] Gagal menjalankan tugas pembersihan:', error.message);
        }
    });

    console.log('[CLEANUP] Tugas pembersihan terjadwal telah diaktifkan.');
};

module.exports = scheduleCleanup;