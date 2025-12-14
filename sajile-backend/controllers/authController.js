// File: saji-backend/controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailSender');

// ==================================================================
// 🔧 KONFIGURASI KRUSIAL: URL FRONTEND LOKAL (Live Server)
// URL ini harus cocok dengan port Live Server VS Code Anda (127.0.0.1:5500)
// ==================================================================
const { getPublicBackendURL } = require("../utils/getPublicUrl");
const FRONTEND_URL = process.env.PUBLIC_FRONTEND_URL;
// ==================================================================

// --- Helper untuk Generate Gravatar URL ---
const getGravatarUrl = (email) => {
    // 1. Trim whitespace dan lowercase
    const cleanEmail = email.trim().toLowerCase();
    // 2. Buat MD5 hash
    const hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
    // 3. Return URL (d=mp artinya default mystery person jika tidak ada foto)
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`;
};

// File: saji-backend/controllers/authController.js (Update Bagian Register)

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    let userCreated = null; // Penampung user sementara

    try {
        // 1. Cek Duplikat
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Pengguna dengan email ini sudah terdaftar.' });
        }

        // 2. Persiapan Data
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        const profilePictureUrl = getGravatarUrl(email);

        userCreated = new User({
            username,
            email,
            password,
            profilePictureUrl,
            isVerified: false,
            verificationToken,
            verificationTokenExpires,
        });

        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        userCreated.password = await bcrypt.hash(password, salt);
        
        // 4. SIMPAN KE DB
        await userCreated.save();

        // 5. Generate Link
        const publicURL = getPublicBackendURL();
        const verificationLink = `${publicURL}/api/auth/verify/${verificationToken}`;
        
        console.log(`[DEBUG] Mencoba kirim email ke: ${email}`);

        // 6. Kirim Email
        const emailSent = await sendVerificationEmail(email, verificationLink);

        if (!emailSent) {
            // ⚠️ KRUSIAL: JIKA EMAIL GAGAL, HAPUS USER DARI DB!
            console.error("[REGISTER] Email gagal dikirim. Menghapus user...");
            await User.deleteOne({ _id: userCreated._id });
            return res.status(500).json({ msg: 'Gagal mengirim email verifikasi. Silakan coba sesaat lagi.' });
        }

        // 7. Sukses
        return res.status(201).json({
            msg: 'Registrasi berhasil! Silakan cek email Anda.',
            user: { id: userCreated._id, email: userCreated.email }
        });

    } catch (err) {
        console.error("❌ Register Error (Catch Block):", err.message);
        
        // ROLLBACK JIKA ERROR TAK TERDUGA
        if (userCreated && userCreated._id) {
            try {
                await User.deleteOne({ _id: userCreated._id });
                console.log("ℹ️ Rollback: User dihapus karena error sistem.");
            } catch (e) { console.error("Gagal rollback:", e.message); }
        }

        // ⭐ PERBAIKAN KRUSIAL: TANGANI MONGODB DUPLICATE KEY (E11000)
        if (err.code === 11000) {
             // Kode 409 Conflict (atau 400 Bad Request) lebih akurat untuk duplikat
             const key = Object.keys(err.keyValue)[0]; // Mendapat 'username' atau 'email'
             const value = err.keyValue[key];
             let msg = `Registrasi gagal: ${key} '${value}' sudah digunakan.`;

             // Jika terjadi duplikat pada username, kirim pesan spesifik
             if (key === 'username') {
                 msg = `Nama pengguna '${value}' sudah digunakan.`;
             } else if (key === 'email') {
                 msg = `Email '${value}' sudah terdaftar.`;
             }

             // Hentikan proses dan kirim respons 409
             return res.status(409).json({ msg }); 
        }

        if (err.name === 'ValidationError') {
            // Ambil pesan error pertama
            const firstErrorKey = Object.keys(err.errors)[0];
            const msg = err.errors[firstErrorKey].message;
            return res.status(400).json({ msg });
        }
        
        res.status(500).json({ msg: 'Terjadi kesalahan server internal yang tidak terduga.' });
    }
};

// Fungsi untuk proses Login Pengguna
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Email atau Password salah.' });
        
        // Cek status verifikasi
        if (!user.isVerified) return res.status(401).json({ msg: 'Akun belum diverifikasi. Cek email Anda.' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Email atau Password salah.' });
        
        const payload = { user: { id: user.id, role: user.role } };
        
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;

            // --- UPDATE: Kirim data user lengkap ke frontend saat login ---
            res.json({ 
                token, 
                msg: 'Login berhasil!',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    profilePictureUrl: user.profilePictureUrl // Kirim URL foto
                }
            });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// FUNGSI UTAMA: Verifikasi Akun dari link email
exports.verifyAccount = async (req, res) => {
    try {
        const token = req.params.token;

        const user = await User.findOne({
            verificationToken: token,
            // Cek token dan pastikan belum kadaluarsa
            verificationTokenExpires: { $gt: Date.now() } 
        });

        if (!user) {
            // Token tidak valid atau kadaluarsa
            return res.status(400).send(`
                <h1 style="color:red; font-family:sans-serif; text-align:center;">Verifikasi Gagal!</h1>
                <p style="font-family:sans-serif; text-align:center;">Link verifikasi tidak valid atau sudah kadaluarsa.</p>
                <p style="font-family:sans-serif; text-align:center;">Silakan registrasi ulang atau coba lagi.</p>
            `);
        }

        // AKUN BERHASIL DIVERIFIKASI
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save(); 

        // Buat token login untuk auto-login
        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }, 
            (err, jwtToken) => {
                if (err) throw err;
                
                // --- RESPON SUKSES DENGAN REDIRECT KE LIVE SERVER PORT ---
                res.send(`
                    <html>
                    <head>
                        <title>Verifikasi Berhasil</title>
                        <style>
                            body { font-family: sans-serif; text-align: center; padding-top: 50px; }
                            h1 { color: #2ecc71; }
                        </style>
                    </head>
                    <body>
                        <h1>Verifikasi Berhasil!</h1>
                        <p>Akun SajiLe Anda telah diaktifkan. Mengalihkan Anda ke halaman utama...</p>
                        <script>
                            // 1. Simpan token ke LocalStorage
                            localStorage.setItem('authToken', '${jwtToken}');
                            
                            // 2. Redirect ke FRONTEND URL yang BENAR (Live Server)
                            window.location.href = '${FRONTEND_URL}/index.html';
                        </script>
                    </body>
                    </html>
                `);
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Fungsi untuk mendapatkan data user yang sedang login
exports.getAuthUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); 
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};