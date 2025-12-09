// File: sajile-backend/routes/recipes.js

const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Public routes
router.get('/', recipeController.getAllRecipes);
router.get('/:id', recipeController.getRecipeById);
router.get('/user/:userId', recipeController.getRecipesByUser);

// Private routes
// POST create recipe (with optional image)
router.post('/', auth, upload.single('image'), recipeController.createRecipe);
router.post('/:id/rate', auth, recipeController.rateRecipe);
router.delete('/:id', auth, recipeController.deleteRecipe);

module.exports = router;