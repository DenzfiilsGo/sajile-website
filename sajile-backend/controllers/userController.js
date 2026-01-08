const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Comment = require('../models/Comment');

/**
 * @route   GET /api/users/:id
 * @desc    Ambil profil publik user dengan statistik kompetitif lengkap
 * @access  Public
 */
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;

        // 1. Ambil data User dasar (Sembunyikan data sensitif)
        const user = await User.findById(userId).select('-password -verificationToken -verificationTokenExpires');
        
        if (!user) {
            return res.status(404).json({ msg: 'Profil pengguna tidak ditemukan.' });
        }

        // 2. Cari semua resep milik user yang dipublikasikan
        const userRecipes = await Recipe.find({ createdBy: userId, isPublished: true });
        const recipeCount = userRecipes.length;
        const recipeIds = userRecipes.map(r => r._id);

        // 3. Agregasi Rating yang DITERIMA (Untuk menghitung "Apresiasi/Likes")
        // Kita hitung distribusi ulasan dari orang lain di resep milik user ini
        const commentsReceivedData = await Comment.aggregate([
            { $match: { recipe: { $in: recipeIds } } },
            { 
                $group: { 
                    _id: "$rating", 
                    count: { $sum: 1 } 
                } 
            }
        ]);

        // Inisialisasi object ulasan diterima
        const ratingsReceived = { "5": 0, "4.5": 0, "4": 0, "3.5": 0, "3": 0, "2.5": 0, "2": 0, "1.5": 0, "1": 0, "0.5": 0 };
        let totalCommentsReceived = 0;
        let totalLikesEquivalent = 0; // Rating >= 4 dianggap "Apresiasi" (Like) untuk sistem XP

        commentsReceivedData.forEach(item => {
            const ratingKey = item._id.toString();
            ratingsReceived[ratingKey] = item.count;
            totalCommentsReceived += item.count;
            
            // Logika XP: Bintang 4 ke atas dianggap Like/Poin Prestasi
            if (item._id >= 4) {
                totalLikesEquivalent += item.count;
            }
        });

        // 4. Agregasi Komentar yang DIBERIKAN (Keaktifan user berkomentar di resep orang lain)
        const commentsGivenData = await Comment.aggregate([
            { $match: { user: user._id } },
            { 
                $group: { 
                    _id: "$rating", 
                    count: { $sum: 1 } 
                } 
            }
        ]);

        const ratingsGiven = { "5": 0, "4.5": 0, "4": 0, "3.5": 0, "3": 0, "2.5": 0, "2": 0, "1.5": 0, "1": 0, "0.5": 0 };
        let totalCommentsGiven = 0;
        
        commentsGivenData.forEach(item => {
            const ratingKey = item._id.toString();
            ratingsGiven[ratingKey] = item.count;
            totalCommentsGiven += item.count;
        });

        // 5. Hitung Rata-rata Rating Seluruh Resep (Overall Quality)
        const avgRecipeRating = recipeCount > 0 
            ? (userRecipes.reduce((acc, curr) => acc + (curr.avgRating || 0), 0) / recipeCount).toFixed(1) 
            : 0;

        // 6. Susun response profil final
        const userProfile = user.toObject();
        
        // Statistik untuk Frontend (Pangkat & Progress Bar)
        userProfile.recipeCount = recipeCount;
        userProfile.totalLikes = totalLikesEquivalent; 
        userProfile.commentsGiven = totalCommentsGiven;
        
        // Detail tambahan untuk UI Tab Statistik
        userProfile.commentsReceived = totalCommentsReceived;
        userProfile.ratingsReceived = ratingsReceived;
        userProfile.ratingsGiven = ratingsGiven;
        userProfile.avgRecipeRating = parseFloat(avgRecipeRating);

        res.json(userProfile);

    } catch (err) {
        console.error('Error di getUserProfile:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'ID pengguna tidak valid' });
        }
        res.status(500).send('Server Error');
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const { timeframe } = req.query; // 'daily', 'monthly', 'yearly', 'all-time'
        let dateFilter = {};

        const now = new Date();
        if (timeframe === 'daily') {
            dateFilter = { createdAt: { $gte: new Date(now.setHours(0,0,0,0)) } };
        } else if (timeframe === 'monthly') {
            dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
        } else if (timeframe === 'yearly') {
            dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1) } };
        }
        // Jika all-time, dateFilter tetap kosong {}

        const leaderboard = await User.aggregate([
            // 1. Ambil Data Resep User
            {
                $lookup: {
                    from: "recipes",
                    localField: "_id",
                    foreignField: "createdBy",
                    pipeline: [
                        { $match: { isPublished: true, ...dateFilter } }
                    ],
                    as: "user_recipes"
                }
            },
            // 2. Ambil Komentar yang DIBERIKAN user (Keaktifan)
            {
                $lookup: {
                    from: "comments",
                    localField: "_id",
                    foreignField: "user",
                    pipeline: [
                        { $match: dateFilter }
                    ],
                    as: "comments_given"
                }
            },
            // 3. Ambil Komentar/Rating yang DITERIMA (Apresiasi/Likes)
            {
                $lookup: {
                    from: "comments",
                    localField: "user_recipes._id",
                    foreignField: "recipe",
                    pipeline: [
                        { $match: { rating: { $gte: 4 }, ...dateFilter } }
                    ],
                    as: "likes_received"
                }
            },
            // 4. Hitung Skor Berdasarkan Rumus
            {
                $project: {
                    username: 1,
                    profilePictureUrl: 1,
                    recipeCount: { $size: "$user_recipes" },
                    likeCount: { $size: "$likes_received" },
                    commentCount: { $size: "$comments_given" },
                    score: {
                        $add: [
                            { $multiply: [{ $size: "$user_recipes" }, 25] }, // Resep x 25
                            { $multiply: [{ $size: "$likes_received" }, 10] }, // Likes x 10
                            { $multiply: [{ $size: "$comments_given" }, 2] }   // Komen x 2
                        ]
                    }
                }
            },
            // 5. Urutkan dari skor tertinggi
            { $sort: { score: -1 } },
            // 6. Ambil Top 10 (atau sesuaikan kebutuhan)
            { $limit: 10 }
        ]);

        res.json(leaderboard);
    } catch (err) {
        console.error('Leaderboard Error:', err.message);
        res.status(500).send('Server Error');
    }
};

