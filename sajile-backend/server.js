const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const scheduleCleanup = require('./utils/cleanupJob');
const path = require('path');

dotenv.config();
const app = express();

// ⭐ CORS: cukup SATU blok ini — sudah cukup untuk semua request + preflight
app.use(cors({
    origin: ['http://localhost:8000', 'https://sajile.netlify.app', 'https://sajile.vercel.app'], // Ganti dengan domain frontend Anda
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-auth-token", "Authorization", "Accept"],
    credentials: true
}));

// Menjalankan tugas pembersihan terjadwal (seperti menghapus token kadaluarsa)
scheduleCleanup();

// Gunakan process.env.PORT (Render) atau fallback ke 5000 (Local)
const PORT = process.env.PORT || 5000;
// Mengambil URI dari file .env
const MONGODB_URI = process.env.MONGODB_URI; 

// 2. Middleware
app.use(express.json());

// Import Routes
app.use('/api/auth', require('./routes/auth')); 
app.use('/api/recipes', require('./routes/recipes')); // ✅ Aktifkan route resep
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files dari folder 'uploads'

// 3. Koneksi ke MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB berhasil terhubung!'))
    .catch(err => console.error('❌ Koneksi MongoDB Gagal:', err.message)); 

// 4. Endpoint Test (Health Check dan Keep-Alive)
// Endpoint utama, untuk memverifikasi server berjalan
app.get('/', (req, res) => {
    res.send('Server SajiLe Backend Berjalan!');
});

// ⭐ TAMBAHAN BARU: Endpoint Health Check Khusus untuk Cron Job ⭐
// Endpoint ini akan dipanggil oleh layanan pihak ketiga untuk menjaga server tetap aktif (Keep-Alive)
app.get('/api/healthcheck', (req, res) => {
    // Memberikan respons status 200 OK
    res.status(200).json({ status: 'OK', service: 'SajiLe Backend' });
});

// =======================================================
// 5. Global Error & 404 Handlers (LAPISAN KEAMANAN)
// =======================================================

// A. 404 Handler untuk API
app.use((req, res, next) => {
    // Pastikan hanya merespons JSON untuk API
    if (req.path.startsWith('/api')) { 
        return res.status(404).json({ msg: `Rute API tidak ditemukan: ${req.originalUrl}` });
    }
    next(); 
});

// B. Error Handler Global (Wajib memiliki 4 parameter: err, req, res, next)
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    
    // Log error di konsol server (PENTING untuk debugging di masa depan)
    console.error('🔥 SERVER UNCAUGHT ERROR:', err.stack); 
    
    // Pastikan respons selalu JSON 500
    res.status(statusCode).json({
        msg: 'Terjadi kesalahan server internal yang tidak tertangani. Cek log server.',
        errorDetail: err.message
    });
});

// 5. Start Server
// Render akan menggunakan variabel lingkungan PORT untuk menentukan port
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));