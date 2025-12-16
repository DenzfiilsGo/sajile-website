const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Mengacu ke model User
        required: true
    },
    recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe', // Mengacu ke model Recipe
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Mencegah duplikasi: Satu user hanya boleh memfavoritkan satu resep yang sama satu kali
FavoriteSchema.index({ user: 1, recipe: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);