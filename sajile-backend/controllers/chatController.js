const Chat = require('../models/Chat');

// 1. Ambil semua daftar sesi (untuk Sidebar)
exports.getAllSessions = async (req, res) => {
    try {
        const sessions = await Chat.find({ userId: req.user.id })
                                   .select('title lastUpdated')
                                   .sort({ lastUpdated: -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// Tambahkan ini di chatController.js
exports.getSessionById = async (req, res) => {
    try {
        const chat = await Chat.findOne({ 
            _id: req.params.id, 
            userId: req.user.id // Pastikan user hanya bisa akses chat miliknya sendiri
        });

        if (!chat) {
            return res.status(404).json({ msg: 'Percakapan tidak ditemukan' });
        }

        res.json(chat);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// 2. Simpan pesan baru ke sesi (Create atau Update)
exports.saveMessage = async (req, res) => {
    const { sessionId, role, content } = req.body;
    try {
        let chat;
        if (sessionId) {
            // Update sesi yang sudah ada
            chat = await Chat.findById(sessionId);
            chat.messages.push({ role, content });
            chat.lastUpdated = Date.now();
        } else {
            // Buat sesi baru jika tidak ada ID
            chat = new Chat({
                userId: req.user.id,
                title: content.substring(0, 100),
                messages: [{ role, content }]
            });
        }
        await chat.save();
        res.json(chat);
    } catch (err) {
        res.status(500).send('Gagal menyimpan pesan');
    }
};

// 3. Hapus Sesi Percakapan
exports.deleteSession = async (req, res) => {
    try {
        await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ msg: 'Percakapan berhasil dihapus' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};