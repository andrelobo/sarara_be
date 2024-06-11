const express = require('express');
const router = express.Router();
const beverageController = require('../controllers/beverageController');
const authenticateToken = require('../middlewares/authenticateToken');

// Rotas para bebidas
router.post('/', authenticateToken, beverageController.createBeverage);
router.get('/', authenticateToken, beverageController.getAllBeverages);
router.get('/:id', authenticateToken, beverageController.getBeverageById);
router.put('/:id', authenticateToken, beverageController.updateBeverage);
router.delete('/:id', authenticateToken, beverageController.deleteBeverage);
router.get('/beverages/:id/history', beverageController.getBeverageHistory);


module.exports = router;


