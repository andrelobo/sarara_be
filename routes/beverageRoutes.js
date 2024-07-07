const express = require('express');
const router = express.Router();
const beverageController = require('../controllers/beverageController');
const authenticateToken = require('../middlewares/authenticateToken');

// Rotas para bebidas
router.post('/', authenticateToken, beverageController.createBeverage);
router.get('/', authenticateToken, beverageController.getAllBeverages);
router.get('/:id', authenticateToken, (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  beverageController.getBeverageById(req, res, next);
});
router.put('/:id', authenticateToken, (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  beverageController.updateBeverage(req, res, next);
});
router.delete('/:id', authenticateToken, (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  beverageController.deleteBeverage(req, res, next);
});
router.get('/:id/history', beverageController.getBeverageHistory);

module.exports = router;


