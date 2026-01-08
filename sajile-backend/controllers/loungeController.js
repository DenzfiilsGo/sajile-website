const Lounge = require('../models/Lounge');

/**
 * Mendapatkan riwayat pesan berdasarkan roomId
 */
exports.getHistory = async (req, res) => {
    try {
        const { roomId } = req.query;
        const userId = req.user.id; // Diambil dari middleware protect
        const userMembership = req.user.membership;

        // Validasi Keamanan: Jika request ke concierge, harus milik sendiri atau dia Admin
        if (roomId && roomId.startsWith('concierge-')) {
            const ownerId = roomId.split('-')[1];
            if (userMembership !== 'admin' && userId !== ownerId) {
                return res.status(403).json({ message: "Akses history ditolak." });
            }
        }

        const filter = roomId ? { roomId } : { roomId: 'general_lounge' };

        // Gunakan populate untuk mengambil detail pengirim dari koleksi User
        const messages = await Lounge.find(filter)
            .populate('sender', 'username email')
            .populate({
                path: 'parentMessage',
                populate: { path: 'sender', select: 'username' } // Penting agar pSender tidak error
            })
            .sort({ timestamp: 1 })
            .limit(100);

        console.log("=== DEBUG CONTROLLER: GET HISTORY ===");
        if (messages.length > 0) {
            console.log("Contoh pesan pertama dengan parent:", messages.find(m => m.parentMessage));
        }
            
        res.json(messages);
    } catch (error) {
        console.error("Error getHistory:", error);
        res.status(500).json({ message: "Gagal memuat riwayat Lounge." });
    }
};

/**
 * Handle Upload Media (Gambar, Audio, Video, Dokumen)
 * Mengembalikan nama file saja untuk fleksibilitas IP Address
 */
exports.uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Tidak ada file diunggah." });
        }

        // Tentukan tipe pesan berdasarkan mimetype secara dinamis
        let type = 'document';
        const mime = req.file.mimetype;

        if (mime.startsWith('image/')) {
            type = 'image';
        } else if (mime.startsWith('audio/')) {
            type = 'audio';
        } else if (mime.startsWith('video/')) {
            type = 'video';
        }

        /**
         * PERUBAHAN KRUSIAL:
         * Kita hanya mengirimkan nama filenya saja (req.file.filename).
         * Frontend akan menggabungkannya dengan Base URL di config.js.
         * Contoh hasil: "media-1735293245.jpg"
         */
        res.json({
            url: req.file.filename, 
            type: type,
            fileName: req.file.originalname,
            fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB'
        });

    } catch (error) {
        console.error("Error uploadMedia:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat memproses file." });
    }
};

// Fungsi Edit Pesan
exports.editMessage = async (req, res) => {
    try {
        const { messageId, newContent } = req.body;
        const message = await Lounge.findById(messageId);

        if (!message) return res.status(404).json({ message: "Pesan tidak ditemukan." });
        if (message.sender.toString() !== req.user.id) return res.status(403).json({ message: "Akses ditolak." });

        // Cek Batas Waktu 30 Menit
        const now = new Date();
        const diffInMinutes = Math.floor((now - message.timestamp) / 1000 / 60);
        if (diffInMinutes >= 30) return res.status(400).json({ message: "Batas waktu edit (30 menit) telah berakhir." });

        message.content = newContent;
        message.isEdited = true;
        await message.save();

        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ message: "Gagal edit pesan." });
    }
};

// Fungsi Hapus Pesan
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Lounge.findById(messageId);

        if (!message) return res.status(404).json({ message: "Pesan tidak ditemukan." });
        if (message.sender.toString() !== req.user.id) return res.status(403).json({ message: "Akses ditolak." });

        await Lounge.findByIdAndDelete(messageId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Gagal menghapus pesan." });
    }
};

/**
 * Handle Spread/Forward Messages (Massal & Advanced)
 */
exports.spreadMessages = async (req, res) => {
    try {
        const io = req.app.get('io');
        // payload: Array of objects { originalMessageId, caption, options, targetRooms }
        // options: { privacyMode, scheduledAt, selfDestruct, forwardLock, isGhost, watermark }
        const { spreadPayload } = req.body; 
        const senderId = req.user.id;
        const sender = await require('../models/User').findById(senderId);
        const batchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const createdMessages = [];

        for (let item of spreadPayload) {
            const { originalContent, mediaUrls, attachments, messageType, options, targetRooms } = item;
            
            // Loop untuk setiap Target (Multi-Target Selection)
            for (let roomId of targetRooms) {
                
                // Logic 5: Smart Scheduler (Simpan tapi belum dipublish jika ada tanggal)
                // Di sini kita simpan saja, service cronJob (server.js) yang akan mengeksekusi nanti.
                
                const newMessage = new Lounge({
                    roomId: roomId,
                    sender: senderId,
                    senderName: sender.username,
                    senderRank: sender.rank || 'Chef', // Asumsi ada field rank
                    messageType: messageType,
                    content: item.caption || originalContent, // 1. Contextual Caption
                    mediaUrls: mediaUrls, // 10. Auto Watermark (Gambar sudah diproses di Client & diupload ulang/reuse URL)
                    attachments: attachments,
                    parentMessage: options.privacyMode ? null : item.originalMessageId,
                    spreadFrom: options.privacyMode ? null : senderId,
                    spreadBatchId: batchId,
                    scheduledAt: options.scheduledAt || null,
                    selfDestruct: options.selfDestruct || null,
                    isForwardLocked: options.forwardLock || false,
                    isGhost: options.isGhost || false
                });

                await newMessage.save();
                
                // Populate untuk return data yang lengkap
                // PERBAIKAN: Populate Deep Level untuk parentMessage
                // Agar frontend bisa merender preview kartu pesan tanpa refresh
                const populated = await Lounge.findById(newMessage._id)
                    .populate('sender', 'username email')
                    .populate({
                        path: 'parentMessage',
                        select: 'sender senderName content messageType mediaUrls attachments', // Ambil field penting saja
                        populate: { path: 'sender', select: 'username email' } // Ambil nama pengirim asli
                    });
                io.to(roomId).emit('receiveLoungeMessage', populated);
                createdMessages.push(populated);
            }
        }

        // Return sukses ke client (Socket.io di server.js akan menangani broadcasting real-time)
        res.json({ success: true, data: createdMessages });

    } catch (err) {
        console.error("Gagal menyebarkan pesan:", err);
        res.status(500).json({ message: "Gagal menyebarkan pesan." });
    }
};