const express = require('express');
const tableController = require('../controllers/tableController');
const authenticateToken = require('../middlewares/authenticateToken');
const authorizeRoles = require('../middlewares/authorizeRoles');
const { USER_ROLES } = require('../constants/userAccess');

const router = express.Router();

const canReadSalon = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.WAITER);
const canManageTableCatalog = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER);
const canOperateTables = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.WAITER);

router.use(authenticateToken);

router.post('/', canManageTableCatalog, tableController.createTable);
router.get('/', canReadSalon, tableController.getAllTables);
router.get('/:id', canReadSalon, tableController.getTableById);
router.put('/:id', canManageTableCatalog, tableController.updateTable);
router.delete('/:id', canManageTableCatalog, tableController.deleteTable);
router.post('/:id/open', canOperateTables, tableController.openTable);
router.post('/:id/close', canOperateTables, tableController.closeTable);

module.exports = router;
