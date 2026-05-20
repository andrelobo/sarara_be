const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const {
  generateAccessToken,
  generateInvitationToken,
  hashInvitationToken,
  getInvitationExpiryDate,
} = require('../utils/authUtils');
const { addToken } = require('../middlewares/tokenBlacklist');
const {
  USER_ROLES,
  USER_STATUSES,
  normalizeUserRole,
  normalizeUserStatus,
  getRolePermissions,
} = require('../constants/userAccess');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://barchef-sarara.vercel.app';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const isPasswordStrongEnough = (password) => typeof password === 'string' && password.length >= 6;

const buildInvitationLink = (rawToken) =>
  `${FRONTEND_URL.replace(/\/$/, '')}/setup-account?token=${encodeURIComponent(rawToken)}`;

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const normalizedUser = typeof user.toObject === 'function' ? user.toObject() : { ...user };

  delete normalizedUser.password;
  delete normalizedUser.invitationTokenHash;
  delete normalizedUser.invitationExpiresAt;

  normalizedUser.role = normalizeUserRole(normalizedUser.role);
  normalizedUser.status = normalizeUserStatus(normalizedUser.status);
  normalizedUser.permissions = getRolePermissions(normalizedUser.role);

  return normalizedUser;
};

const countAdminUsers = () => userModel.countDocuments({ role: USER_ROLES.ADMIN });
const countActiveAdminUsers = () =>
  userModel.countDocuments({ role: USER_ROLES.ADMIN, status: USER_STATUSES.ACTIVE });

const buildUserCreationPayload = async ({ username, email, role, setupMode, password, invitedBy }) => {
  const normalizedRole = normalizeUserRole(role);
  const normalizedSetupMode = setupMode === 'password' ? 'password' : 'invite';

  const payload = {
    username: username.trim(),
    email: normalizeEmail(email),
    role: normalizedRole,
    invitedBy: invitedBy || null,
  };

  if (normalizedSetupMode === 'password') {
    payload.password = await bcrypt.hash(password, 12);
    payload.status = USER_STATUSES.ACTIVE;
    payload.passwordSetAt = new Date();
    return { payload, invitationLink: null, setupMode: normalizedSetupMode };
  }

  const rawToken = generateInvitationToken();
  payload.status = USER_STATUSES.PENDING;
  payload.invitationTokenHash = hashInvitationToken(rawToken);
  payload.invitationExpiresAt = getInvitationExpiryDate();
  payload.invitationSentAt = new Date();

  return {
    payload,
    invitationLink: buildInvitationLink(rawToken),
    setupMode: normalizedSetupMode,
  };
};

