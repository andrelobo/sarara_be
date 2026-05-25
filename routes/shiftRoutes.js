const express = require('express');
const shiftController = require('../controllers/shiftController');
const authenticateToken = require('../middlewares/authenticateToken');
const authorizeRoles = require('../middlewares/authorizeRoles');
const { USER_ROLES } = require('../constants/userAccess');

const router = express.Router();

const canReadShifts = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.WAITER);
const canOperateShifts = authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.WAITER);

router.use(authenticateToken);

router.post('/', canOperateShifts, shiftController.createShift);
router.get('/', canReadShifts, shiftController.getAllShifts);
router.get('/:id', canReadShifts, shiftController.getShiftById);
router.post('/:id/close', canOperateShifts, shiftController.closeShift);

module.exports = router;
