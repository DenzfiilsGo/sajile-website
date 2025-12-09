// File: sajile-backend/controllers/recipeController.js

const Recipe = require('../models/Recipe');
const User = require('../models/User');

// safe sanitize helper (simple placeholder)
const sanitizeInput = (html) => {
    if (html === undefined || html === null) return '';
    if (typeof html !== 'string') return String(html);
    // Hapus tag <script> dan isinya, lalu strip tags (placeholder)
    return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
               .replace(/<.*?>/g, "");
};

exports.createRecipe = async (req, res) => {
    try {
        const {
            title, description, category,
            ingredients, steps, tools,
            servingSize, cookTime, prepTime
        } = req.body;

        const userId = req.user.id;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;

        // Normalize and sanitize text fields (accept numbers too)
        const cleanTitle = sanitizeInput(title ? String(title).trim() : '');
        const cleanDescription = sanitizeInput(description ? String(description).trim() : '');
        const cleanCategory = sanitizeInput(category ? String(category).trim() : '');

        // Normalize numeric-ish fields to strings then parse
        const rawServing = servingSize !== undefined && servingSize !== null ? String(servingSize).trim() : '';
        const rawCook = cookTime !== undefined && cookTime !== null ? String(cookTime).trim() : '';
        const rawPrep = prepTime !== undefined && prepTime !== null ? String(prepTime).trim() : '';

        // Basic required fields
        if (!cleanTitle || !cleanDescription || !cleanCategory || !rawServing || !rawCook || !rawPrep) {
            return res.status(400).json({
                msg: 'Harap isi semua field teks/numerik wajib (judul, deskripsi, kategori, porsi, waktu masak & persiapan).'
            });
        }

        // Gambar wajib: file atau imageUrl
        if (!req.file && !imageUrl) {
            return res.status(400).json({ msg: 'Wajib menyertakan foto resep.' });
        }

        // --- Parse arrays: accept either JSON-string or real array ---
        let parsedIngredients = [];
        let parsedTools = [];
        let parsedSteps = [];

        // Ingredients: string (JSON) or array
        if (ingredients) {
            if (typeof ingredients === 'string') {
                try {
                    parsedIngredients = JSON.parse(ingredients);
                } catch (e) {
                    return res.status(400).json({ msg: 'Format bahan-bahan tidak valid' });
                }
            } else if (Array.isArray(ingredients)) {
                parsedIngredients = ingredients;
            } else {
                return res.status(400).json({ msg: 'Format bahan-bahan tidak valid' });
            }
        }

        // Tools
        if (tools) {
            if (typeof tools === 'string') {
                try {
                    parsedTools = JSON.parse(tools);
                } catch (e) {
                    return res.status(400).json({ msg: 'Format alat-alat tidak valid' });
                }
            } else if (Array.isArray(tools)) {
                parsedTools = tools;
            } else {
                return res.status(400).json({ msg: 'Format alat-alat tidak valid' });
            }
        }

        // Steps
        if (steps) {
            if (typeof steps === 'string') {
                try {
                    parsedSteps = JSON.parse(steps);
                } catch (e) {
                    return res.status(400).json({ msg: 'Format langkah-langkah tidak valid' });
                }
            } else if (Array.isArray(steps)) {
                parsedSteps = steps;
            } else {
                return res.status(400).json({ msg: 'Format langkah-langkah tidak valid' });
            }
        }

        // --- Validate arrays after parsing and sanitize their contents ---
        if (!Array.isArray(parsedIngredients) || parsedIngredients.length === 0) {
            return res.status(400).json({ msg: 'Resep wajib memiliki minimal satu Bahan yang lengkap.' });
        }
        for (const ing of parsedIngredients) {
            if (!ing || (!ing.quantity && ing.quantity !== 0) || !ing.name) {
                return res.status(400).json({ msg: 'Setiap Bahan wajib memiliki Jumlah dan Nama Bahan yang terisi.' });
            }
            ing.name = sanitizeInput(String(ing.name)).trim();
            ing.quantity = String(ing.quantity).trim();
            ing.unit = ing.unit ? sanitizeInput(String(ing.unit)).trim() : '';
        }

        parsedTools = (Array.isArray(parsedTools) ? parsedTools : []).map(t => sanitizeInput(String(t)).trim()).filter(t => t.length > 0);
        if (parsedTools.length === 0) {
            return res.status(400).json({ msg: 'Resep wajib memiliki minimal satu Alat yang digunakan.' });
        }

        parsedSteps = (Array.isArray(parsedSteps) ? parsedSteps : []).map(s => sanitizeInput(String(s)).trim()).filter(s => s.length > 0);
        if (parsedSteps.length === 0) {
            return res.status(400).json({ msg: 'Resep wajib memiliki minimal satu Langkah.' });
        }

        // --- Parse numeric fields reliably ---
        const parsedServingSize = parseInt(rawServing, 10);
        const parsedCookTime = parseInt(rawCook, 10);
        const parsedPrepTime = parseInt(rawPrep, 10);

        if (Number.isNaN(parsedServingSize) || Number.isNaN(parsedCookTime) || Number.isNaN(parsedPrepTime)) {
            return res.status(400).json({ msg: 'Format porsi/waktu masak/persiapan tidak valid (harus angka).' });
        }

        // --- Create and save recipe ---
        const newRecipe = new Recipe({
            title: cleanTitle,
            description: cleanDescription,
            category: cleanCategory,
            ingredients: parsedIngredients,
            steps: parsedSteps,
            tools: parsedTools,
            servingSize: parsedServingSize,
            cookTime: parsedCookTime,
            prepTime: parsedPrepTime,
            imageUrl: imageUrl,
            createdBy: userId // pemilik resep
        });

        await newRecipe.save();

        res.status(201).json({
            msg: 'Resep berhasil diunggah',
            id: newRecipe._id,
            recipe: newRecipe
        });

    } catch (error) {
        console.error('Error creating recipe:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join('. ') });
        }
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};

// File: sajile-backend/controllers/recipeController.js

// Pastikan Anda telah mendefinisikan:
// const Recipe = require('../models/Recipe');
// const User = require('../models/User'); // Jika digunakan untuk populate

exports.getAllRecipes = async (req, res) => {
    // Gunakan try...catch yang aman.
    try {
        // 1. Ambil dan validasi parameter query
        const limit = parseInt(req.query.limit) || 9;
        const offset = parseInt(req.query.offset) || 0;
        
        // Pastikan query hanya mengambil resep yang dipublikasikan (isPublished: true)
        const query = { isPublished: true }; 
        
        // 2. Hitung total (operasi Mongoose pertama, mungkin rentan error)
        const total = await Recipe.countDocuments(query);

        // 3. Ambil data resep dengan pagination
        const recipes = await Recipe.find(query)
            .populate('createdBy', 'username email profilePictureUrl') // Sesuaikan field yang di-populate sesuai kebutuhan
            .sort({ createdAt: -1 }) 
            .limit(limit)
            .skip(offset)
            .lean(); // 💡 Penting: Mengubah dokumen Mongoose menjadi objek JS biasa untuk pemrosesan yang lebih cepat dan aman

        // 4. Proses dan hitung rata-rata rating (Pastikan aman dari 'undefined')
        const recipesWithRating = recipes.map(recipe => {
            const ratingsArray = recipe.ratings || []; // Default ke array kosong jika null/undefined
            const totalRatings = ratingsArray.length;

            // Pastikan reduce berjalan pada nilai default 0 (keselamatan data)
            const sumRatings = ratingsArray.reduce((sum, r) => sum + (r.rating || 0), 0);
            
            recipe.avgRating = totalRatings > 0 ? parseFloat((sumRatings / totalRatings).toFixed(1)) : 0; 
            recipe.totalReviews = totalRatings;
            
            // Hapus ratings dari output agar payload respons lebih kecil
            delete recipe.ratings;
            return recipe;
        });

        // 5. Kirim respons JSON sukses
        res.json({
            recipes: recipesWithRating,
            total: total,
            limit: limit,
            offset: offset,
            hasMore: total > (offset + limit) 
        });

    } catch (error) {
        // 💡 Inilah blok krusial. Pastikan error dicatat dan responsnya JSON.
        console.error('❌ FATAL ERROR di getAllRecipes:', error.stack);
        // Respon error yang dijamin JSON.
        res.status(500).json({ 
            msg: 'Gagal memuat resep dari database. Cek log server untuk detail stack trace.', 
            error: error.message 
        });
    }
};

// ... (kode di bawahnya)

// @desc    Get single recipe by ID
// @route   GET /api/recipes/:id
// @access  Public
exports.getRecipeById = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id)
            .populate('createdBy', 'username email')
            .populate('ratings.userId', 'username');

        if (!recipe) {
            return res.status(404).json({ msg: 'Resep tidak ditemukan' });
        }

        recipe.views += 1;
        await recipe.save();

        const recipeObj = recipe.toObject();
        recipeObj.avgRating = recipe.avgRating || 0;

        res.json(recipeObj);

    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};

// @desc    Add rating to recipe
// @route   POST /api/recipes/:id/rate
// @access  Private
exports.rateRecipe = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const userId = req.user.id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ msg: 'Rating harus antara 1-5' });
        }

        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ msg: 'Resep tidak ditemukan' });
        }

        const existingRating = recipe.ratings.find(r => r.userId.toString() === userId);
        if (existingRating) {
            existingRating.rating = rating;
            existingRating.comment = comment || '';
            existingRating.createdAt = Date.now();
        } else {
            recipe.ratings.push({
                userId,
                rating,
                comment: comment || ''
            });
        }

        await recipe.save();

        res.json({
            msg: 'Rating berhasil disimpan',
            avgRating: recipe.avgRating,
            totalRatings: recipe.ratings.length
        });

    } catch (error) {
        console.error('Error rating recipe:', error);
        res.status(500).json({ msg: 'Terjadi kesalahan server', error: error.message });
    }
};

// @desc    Delete recipe
// @route   DELETE /api/recipes/:id
// @access  Private (only creator)
exports.deleteRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({ msg: 'Resep tidak ditemukan' });
        }

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

// @desc    Get recipes by user
// @route   GET /api/recipes/user/:userId
// @access  Public
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