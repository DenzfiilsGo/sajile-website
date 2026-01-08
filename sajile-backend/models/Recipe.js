// File: sajile-backend/models/Recipe.js

const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
    // Tambahkan ke Recipe.js
    isPremium: { 
        type: Boolean, 
        default: false 
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ['makanan_utama', 'camilan', 'minuman', 'dessert'],
        required: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String, default: 'https://via.placeholder.com/800x450?text=Resep+Baru' },
    
    ingredients: [{
        quantity: { type: String, required: true },
        unit: { type: String, required: true },
        name: { type: String, required: true }
    }],
    
    tools: { type: [String], default: [] },
    steps: [{ type: String, required: true }],
    
    servingSize: { type: Number, default: 4 },
    cookTime: { type: Number, default: 30 },
    prepTime: { type: Number, default: 15 },
    
    // Field lama tetap ada (opsional)
    ratings: [{
        userId: mongoose.Schema.Types.ObjectId,
        rating: { type: Number, min: 0.5, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],

    // --- FIELD STATISTIK (REAL PATH) ---
    // Gunakan ini untuk menyimpan hasil hitungan dari comments.js
    avgRating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    
    isPublished: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    
}, {
    timestamps: true,
    // Hapus virtuals: true jika tidak ada virtual lain
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==========================================================
// PENTING: BAGIAN VIRTUAL AVGRATING DI BAWAH INI DIHAPUS!
// Karena sudah ada avgRating sebagai field nyata di atas.
// ==========================================================

module.exports = mongoose.model('Recipe', RecipeSchema);