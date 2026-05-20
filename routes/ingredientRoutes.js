const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
const authenticateToken = require('../middlewares/authenticateToken');
const authorizeRoles = require('../middlewares/authorizeRoles');
const { USER_ROLES } = require('../constants/userAccess');

const canReadInventory = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.WAITER);
const canWriteInventory = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER);

router.use(authenticateToken);

// Rotas para ingredientes
router.post('/', canWriteInventory, ingredientController.createIngredient);
router.get('/', canReadInventory, ingredientController.getAllIngredients);
router.get('/:id', canReadInventory, ingredientController.getIngredientById);
router.put('/:id', canWriteInventory, ingredientController.updateIngredient);
router.delete('/:id', canWriteInventory, ingredientController.deleteIngredient);

// Rota para histórico de alterações
router.get('/graphs/change-history', canReadInventory, ingredientController.getIngredientHistory);

module.exports = router;
