const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { generateAccessToken } = require('../utils/authUtils');
const EmailService = require('../service/emailService');
const bcrypt = require('bcrypt');
const { addToken, isTokenBlacklisted } = require('../middleware/tokenBlacklist');

const userController = {
  async createUser(req, res) {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new userModel({ username, email, password: hashedPassword });
        const savedUser = await newUser.save();

        // Tenta enviar o e-mail de boas-vindas sem senha
        try {
            await EmailService.sendWelcomeEmail(email, username);
            res.status(201).json({
                message: 'Usuário criado com sucesso, e-mail de boas-vindas enviado',
                user: savedUser
            });
        } catch (emailError) {
            console.error('Falha ao enviar o e-mail de boas-vindas:', emailError);
            res.status(201).json({
                message: 'Usuário criado com sucesso, mas o e-mail de boas-vindas falhou',
                user: savedUser
            });
        }
    } catch (error) {
        console.error('Erro ao criar o usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async loginUser(req, res) {
    const { email, password } = req.body;

    try {
      const user = await userModel.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const isValidPassword = await user.isValidPassword(password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const accessToken = generateAccessToken(user);

      res.status(200).json({ accessToken });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async logoutUser(req, res) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ error: 'O token é obrigatório' });
    }

    addToken(token);
    res.status(200).json({ message: 'Logout realizado com sucesso' });
  },

  async checkBlacklistedToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token && isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'O token está na lista negra' });
    }
    next();
  },

  async getUserById(req, res) {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'O ID do usuário é obrigatório' });
    }

    try {
      const foundUser = await userModel.findById(id);
      if (!foundUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      res.status(200).json({ user: foundUser });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getAllUsers(req, res) {
    try {
      const users = await userModel.find();
      res.status(200).json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async updateUserById(req, res) {
    const { id: userId } = req.params;
    const { username, email, password } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'O ID do usuário é obrigatório' });
    }

    try {
      const updatedData = { username, email };

      if (password) {
        updatedData.password = await bcrypt.hash(password, 12);
      }

      const updatedUser = await userModel.findByIdAndUpdate(userId, updatedData, { new: true });
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      res.status(200).json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async deleteUserById(req, res) {
    const { id: userId } = req.params;
    if (!userId) {
        return res.status(400).json({ error: 'O ID do usuário é obrigatório' });
    }

    try {
      const deletedUser = await userModel.findByIdAndDelete(userId);
      if (!deletedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      res.status(200).json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
};

module.exports = userController;
