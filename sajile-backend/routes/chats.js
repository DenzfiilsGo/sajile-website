const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// Semua route di sini diawali dengan /api/chats
router.get('/', auth, chatController.getAllSessions); // Ambil list history
router.get('/:id', auth, chatController.getSessionById); // Riwayat percakapan
router.post('/save', auth, chatController.saveMessage); // Simpan pesan
router.delete('/:id', auth, chatController.deleteSession); // Hapus history

module.exports = router;