// Fungsi Lengkap updateSubscription di userController.js
exports.updateSubscription = async (req, res) => {
    try {
        const { packageType, quantity } = req.body;
        const user = await User.findById(req.user.id);

        const packageData = {
            'starter_taster': { days: 7, credits: 10 },
            'starter_pro':    { days: 7, credits: 15 },
            'premium_home':   { days: 30, credits: 25 },
            'premium_elite':  { days: 30, credits: 50 },
            'legend_year':    { days: 365, credits: 120 },
            'legend_eternal': { days: 1825, credits: 300 } // 5 Tahun
        };

        const selected = packageData[packageType];
        if (!selected) return res.status(400).json({ msg: "Paket tidak valid" });

        const totalDays = selected.days * (quantity || 1);
        
        let startDate = (user.premiumUntil && user.premiumUntil > new Date()) 
                        ? new Date(user.premiumUntil) 
                        : new Date();

        user.membership = packageType;
        user.aiCredits = selected.credits; // Reset/tambah kredit AI sesuai paket
        user.premiumUntil = new Date(startDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));

        await user.save();
        res.json({ msg: "Langganan berhasil diperbarui", user });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.deductAiCredit = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const now = new Date();
        const lastReset = user.lastAiReset ? new Date(user.lastAiReset) : new Date(0);

        // --- FAIL-SAFE LOGIC (Jaga-jaga jika Cron Job belum jalan/gagal) ---
        if (now.toDateString() !== lastReset.toDateString()) {
            const packageLimits = {
                'free': 5,
                'starter_taster': 10,
                'starter_pro': 15,
                'premium_home': 25,
                'premium_elite': 50,
                'legend_year': 120,
                'legend_eternal': 300
            };
            user.aiCredits = packageLimits[user.membership] || 5;
            user.lastAiReset = now;
            await user.save();
        }
        // ------------------------------------------------------------------

        if (user.aiCredits <= 0) {
            return res.status(403).json({ 
                msg: "Kredit harian habis! Kembali lagi besok.",
                aiCredits: 0 
            });
        }

        user.aiCredits -= 1;
        await user.save();

        res.json({ msg: "Kredit dipotong", aiCredits: user.aiCredits });
    } catch (err) {
        res.status(500).json({ msg: "Server Error" });
    }
};