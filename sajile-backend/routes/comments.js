const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// @route   GET /api/comments/:recipeId
// @desc    Ambil semua komentar untuk resep tertentu
// @access  Public
router.get('/:recipeId', async (req, res) => {
    try {
        const comments = await Comment.find({ recipe: req.params.recipeId })
            .populate('user', ['username', 'profilePictureUrl']) // Ambil nama & foto user saja
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/comments
// @desc    Tambah komentar baru
// @access  Private
router.post('/', auth, async (req, res) => {
    const { recipeId, content, rating } = req.body;
    try {
        const newComment = new Comment({
            user: req.user.id,
            recipe: recipeId,
            content,
            rating
        });
        const savedComment = await newComment.save();
        
        // Populate user info agar frontend bisa langsung tampilkan tanpa refresh
        await savedComment.populate('user', ['username', 'profilePictureUrl']);
        
        res.json(savedComment);
    } catch (err) {
        res.status(500).send('Server Error');
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

        // 1. Cek Kepemilikan (User yang login harus pemilik komentar)
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Tidak diizinkan' });
        }

        // 2. Cek apakah sudah pernah diedit
        if (comment.isEdited) {
            return res.status(400).json({ msg: 'Komentar hanya boleh diedit satu kali.' });
        }

        // Update
        comment.content = content || comment.content;
        comment.rating = rating || comment.rating;
        comment.isEdited = true; // Kunci agar tidak bisa diedit lagi

        await comment.save();
        res.json(comment);

    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/comments/:id
// @desc    Hapus komentar
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ msg: 'Komentar tidak ditemukan' });

        // Cek Kepemilikan
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Tidak diizinkan' });
        }

        await comment.deleteOne();
        res.json({ msg: 'Komentar dihapus' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;