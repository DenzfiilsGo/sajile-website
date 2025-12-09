// File: saji-backend/models/User.js

const mongoose = require('mongoose');

// Definisikan Skema (Schema) untuk User
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true, 
        unique: true, 
        trim: true, 
        minlength: 3 
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
    
}, {
    timestamps: true 
});

// Eksport model
module.exports = mongoose.model('User', UserSchema);