const { addToken } = require('../middlewares/tokenBlacklist');
const userModel = require('../models/userModel');
const {
  isValidObjectId,
  sanitizeUser,
  bootstrapNewAdmin,
  createNewUser,
  activateFromInvitation,
  authenticateUser,
  regenerateInvitation,
  updateExistingUser,
  deleteExistingUser,
} = require('../service/userService');

const userController = {
  async bootstrapAdmin(req, res) {
    const { username, email, password } = req.body;

    try {
      const result = await bootstrapNewAdmin({ username, email, password });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      return res.status(201).json({
        message: 'Initial admin account created successfully',
        user: sanitizeUser(result.user),
      });
    } catch (error) {
      console.error('Erro ao criar admin inicial:', error);
      if (error && error.code === 11000) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createUser(req, res) {
    const { username, email, role, setupMode = 'invite', password } = req.body;

    try {
      const result = await createNewUser({
        username, email, role, setupMode, password, currentUserId: req.currentUser._id,
      });

      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(201).json({
        message:
          result.setupMode === 'invite'
            ? 'User created and activation link generated successfully'
            : 'User created successfully',
        user: sanitizeUser(result.user),
        invitationLink: result.invitationLink,
        setupMode: result.setupMode,
      });
    } catch (error) {
      console.error('Erro ao criar usuario por admin:', error);
      if (error && error.code === 11000) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async setupPasswordFromInvitation(req, res) {
    const { token, password, username } = req.body;

    try {
      const result = await activateFromInvitation({ token, password, username });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(200).json({
        message: 'Account activated successfully',
        accessToken: result.accessToken,
        user: sanitizeUser(result.user),
      });
    } catch (error) {
      console.error('Erro ao ativar conta por convite:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async loginUser(req, res) {
    const { email, password } = req.body;

    try {
      const result = await authenticateUser({ email, password });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(200).json({
        accessToken: result.accessToken,
        user: sanitizeUser(result.user),
      });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async logoutUser(req, res) {
    const token = req.authToken || req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ error: 'The token is required' });
    }

    addToken(token);
    return res.status(200).json({ message: 'Logout completed successfully' });
  },

  async getCurrentUser(req, res) {
    return res.status(200).json({ user: sanitizeUser(req.currentUser) });
  },

  async resendInvitation(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
      const result = await regenerateInvitation(id);
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(200).json({
        message: 'Activation link regenerated successfully',
        user: sanitizeUser(result.user),
        invitationLink: result.invitationLink,
      });
    } catch (error) {
      console.error('Erro ao reenviar convite:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getUserById(req, res) {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
      const foundUser = await userModel.findById(id);
      if (!foundUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ user: sanitizeUser(foundUser) });
    } catch (error) {
      console.error('Erro ao buscar usuario:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllUsers(req, res) {
    try {
      const users = await userModel.find().sort({ createdAt: -1 });
      return res.status(200).json({ users: users.map(sanitizeUser) });
    } catch (error) {
      console.error('Erro ao listar usuarios:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateUserById(req, res) {
    const { id } = req.params;
    const { username, email, password, role, status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
      const result = await updateExistingUser({ id, username, email, password, role, status, currentUser: req.currentUser });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(200).json({ user: sanitizeUser(result.user) });
    } catch (error) {
      console.error('Erro ao atualizar usuario:', error);
      if (error && error.code === 11000) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteUserById(req, res) {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
      const result = await deleteExistingUser(id, req.currentUser);
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Erro ao deletar usuario:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = userController;
