const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const recipeController = require('../controllers/recipeController');
const auth = require('../middleware/auth');
const premiumCheck = require('../middleware/premiumCheck');

// 1. Rute Leaderboard (Public)
router.get('/leaderboard/top', userController.getLeaderboard);

// 2. Rute Langganan & Kredit AI (Private - Butuh Login)
router.post('/subscribe', auth, userController.updateSubscription);

// TAMBAHKAN BARIS INI DI SINI
router.post('/deduct-credit', auth, userController.deductAiCredit);

// 3. Rute Resep Premium (Private - Butuh Login + Membership)
router.get('/premium-recipe/:id', [auth, premiumCheck], recipeController.getRecipeById);

// 4. Rute Profil (Public - Letakkan di paling bawah karena menggunakan parameter :id)
router.get('/:id', userController.getUserProfile);

module.exports = router;