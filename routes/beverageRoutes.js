const express = require('express');
const router = express.Router();
const beverageController = require('../controllers/beverageController');
// const authenticateToken = require('../middlewares/authenticateToken');

// Rotas para bebidas
router.post('/', beverageController.createBeverage);
router.get('/', beverageController.getAllBeverages);
router.get('/:id',(req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  beverageController.getBeverageById(req, res, next);
});
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  beverageController.updateBeverage(req, res, next);
});
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  beverageController.deleteBeverage(req, res, next);
});
router.post('/:id/history', beverageController.getBeverageHistory);

module.exports = router;


