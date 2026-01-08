const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const auth = require('../middleware/auth'); // Pastikan Anda punya middleware auth

// @route   POST /api/favorites
// @desc    Tambah resep ke favorit
// @access  Private
router.post('/', auth, async (req, res) => {
    const { recipeId } = req.body;
    try {
        const existingFav = await Favorite.findOne({ user: req.user.id, recipe: recipeId });
        if (existingFav) {
            return res.status(400).json({ msg: 'Resep sudah ada di favorit' });
        }

        const newFav = new Favorite({ user: req.user.id, recipe: recipeId });
        await newFav.save();
        res.json({ msg: 'Resep ditambahkan', isFavorited: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/favorites/:recipeId
// @desc    Hapus resep dari favorit (Modular)
// @access  Private
router.delete('/:recipeId', auth, async (req, res) => {
    try {
        const result = await Favorite.findOneAndDelete({ 
            user: req.user.id, 
            recipe: req.params.recipeId 
        });

        if (!result) {
            return res.status(404).json({ msg: 'Resep favorit tidak ditemukan' });
        }

        res.json({ msg: 'Resep berhasil dihapus dari favorit', isFavorited: false });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/favorites
// @desc    Ambil semua resep favorit user yang sedang login
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const favorites = await Favorite.find({ user: req.user.id })
            .populate('recipe') // Mengambil detail resep dari ID-nya
            .sort({ createdAt: -1 }); // Urutkan dari yang terbaru

        // Kembalikan hanya array resepnya agar frontend mudah memproses
        const recipes = favorites.map(fav => fav.recipe);
        res.json(recipes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/favorites/check/:recipeId
// @desc    Cek status apakah resep X sudah difavoritkan user ini? (Untuk UI tombol hati)
// @access  Private
router.get('/check/:recipeId', auth, async (req, res) => {
    try {
        const fav = await Favorite.findOne({ 
            user: req.user.id, 
            recipe: req.params.recipeId 
        });
        res.json({ isFavorited: !!fav }); // Mengembalikan true/false
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;