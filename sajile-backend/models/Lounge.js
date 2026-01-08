const mongoose = require('mongoose');

const LoungeSchema = new mongoose.Schema({
    roomId: { 
        type: String, 
        required: true, 
        index: true, // Tambahkan index agar pencarian cepat
        default: 'general_lounge' 
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: String,
    senderRank: String,
    messageType: { 
        type: String, 
        // TAMBAHKAN image_group dan doc_group di sini
        enum: ['text', 'image', 'document', 'audio', 'video', 'image_group', 'doc_group'], 
        default: 'text' 
    },
    parentMessage: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Lounge', 
        default: null 
    },
    content: String, 
    mediaUrls: [String], // TAMBAHKAN INI: Untuk menampung banyak gambar
    attachments: [Object], // TAMBAHKAN INI: Untuk menampung banyak dokumen
    fileName: String,
    isEdited: { type: Boolean, default: false },
    spreadBatchId: { type: String, default: null, index: true },
    scheduledAt: { type: Date, default: null },
    selfDestruct: { type: String, default: null },
    isForwardLocked: { type: Boolean, default: false },
    isGhost: { type: Boolean, default: false },
    spreadFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lounge', LoungeSchema);