const userController = {
  async bootstrapAdmin(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (!isPasswordStrongEnough(password)) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters' });
    }

    try {
      const adminCount = await countAdminUsers();
      if (adminCount > 0) {
        return res.status(403).json({ error: 'Bootstrap admin is no longer available' });
      }

      const newAdmin = new userModel({
        username: username.trim(),
        email: normalizeEmail(email),
        password: await bcrypt.hash(password, 12),
        role: USER_ROLES.ADMIN,
        status: USER_STATUSES.ACTIVE,
        passwordSetAt: new Date(),
      });

      const savedAdmin = await newAdmin.save();

      return res.status(201).json({
        message: 'Initial admin account created successfully',
        user: sanitizeUser(savedAdmin),
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

    if (!username || !email || !role) {
      return res.status(400).json({ error: 'Username, email and role are required' });
    }

    if (!Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role informed' });
    }

    if (!['invite', 'password'].includes(setupMode)) {
      return res.status(400).json({ error: 'Setup mode must be invite or password' });
    }

    if (setupMode === 'password' && !isPasswordStrongEnough(password)) {
      return res.status(400).json({ error: 'Password mode requires a password with at least 6 characters' });
    }

    try {
      const { payload, invitationLink, setupMode: normalizedSetupMode } = await buildUserCreationPayload({
        username,
        email,
        role,
        setupMode,
        password,
        invitedBy: req.currentUser._id,
      });

      const newUser = new userModel(payload);
      const savedUser = await newUser.save();

      return res.status(201).json({
        message:
          normalizedSetupMode === 'invite'
            ? 'User created and activation link generated successfully'
            : 'User created successfully',
        user: sanitizeUser(savedUser),
        invitationLink,
        setupMode: normalizedSetupMode,
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

    if (!token || !password) {
      return res.status(400).json({ error: 'Activation token and password are required' });
    }

    if (!isPasswordStrongEnough(password)) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters' });
    }

    try {
      const invitedUser = await userModel
        .findOne({ invitationTokenHash: hashInvitationToken(token) })
        .select('+invitationTokenHash +invitationExpiresAt');

      if (!invitedUser) {
        return res.status(404).json({ error: 'Activation link not found or already used' });
      }

      if (normalizeUserStatus(invitedUser.status) !== USER_STATUSES.PENDING) {
        return res.status(400).json({ error: 'This activation link is no longer pending activation' });
      }

      if (!invitedUser.invitationExpiresAt || invitedUser.invitationExpiresAt < new Date()) {
        return res.status(410).json({ error: 'Activation link expired' });
      }

      invitedUser.password = await bcrypt.hash(password, 12);
      invitedUser.status = USER_STATUSES.ACTIVE;
      invitedUser.passwordSetAt = new Date();
      invitedUser.invitationAcceptedAt = new Date();
      invitedUser.invitationTokenHash = null;
      invitedUser.invitationExpiresAt = null;

      if (typeof username === 'string' && username.trim()) {
        invitedUser.username = username.trim();
      }

      await invitedUser.save();

      const accessToken = generateAccessToken(String(invitedUser._id));

      return res.status(200).json({
        message: 'Account activated successfully',
        accessToken,
        user: sanitizeUser(invitedUser),
      });
    } catch (error) {
      console.error('Erro ao ativar conta por convite:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async loginUser(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const user = await userModel.findOne({ email: normalizeEmail(email) }).select('+password');

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const normalizedStatus = normalizeUserStatus(user.status);
      if (normalizedStatus === USER_STATUSES.PENDING) {
        return res.status(403).json({ error: 'Your account is pending activation. Check your activation link.' });
      }

      if (normalizedStatus === USER_STATUSES.DISABLED) {
        return res.status(403).json({ error: 'Your account is disabled. Contact an administrator.' });
      }

      const isValidPassword = await user.isValidPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });

      const accessToken = generateAccessToken(String(user._id));

      return res.status(200).json({
        accessToken,
        user: sanitizeUser(user),
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
      const user = await userModel.findById(id).select('+invitationTokenHash +invitationExpiresAt');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (normalizeUserStatus(user.status) !== USER_STATUSES.PENDING) {
        return res.status(400).json({ error: 'Only pending users can receive a new activation link' });
      }

      const rawToken = generateInvitationToken();
      const invitationLink = buildInvitationLink(rawToken);

      user.invitationTokenHash = hashInvitationToken(rawToken);
      user.invitationExpiresAt = getInvitationExpiryDate();
      user.invitationSentAt = new Date();

      await user.save({ validateBeforeSave: false });

      return res.status(200).json({
        message: 'Activation link regenerated successfully',
        user: sanitizeUser(user),
        invitationLink,
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

    if (String(req.currentUser._id) === id && (role !== undefined || status !== undefined)) {
      return res.status(400).json({ error: 'Administrators cannot change their own role or status here' });
    }

    try {
      const targetUser = await userModel.findById(id).select('+password');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedData = {};

      if (username !== undefined) {
        updatedData.username = username.trim();
      }

      if (email !== undefined) {
        updatedData.email = normalizeEmail(email);
      }

      if (role !== undefined) {
        if (!Object.values(USER_ROLES).includes(role)) {
          return res.status(400).json({ error: 'Invalid role informed' });
        }
        updatedData.role = role;
      }

      if (status !== undefined) {
        if (status === USER_STATUSES.PENDING) {
          return res.status(400).json({ error: 'Pending status can only be created through invitation flow' });
        }

        if (!Object.values(USER_STATUSES).includes(status)) {
          return res.status(400).json({ error: 'Invalid status informed' });
        }

        updatedData.status = status;
      }

      if (password !== undefined) {
        if (!isPasswordStrongEnough(password)) {
          return res.status(400).json({ error: 'Password must contain at least 6 characters' });
        }

        updatedData.password = await bcrypt.hash(password, 12);
        updatedData.passwordSetAt = new Date();
        if (!updatedData.status) {
          updatedData.status = USER_STATUSES.ACTIVE;
        }
      }

      if (Object.keys(updatedData).length === 0) {
        return res.status(400).json({ error: 'No valid fields were sent for update' });
      }

      const targetCurrentRole = normalizeUserRole(targetUser.role);
      const targetFutureRole = normalizeUserRole(updatedData.role || targetUser.role);
      const targetFutureStatus = normalizeUserStatus(updatedData.status || targetUser.status);

      if (
        targetCurrentRole === USER_ROLES.ADMIN &&
        (targetFutureRole !== USER_ROLES.ADMIN || targetFutureStatus !== USER_STATUSES.ACTIVE)
      ) {
        const adminCount = await countActiveAdminUsers();
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'At least one active admin must remain in the system' });
        }
      }

      Object.assign(targetUser, updatedData);
      await targetUser.save();

      return res.status(200).json({ user: sanitizeUser(targetUser) });
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

    if (String(req.currentUser._id) === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    try {
      const targetUser = await userModel.findById(id);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (normalizeUserRole(targetUser.role) === USER_ROLES.ADMIN) {
        const activeAdminCount = await countActiveAdminUsers();
        if (normalizeUserStatus(targetUser.status) === USER_STATUSES.ACTIVE && activeAdminCount <= 1) {
          return res.status(400).json({ error: 'At least one admin account must remain in the system' });
        }
      }

      await targetUser.deleteOne();
      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Erro ao deletar usuario:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = userController;
