const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const scheduleCleanup = require('./utils/cleanupJob');
const initCronJobs = require('./services/cronService');
const Lounge = require('./models/Lounge'); // Pastikan file ini sudah dibuat
const path = require('path');
const http = require('http'); // 1. Tambahkan ini
const { Server } = require('socket.io'); // 2. Tambahkan ini
const registerCallHandlers = require('./sockets/callHandler');

dotenv.config();
const app = express();
const server = http.createServer(app); // 3. Buat server HTTP dari app Express

// 4. Inisialisasi Socket.io dengan konfigurasi CORS
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:8000', 'http://192.168.1.2:8000', 'https://sajile.netlify.app', 'https://sajile.vercel.app'],
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

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
app.use('/api/users', require('./routes/users')); // Tambahkan ini!
app.use('/api/recipes', require('./routes/recipes'));
// ⭐ TAMBAHAN BARU:
app.use('/api/favorites', require('./routes/favorites')); // URL: http://.../api/favorites
app.use('/api/comments', require('./routes/comments'));   // URL: http://.../api/comments
app.use('/api/chats', require('./routes/chats')) // URL: http://.../api/chats
app.use('/api/lounge', require('./routes/lounges')); // Tambahkan baris ini

// =======================================================
// 4. KONEKSI KE MONGODB
// =======================================================
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB berhasil terhubung!');
        initCronJobs(); // <--- JALANKAN DI SINI
    })
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

// Middleware untuk mengecek token sebelum mengizinkan koneksi socket
io.use((socket, next) => {
    const token = socket.handshake.auth.token; // Mengambil token dari frontend

    if (!token) {
        return next(new Error("Akses ditolak: Token tidak ditemukan"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // Menyimpan data user (ID) ke dalam objek socket
        next();
    } catch (err) {
        next(new Error("Akses ditolak: Token tidak valid"));
    }
});

// =======================================================
// 6. LOGIKA SOCKET.IO (Pastikan io.on ada sebelum server.listen)
// =======================================================
io.on('connection', (socket) => {
    console.log('✅ User terhubung ke Lounge Eksklusif via Socket');

    // Registrasi Handler Terpisah
    registerCallHandlers(io, socket);

    socket.on('joinRoom', (roomId) => {
        // --- VALIDASI KEAMANAN CONCIERGE ---
        if (roomId.startsWith('concierge-')) {
            const targetUserId = roomId.split('-')[1];
            
            // Jika bukan Admin DAN bukan pemilik ID tersebut, Tolak!
            if (socket.user.membership !== 'admin' && socket.user.id !== targetUserId) {
                console.log(`⚠️ Akses Ditolak: ${socket.user.username} mencoba intip room ${roomId}`);
                return socket.emit('error_message', 'Anda tidak memiliki akses ke jalur pribadi ini.');
            }
        }

        // Keluar dari room sebelumnya
        socket.rooms.forEach(room => { if(room !== socket.id) socket.leave(room); });

        socket.join(roomId);
        console.log(`[Lounge] User ${socket.user.username} aman di room: ${roomId}`);
    });

    // Di dalam io.on('connection', (socket) => { ...
    socket.on('sendLoungeMessage', async (data) => {
        console.log("=== DEBUG BACKEND: TERIMA DARI CLIENT ===");
        console.log("Data mentah:", data);
        console.log("ParentMessage ID:", data.parentMessage);
        try {
            // Pastikan data.roomId konsisten dengan pengirim
            let finalRoomId = data.roomId || 'general_lounge';
            
            // Force roomId jika user mencoba kirim ke concierge orang lain lewat script
            if (finalRoomId.startsWith('concierge-') && socket.user.membership !== 'admin') {
                finalRoomId = `concierge-${socket.user.id}`;
            }
            // 1. Simpan ke Database
            const savedMessage = await Lounge.create({
                roomId: data.roomId || 'general_lounge', // AMBIL DARI FRONTEND
                sender: socket.user.id, // Gunakan ID dari token (lebih aman)
                senderName: socket.user.username, // Gunakan dari token agar sinkron
                senderRank: data.rank,
                messageType: data.type,
                parentMessage: data.parentMessage || null, // <--- TAMBAHKAN INI
                content: data.content,
                mediaUrls: data.mediaUrls || [],
                attachments: data.attachments || [],
                fileName: data.fileName
            });

            console.log("Pesan berhasil disimpan ke DB. ID:", savedMessage._id);

            // 2. ⭐ KRUSIAL: Ambil data user lengkap (Populate) sebelum dikirim balik
            const populatedMessage = await Lounge.findById(savedMessage._id)
                .populate('sender', 'username email')
                .populate({
                    path: 'parentMessage',
                    populate: { path: 'sender', select: 'username' }
                });

            console.log("=== DEBUG BACKEND: DATA SETELAH POPULATE ===");
            console.log("Populated Parent:", populatedMessage.parentMessage); 
            // Cek apakah populatedMessage.parentMessage sekarang sudah jadi objek, bukan cuma string ID

            // Kirim hanya ke room yang dituju
            io.to(finalRoomId).emit('receiveLoungeMessage', populatedMessage);
            
        } catch (err) {
            console.error("Gagal simpan/kirim pesan:", err);
        }
    });

    // Listener untuk Edit Pesan
    socket.on('editLoungeMessage', (data) => {
        io.to(data.roomId).emit('messageEdited', data);
    });

    // Listener untuk Hapus Pesan
    socket.on('deleteLoungeMessage', (data) => {
        io.to(data.roomId).emit('messageDeleted', data.messageId);
    });

    socket.on('disconnect', () => {
        // Beritahu orang lain jika user terputus saat sedang telepon
        io.emit('user-left-call', socket.id);
        console.log('❌ User meninggalkan Lounge');
    });
});

// =======================================================
// 7. START SERVER (WAJIB MENGGUNAKAN server.listen)
// =======================================================
server.listen(PORT, () => {
    console.log(`🚀 Server Ultra Masif berjalan di http://localhost:${PORT}`);
    console.log(`📡 Socket.io siap melayani Lounge Eksklusif`);
});