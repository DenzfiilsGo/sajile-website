// File: sajile-backend/controllers/recipeController.js

const Recipe = require('../models/Recipe');
const User = require('../models/User');
const Favorite = require('../models/Favorite');

// --- Helper untuk membersihkan input (Sanitize) ---
const sanitizeInput = (html) => {
    if (html === undefined || html === null) return '';
    if (typeof html !== 'string') return String(html);
    return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "").replace(/<.*?>/g, "");
};

// ====================================================================
// 1. FUNGSI BARU (WAJIB ADA UNTUK HALAMAN "RESEP SAYA")
// ====================================================================
// Ini menjembatani Frontend yang memanggil /api/recipes/my
exports.getMyRecipes = async (req, res) => {
    try {
        const { limit = 10, offset = 0, status } = req.query;
        // Ambil ID langsung dari token pengguna yang login
        const userId = req.user.id; 

        // Query dasar: Resep buatan saya
        let query = { createdBy: userId };

        // Logika filter: Tampilkan Draft ATAU Published sesuai permintaan Frontend
        if (status === 'published') {
            query.isPublished = true;
        } else if (status === 'draft') {
            query.isPublished = false;
        }
        // Jika status 'all', query.isPublished tidak diset, jadi akan mengambil KEDUANYA.

        const total = await Recipe.countDocuments(query);

        const recipes = await Recipe.find(query)
            .sort({ createdAt: -1 }) // Urutkan dari yang terbaru
            .limit(parseInt(limit))
            .skip(parseInt(offset));

        // Tambahkan hitungan rating untuk tampilan
        const recipesWithRating = recipes.map(recipe => {
            const recipeObj = recipe.toObject();
            recipeObj.avgRating = recipe.avgRating || 0;
            return recipeObj;
        });

        res.json({
            recipes: recipesWithRating,
            total: total,
            hasMore: total > (parseInt(offset) + parseInt(limit))
        });

    } catch (error) {
        console.error('Error fetching my recipes:', error);
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};

// ====================================================================
// 2. FUNGSI LAMA ANDA (CREATE) - Tetap Dipertahankan
// ====================================================================
exports.createRecipe = async (req, res) => {
    try {
        const {
            title, description, category,
            ingredients, steps, tools,
            servingSize, cookTime, prepTime
        } = req.body;

        const userId = req.user.id;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;

        // Validasi dasar
        const cleanTitle = sanitizeInput(title ? String(title).trim() : '');
        const cleanDescription = sanitizeInput(description ? String(description).trim() : '');
        const cleanCategory = sanitizeInput(category ? String(category).trim() : '');

        if (!cleanTitle || !cleanDescription || !cleanCategory) {
            return res.status(400).json({ msg: 'Data utama (judul, deskripsi, kategori) wajib diisi.' });
        }

        // Parsing JSON string kembali ke Array (karena dikirim via FormData)
        let parsedIngredients = typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients;
        let parsedTools = typeof tools === 'string' ? JSON.parse(tools) : tools;
        let parsedSteps = typeof steps === 'string' ? JSON.parse(steps) : steps;

        // LOGIKA OTOMATIS PREMIUM:
        // Cek status membership user dari req.user (yang diisi oleh auth middleware terbaru kita)
        const isUserPremium = req.user.membership !== 'free';

        const newRecipe = new Recipe({
            title: cleanTitle,
            description: cleanDescription,
            category: cleanCategory,
            ingredients: parsedIngredients,
            steps: parsedSteps,
            tools: parsedTools,
            servingSize: parseInt(servingSize),
            cookTime: parseInt(cookTime),
            prepTime: parseInt(prepTime),
            imageUrl: imageUrl,
            createdBy: userId,
            // OTOMATIS SET PREMIUM JIKA USER ADALAH MEMBER PREMIUM
            isPremium: isUserPremium 
        });

        await newRecipe.save();
        res.status(201).json({ msg: 'Resep berhasil diunggah', recipe: newRecipe });
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};

// ====================================================================
// 3. FUNGSI LAMA ANDA (GET ALL) - Tetap Dipertahankan
// ====================================================================
exports.getAllRecipes = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 9;
        const offset = parseInt(req.query.offset) || 0;
        
        const query = { isPublished: true }; 
        const total = await Recipe.countDocuments(query);

        // Ambil data resep (avgRating dan totalReviews diambil langsung dari field model Recipe)
        const recipes = await Recipe.find(query)
            .populate('createdBy', 'username email profilePictureUrl')
            .sort({ createdAt: -1 }) 
            .limit(limit)
            .skip(offset)
            .lean(); 

        res.json({
            recipes: recipes, // Data sudah mengandung avgRating & totalReviews dari DB
            total: total,
            limit: limit,
            offset: offset,
            hasMore: total > (offset + limit) 
        });

    } catch (error) {
        console.error('❌ FATAL ERROR di getAllRecipes:', error.stack);
        res.status(500).json({ msg: 'Gagal memuat resep.', error: error.message });
    }
};

