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

// Fungsi untuk proses Registrasi Pengguna
exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Pengguna dengan email ini sudah terdaftar.' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Kadaluarsa 24 jam
        const profilePictureUrl = getGravatarUrl(email);

        user = new User({
            username,
            email,
            password,
            profilePictureUrl, // Simpan URL Gravatar
            isVerified: false, 
            verificationToken, 
            verificationTokenExpires, 
        });

        const salt = await bcrypt.genSalt(10); 
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const publicURL = getPublicBackendURL();
        const verificationLink = `${publicURL}/api/auth/verify/${verificationToken}`;

        // ===================================================
        // === DEBUGGING LOG BARU: CEK NILAI LINK SEBELUM DIKIRIM ===
        // Log ini akan muncul di konsol CMD Anda.
        console.log(`[DEBUG] Link Verifikasi yang Dibuat untuk ${email}: ${verificationLink}`);
        // ===================================================

        // 2. Kirim email
        // PENTING: Jika link di email masih NULL, masalah ada di file utils/emailSender.js
        const emailSent = await sendVerificationEmail(email, verificationLink);

        if (emailSent) {
            return res.status(201).json({
                msg: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.',
                user: { id: user._id, username: user.username, email: user.email, isVerified: user.isVerified },
            });
        } else {
            await User.deleteOne({ _id: user._id }); 
            return res.status(500).json({ msg: 'Gagal mengirim email verifikasi.' });
        }

    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
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
                            localStorage.setItem('token', '${jwtToken}');
                            
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