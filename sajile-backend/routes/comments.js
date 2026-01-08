const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // WAJIB DIIMPORT!
const Comment = require('../models/Comment');
const Recipe = require('../models/Recipe');
const auth = require('../middleware/auth');

// Fungsi Helper untuk menghitung statistik rating resep secara otomatis
async function updateRecipeStats(recipeId) {
    try {
        const stats = await Comment.aggregate([
            { $match: { recipe: new mongoose.Types.ObjectId(recipeId) } },
            {
                $group: {
                    _id: '$recipe',
                    avgRating: { $avg: '$rating' },
                    total: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            await Recipe.findByIdAndUpdate(recipeId, {
                avgRating: parseFloat(stats[0].avgRating.toFixed(1)),
                totalReviews: stats[0].total
            });
        } else {
            // JIKA TIDAK ADA KOMENTAR (Reset ke 0)
            await Recipe.findByIdAndUpdate(recipeId, {
                avgRating: 0,
                totalReviews: 0
            });
        }
        console.log(`✅ Statistik Resep ${recipeId} diperbarui.`);
    } catch (err) {
        console.error('❌ Gagal memperbarui statistik resep:', err);
    }
}

// @route   GET /api/comments/:recipeId
// @desc    Ambil semua komentar untuk resep tertentu
// @access  Public
router.get('/:recipeId', async (req, res) => {
    try {
        const comments = await Comment.find({ recipe: req.params.recipeId })
            .populate('user', ['username', 'profilePictureUrl'])
            .sort({ createdAt: -1 });
        
        res.json(comments);

        // Opsi: Update stats tiap kali diakses untuk memastikan sinkronisasi
        if (req.params.recipeId) {
            await updateRecipeStats(req.params.recipeId);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/comments
// @desc    Tambah komentar baru & Update Rating Resep
// @access  Private
router.post('/', auth, async (req, res) => {
    const { recipeId, content, rating } = req.body;
    try {
        const newComment = new Comment({
            user: req.user.id,
            recipe: recipeId,
            content,
            rating: parseFloat(rating)
        });

        const savedComment = await newComment.save();
        
        // JALANKAN UPDATE
        await updateRecipeStats(recipeId);
        
        await savedComment.populate('user', ['username', 'profilePictureUrl']);
        res.json(savedComment);
    } catch (err) {
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   PUT /api/comments/:id
// @desc    Edit komentar (Hanya 1x)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { content, rating } = req.body;
    try {
        let comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ msg: 'Komentar tidak ditemukan' });

        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Tidak diizinkan' });
        }

        if (comment.isEdited) {
            return res.status(400).json({ msg: 'Komentar hanya boleh diedit satu kali.' });
        }

        comment.content = content || comment.content;
        comment.rating = rating || comment.rating;
        comment.isEdited = true;

        await comment.save();
        
        // JALANKAN UPDATE
        await updateRecipeStats(comment.recipe);

        res.json(comment);
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/comments/:id
// @desc    Hapus komentar
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ msg: 'Komentar tidak ditemukan' });

        const recipeId = comment.recipe;

        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Tidak diizinkan' });
        }

        await comment.deleteOne();
        
        // JALANKAN UPDATE SETELAH HAPUS
        await updateRecipeStats(recipeId);

        res.json({ msg: 'Komentar dihapus' });
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;