// ====================================================================
// 4. FUNGSI GET BY ID (Dengan Proteksi Konten Premium)
// ====================================================================
exports.getRecipeById = async (req, res) => {
    try {
        // 1. Ambil data resep dan populate data pembuatnya
        const recipe = await Recipe.findById(req.params.id)
            .populate('createdBy', 'username email profilePictureUrl membership')
            .populate('ratings.userId', 'username');

        if (!recipe) {
            return res.status(404).json({ msg: 'Resep tidak ditemukan' });
        }

        // 2. LOGIKA PROTEKSI PREMIUM
        // Cek jika resep ini ditandai sebagai premium
        if (recipe.isPremium) {
            const currentUser = req.user; // Didapat dari optionalAuth atau auth middleware

            // Logika Akses:
            // - Jika tidak login (!currentUser) -> BLOKIR
            // - Jika login tapi membership 'free' -> BLOKIR
            // KECUALI: User tersebut adalah pembuat resepnya sendiri (Owner)
            const isOwner = currentUser && currentUser.id === recipe.createdBy._id.toString();
            const isSubscriber = currentUser && currentUser.membership !== 'free';

            if (!isOwner && !isSubscriber) {
                return res.status(403).json({ 
                    msg: 'Konten Eksklusif! Silakan berlangganan paket Premium untuk melihat resep ini.',
                    isLocked: true,
                    title: recipe.title, // Tetap kirim judul untuk keperluan UI gembok
                    imageUrl: recipe.imageUrl
                });
            }
        }

        // 3. Tambah view count jika akses diizinkan
        recipe.views += 1;
        await recipe.save();

        // 4. Transformasi ke Object untuk manipulasi data tambahan
        const recipeObj = recipe.toObject();
        recipeObj.avgRating = recipe.avgRating || 0;

        // 5. LOGIKA CEK FAVORIT
        recipeObj.isFavorited = false; 
        
        // req.user didapat jika token valid (via optionalAuth/auth)
        if (req.user && req.user.id) {
            const fav = await Favorite.findOne({ 
                user: req.user.id, 
                recipe: req.params.id 
            });
            if (fav) recipeObj.isFavorited = true;
        }

        // 6. Kirim response final
        res.json(recipeObj);

    } catch (error) {
        console.error('Error fetching recipe by ID:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Format ID resep tidak valid' });
        }
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};

// ====================================================================
// 5. FUNGSI LAMA ANDA (RATE) - Tetap Dipertahankan
// ====================================================================
exports.rateRecipe = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const userId = req.user.id;

        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ msg: 'Rating harus 1-5' });

        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) return res.status(404).json({ msg: 'Resep tidak ditemukan' });

        const existingRating = recipe.ratings.find(r => r.userId.toString() === userId);
        if (existingRating) {
            existingRating.rating = rating;
            existingRating.comment = comment || '';
            existingRating.createdAt = Date.now();
        } else {
            recipe.ratings.push({ userId, rating, comment: comment || '' });
        }

        await recipe.save();
        res.json({ msg: 'Rating berhasil disimpan', avgRating: recipe.avgRating });

    } catch (error) {
        console.error('Error rating recipe:', error);
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};

// ====================================================================
// 6. FUNGSI LAMA ANDA (DELETE) - Tetap Dipertahankan
// ====================================================================
exports.deleteRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) return res.status(404).json({ msg: 'Resep tidak ditemukan' });

        if (recipe.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Anda tidak berhak menghapus resep ini' });
        }

        await Recipe.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Resep berhasil dihapus' });

    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};

// ====================================================================
// 7. FUNGSI LAMA ANDA (GET BY USER) - Tetap Dipertahankan
// ====================================================================
// Fungsi ini tetap ada untuk menampilkan profil publik orang lain
// Ia hanya akan mengambil resep yang PUBLISHED.
exports.getRecipesByUser = async (req, res) => {
    try {
        const { limit = 9, offset = 0 } = req.query;
        const userId = req.params.userId;

        const total = await Recipe.countDocuments({ createdBy: userId, isPublished: true });

        const recipes = await Recipe.find({ createdBy: userId, isPublished: true })
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));

        const recipesWithRating = recipes.map(recipe => {
            const recipeObj = recipe.toObject();
            recipeObj.avgRating = recipe.avgRating || 0;
            return recipeObj;
        });

        res.json({
            recipes: recipesWithRating,
            total: total,
            page: Math.floor(offset / limit) + 1
        });

    } catch (error) {
        console.error('Error fetching user recipes:', error);
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};