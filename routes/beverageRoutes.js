const express = require('express');
const router = express.Router();
const beverageController = require('../controllers/beverageController');
const authenticateToken = require('../middlewares/authenticateToken');
const authorizeRoles = require('../middlewares/authorizeRoles');
const { USER_ROLES } = require('../constants/userAccess');

// Middleware para verificar a presença do ID no request params
const checkIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  next();
};

const canReadInventory = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.WAITER);
const canWriteInventory = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER);

router.use(authenticateToken);

// Rotas para bebidas
router.post('/', canWriteInventory, beverageController.createBeverage);
router.get('/', canReadInventory, beverageController.getAllBeverages);
router.get('/:id', canReadInventory, checkIdParam, beverageController.getBeverageById);
router.put('/:id', canWriteInventory, checkIdParam, beverageController.updateBeverage);
router.delete('/:id', canWriteInventory, checkIdParam, beverageController.deleteBeverage);
router.get('/:id/history', canReadInventory, checkIdParam, beverageController.getBeverageHistory);
router.post('/:id/history', canReadInventory, checkIdParam, beverageController.getBeverageHistory);

// Novas rotas para gráficos
router.get('/graphs/most-least-sold', canReadInventory, beverageController.getMostLeastSoldBeverages);
router.get('/graphs/never-sold', canReadInventory, beverageController.getNeverSoldBeverages);
router.get('/graphs/change-history', canReadInventory, beverageController.getChangeHistory);


module.exports = router;
