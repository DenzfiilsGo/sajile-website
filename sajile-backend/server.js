const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const scheduleCleanup = require('./utils/cleanupJob');
const path = require('path');

dotenv.config();
const app = express();

// Gunakan process.env.PORT (Render/Deploy) atau fallback ke 5000 (Local)
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI; 

// =======================================================
// 1. GLOBAL MIDDLEWARE (CORS HARUS PALING ATAS DARI SEMUANYA) ⭐ PERBAIKAN DI SINI ⭐
// =======================================================

// Atur CORS secara global
app.use(cors({
    origin: ['http://localhost:8000', 'http://192.168.1.2:8000', 'https://sajile.netlify.app', 'https://sajile.vercel.app'], // Sesuaikan Origins Anda
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization', 'Accept', 'ngrok-skip-browser-warning'],
}));

// Body Parser untuk memproses JSON
app.use(express.json());

// =======================================================
// 2. STATIC FILE SERVING (ROUTE HANDLER KUSTOM PERMANEN)
// =======================================================
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));
console.log(`[Express] Melayani file statis dari: ${uploadsDir} di URL /uploads`);

// Menjalankan tugas pembersihan terjadwal
scheduleCleanup();

// =======================================================
// 3. IMPOR ROUTES
// =======================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/recipes', require('./routes/recipes'));
// ⭐ TAMBAHAN BARU:
app.use('/api/favorites', require('./routes/favorites')); // URL: http://.../api/favorites
app.use('/api/comments', require('./routes/comments'));   // URL: http://.../api/comments

// =======================================================
// 4. KONEKSI KE MONGODB
// =======================================================
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB berhasil terhubung!'))
    .catch(err => console.error('❌ Koneksi MongoDB Gagal:', err.message)); 

// =======================================================
// 5. ENDPOINT TEST & HEALTH CHECK
// =======================================================
app.get('/', (req, res) => {
    res.send('Server SajiLe Backend Berjalan!');
});

app.get('/api/healthcheck', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'SajiLe Backend' });
});

// =======================================================
// 6. GLOBAL ERROR & 404 HANDLERS
// =======================================================
// A. 404 Handler untuk API
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) { 
        return res.status(404).json({ msg: `Rute API tidak ditemukan: ${req.originalUrl}` });
    }
    next(); 
});

// B. Error Handler Global
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    console.error('🔥 SERVER UNCAUGHT ERROR:', err.stack); 
    
    res.status(statusCode).json({
        msg: 'Terjadi kesalahan server internal yang tidak tertangani. Cek log server.',
        errorDetail: err.message
    });
});

// =======================================================
// 7. START SERVER
// =======================================================
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));