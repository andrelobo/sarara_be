const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');
const authorizeRoles = require('../middlewares/authorizeRoles');
const { USER_ROLES } = require('../constants/userAccess');

router.post('/bootstrap-admin', UserController.bootstrapAdmin);
router.post('/login', UserController.loginUser);
router.post('/setup-password', UserController.setupPasswordFromInvitation);

router.use(authenticateToken);

router.get('/me', UserController.getCurrentUser);
router.post('/logout', UserController.logoutUser);

router.use(authorizeRoles(USER_ROLES.ADMIN));

router.post('/', UserController.createUser);
router.get('/', UserController.getAllUsers);
router.post('/:id/resend-invite', UserController.resendInvitation);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUserById);
router.delete('/:id', UserController.deleteUserById);

module.exports = router;
