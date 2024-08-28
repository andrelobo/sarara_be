const express = require('express');
const router = express.Router();
const beverageController = require('../controllers/beverageController');
// const authenticateToken = require('../middlewares/authenticateToken');

// Middleware para verificar a presença do ID no request params
const checkIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  next();
};

// Rotas para bebidas
router.post('/', beverageController.createBeverage);
router.get('/', beverageController.getAllBeverages);
router.get('/:id', checkIdParam, beverageController.getBeverageById);
router.put('/:id', checkIdParam, beverageController.updateBeverage);
router.delete('/:id', checkIdParam, beverageController.deleteBeverage);
router.post('/:id/history', checkIdParam, beverageController.getBeverageHistory);

// Novas rotas para gráficos
router.get('/graphs/most-least-sold', beverageController.getMostLeastSoldBeverages);
router.get('/graphs/never-sold', beverageController.getNeverSoldBeverages);
router.get('/graphs/change-history', beverageController.getChangeHistory);


module.exports = router;
