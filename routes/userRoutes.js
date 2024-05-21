const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');

// Rota para criar um novo usuário
router.post('/', UserController.createUser);

// Rota para autenticar um usuário
router.post('/login', UserController.loginUser);

// Rota para obter detalhes de um usuário pelo ID
router.get('/:id',authenticateToken, UserController.getUserById);

// Rota para atualizar os detalhes de um usuário pelo ID
router.put('/:id', authenticateToken, UserController.updateUserById);

// Rota para excluir um usuário pelo ID
router.delete('/:id', authenticateToken , UserController.deleteUserById);

// Rota para listar todos os usuários
router.get('/', authenticateToken , UserController.getAllUsers);

module.exports = router;
