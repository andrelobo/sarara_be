const express = require('express');
const commandController = require('../controllers/commandController');
const authenticateToken = require('../middlewares/authenticateToken');
const authorizeRoles = require('../middlewares/authorizeRoles');
const { USER_ROLES } = require('../constants/userAccess');

const router = express.Router();

const canReadCommands = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.WAITER);
const canOperateCommands = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.WAITER);

router.use(authenticateToken);

router.post('/', canOperateCommands, commandController.createCommand);
router.get('/', canReadCommands, commandController.getAllCommands);
router.get('/:id', canReadCommands, commandController.getCommandById);
router.post('/:id/items', canOperateCommands, commandController.addCommandItem);
router.patch('/:id/items/:itemId', canOperateCommands, commandController.updateCommandItem);
router.post('/:id/close', canOperateCommands, commandController.closeCommand);
router.post('/:id/cancel', canOperateCommands, commandController.cancelCommand);

module.exports = router;
