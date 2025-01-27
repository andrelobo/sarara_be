const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
// const authenticateToken = require('../middlewares/authenticateToken'); // Descomente se necessário

// Rotas para ingredientes
router.post('/', ingredientController.createIngredient); // Adicionar autenticação se necessário
router.get('/', ingredientController.getAllIngredients);
router.get('/:id', ingredientController.getIngredientById);
router.put('/:id', ingredientController.updateIngredient);
router.delete('/:id', ingredientController.deleteIngredient);

// Rota para histórico de alterações
router.get('/graphs/change-history', ingredientController.getIngredientHistory);

module.exports = router;