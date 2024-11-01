const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
//const authenticateToken = require('../middlewares/authenticateToken');

// Rota para criar um novo usuário
router.post('/', UserController.createUser);

// Rota para autenticar um usuário
router.post('/login', UserController.loginUser);

// Rota para obter detalhes de um usuário pelo ID
router.get('/:id',  UserController.getUserById);

// Rota para atualizar os detalhes de um usuário pelo ID
router.put('/:id',  UserController.updateUserById);

// Rota para excluir um usuário pelo ID
router.delete('/:id', UserController.deleteUserById);

// Rota para listar todos os usuários
router.get('/',  UserController.getAllUsers);

module.exports = router;
