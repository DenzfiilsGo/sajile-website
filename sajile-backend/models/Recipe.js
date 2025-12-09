// File: sajile-backend/models/Recipe.js

const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
    // Info Dasar
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['makanan_utama', 'camilan', 'minuman', 'dessert'],
        required: true
    },
    
    // User yang membuat resep
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Gambar
    imageUrl: {
        type: String,
        default: 'https://via.placeholder.com/800x450?text=Resep+Baru'
    },
    
    // Bahan-bahan
    ingredients: [{
        quantity: {
            type: String,
            required: true
        },
        unit: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    }],
    
    // Alat-alat (baru)
    //tools: [{
    //    type: String
    //}],
    tools: {
        type: [String],
        default: []
    },

    // Langkah-langkah
    steps: [{
        type: String,
        required: true
    }],
    
    // Porsi
    servingSize: {
        type: Number,
        default: 4
    },
    
    // Waktu memasak
    cookTime: {
        type: Number,
        default: 30
    },
    prepTime: {
        type: Number,
        default: 15
    },
    
    // Rating & Review
    ratings: [{
        userId: mongoose.Schema.Types.ObjectId,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    
    // Status & Metadata
    isPublished: {
        type: Boolean,
        default: true
    },
    views: {
        type: Number,
        default: 0
    },
    
}, {
    timestamps: true
});

// Computed field: Average Rating
RecipeSchema.virtual('avgRating').get(function() {
    if (!this.ratings || this.ratings.length === 0) return 0;
    const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
    return sum / this.ratings.length;
});

RecipeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Recipe', RecipeSchema);