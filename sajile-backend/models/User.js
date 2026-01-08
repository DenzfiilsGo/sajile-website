// File: saji-backend/models/User.js

const mongoose = require('mongoose');

// Definisikan Skema (Schema) untuk User
const UserSchema = new mongoose.Schema({
    // Tambahkan ini ke UserSchema di User.js
    membership: {
        type: String,
        enum: [
            'free', 
            'starter_taster', 'starter_pro', 
            'premium_home', 'premium_elite', 
            'legend_year', 'legend_eternal'
        ],
        default: 'free'
    },
    premiumUntil: {
        type: Date,
        default: null // null berarti selamanya (untuk paket free atau legend)
    },
    aiCredits: { // TAMBAHKAN INI
        type: Number,
        default: 5 
    },
    lastAiReset: {
        type: Date,
        default: Date.now
    },
    username: {
        type: String,
        required: true, 
        unique: true, 
        trim: true, 
        minlength: 3 
    },
    bio: {
        type: String,
        default: 'Halo! Saya pecinta kuliner di SajiLe.',
        maxlength: 200
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/.+@.+\..+/, 'Harus berupa alamat email yang valid'] 
    },
    password: {
        type: String,
        required: true,
        minlength: 6 
    },
    profilePictureUrl: {
        type: String,
        default: '' 
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user' 
    },
    date: {
        type: Date,
        default: Date.now // Penting untuk "Tanggal Bergabung"
    },
    // FIELD BARU UNTUK VERIFIKASI EMAIL
    isVerified: { // Status verifikasi akun
        type: Boolean,
        default: false, // Default: Belum terverifikasi
    },
    verificationToken: { // Token unik untuk link verifikasi
        type: String,
        required: false, // Opsional setelah verifikasi berhasil
    },
    verificationTokenExpires: { // Kapan token ini kadaluarsa
        type: Date,
        required: false, // Opsional setelah verifikasi berhasil
    },

    // TAMBAHKAN INI UNTUK FITUR RESET PASSWORD
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
}, {
    timestamps: true 
});

// Eksport model
module.exports = mongoose.model('User', UserSchema);