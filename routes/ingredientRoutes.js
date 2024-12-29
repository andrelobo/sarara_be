// routes/ingredients.js
const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
//const authenticateToken = require('../middlewares/authenticateToken');

// Rotas para ingredientes
router.post('/',  ingredientController.createIngredient);
router.get('/',  ingredientController.getAllIngredients);
router.get('/:id', ingredientController.getIngredientById);
router.put('/:id', ingredientController.updateIngredient);
router.delete('/:id',  ingredientController.deleteIngredient);

router.get('/graphs/change-history', ingredientController.getIngredientHistory);


module.exports = router;
