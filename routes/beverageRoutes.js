const express = require('express');
const router = express.Router();
const beverageController = require('../controllers/beverageController');
const authenticateToken = require('../middlewares/authenticateToken');

// Middleware para verificar a presença do ID no request params
const checkIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  next();
};

// Rotas para bebidas
router.post('/',authenticateToken, beverageController.createBeverage);
router.get('/',authenticateToken,  beverageController.getAllBeverages);
router.get('/:id', checkIdParam, authenticateToken,  beverageController.getBeverageById);
router.put('/:id', checkIdParam, authenticateToken,  beverageController.updateBeverage);
router.delete('/:id', checkIdParam, authenticateToken, beverageController.deleteBeverage);
router.post('/:id/history', checkIdParam, authenticateToken, beverageController.getBeverageHistory);

// Novas rotas para gráficos
router.get('/graphs/most-least-sold',authenticateToken, beverageController.getMostLeastSoldBeverages);
router.get('/graphs/never-sold',authenticateToken,  beverageController.getNeverSoldBeverages);
router.get('/graphs/change-history',authenticateToken,  beverageController.getChangeHistory);


module.exports = router;
