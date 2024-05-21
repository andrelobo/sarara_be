// routes/ingredients.js
const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
const authenticateToken = require('../middlewares/authenticateToken');

// Rotas para ingredientes
router.post('/', authenticateToken, ingredientController.createIngredient);
router.get('/', authenticateToken, ingredientController.getAllIngredients);
router.get('/:id', authenticateToken, ingredientController.getIngredientById);
router.put('/:id', authenticateToken, ingredientController.updateIngredient);
router.delete('/:id', authenticateToken, ingredientController.deleteIngredient);

module.exports = router;
