// File: saji-backend/routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   GET /api/auth/verify/:token
// @desc    Memverifikasi akun pengguna melalui link email
// @access  Public
router.get('/verify/:token', authController.verifyAccount); // <-- BARU

// @route   POST /api/auth/register
// @desc    Mendaftarkan user baru (akan mengirim email verifikasi)
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Otentikasi user & dapatkan token (hanya untuk user terverifikasi)
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth
// @desc    Mendapatkan data user berdasarkan token
// @access  Private (Membutuhkan token)
router.get('/', auth, authController.getAuthUser);

// @route   POST /api/auth/forgotpassword
// @desc    Request link reset password
// @access  Public
router.post('/forgotpassword', authController.forgotPassword);

// @route   PUT /api/auth/resetpassword/:resettoken
// @desc    Proses reset password baru
// @access  Public
router.put('/resetpassword/:resettoken', authController.resetPassword);

router.post('/google', authController.googleLogin);

module.exports = router;