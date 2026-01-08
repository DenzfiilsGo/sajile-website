const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs'); // <--- TAMBAHKAN BARIS INI
const path = require('path');
const loungeController = require('../controllers/loungeController');
const protect = require('../middleware/auth');

// Konfigurasi Penyimpanan Berkas
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/lounge';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } 
});

// Gunakan fungsi controller secara langsung (Express akan handle jika tidak ada)
router.get('/history', protect, loungeController.getHistory);
router.post('/upload-media', protect, upload.single('media'), loungeController.uploadMedia);

// --- TAMBAHAN BARU (FITUR EDIT & DELETE) ---
// 1. Rute Edit Pesan (PUT)
router.put('/edit', protect, loungeController.editMessage);

// 2. Rute Hapus Pesan (DELETE dengan Parameter ID)
router.delete('/delete/:messageId', protect, loungeController.deleteMessage);

router.post('/spread', protect, loungeController.spreadMessages);

module.exports = router;