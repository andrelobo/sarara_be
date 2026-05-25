const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const {
  generateAccessToken,
  generateInvitationToken,
  hashInvitationToken,
  getInvitationExpiryDate,
} = require('../utils/authUtils');
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

const bootstrapNewAdmin = async ({ username, email, password }) => {
  if (!username || !email || !password) {
    return { error: 'Username, email and password are required', statusCode: 400 };
  }

  if (!isPasswordStrongEnough(password)) {
    return { error: 'Password must contain at least 6 characters', statusCode: 400 };
  }

  const adminCount = await countAdminUsers();
  if (adminCount > 0) {
    return { error: 'Bootstrap admin is no longer available', statusCode: 403 };
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
  return { user: savedAdmin };
};

const createNewUser = async ({ username, email, role, setupMode, password, currentUserId }) => {
  if (!username || !email || !role) {
    return { error: 'Username, email and role are required', statusCode: 400 };
  }

  if (!Object.values(USER_ROLES).includes(role)) {
    return { error: 'Invalid role informed', statusCode: 400 };
  }

  if (!['invite', 'password'].includes(setupMode)) {
    return { error: 'Setup mode must be invite or password', statusCode: 400 };
  }

  if (setupMode === 'password' && !isPasswordStrongEnough(password)) {
    return { error: 'Password mode requires a password with at least 6 characters', statusCode: 400 };
  }

  const { payload, invitationLink, setupMode: normalizedSetupMode } = await buildUserCreationPayload({
    username, email, role, setupMode, password, invitedBy: currentUserId,
  });

  const newUser = new userModel(payload);
  const savedUser = await newUser.save();

  return { user: savedUser, invitationLink, setupMode: normalizedSetupMode };
};

const activateFromInvitation = async ({ token, password, username }) => {
  if (!token || !password) {
    return { error: 'Activation token and password are required', statusCode: 400 };
  }

  if (!isPasswordStrongEnough(password)) {
    return { error: 'Password must contain at least 6 characters', statusCode: 400 };
  }

  const invitedUser = await userModel
    .findOne({ invitationTokenHash: hashInvitationToken(token) })
    .select('+invitationTokenHash +invitationExpiresAt');

  if (!invitedUser) {
    return { error: 'Activation link not found or already used', statusCode: 404 };
  }

  if (normalizeUserStatus(invitedUser.status) !== USER_STATUSES.PENDING) {
    return { error: 'This activation link is no longer pending activation', statusCode: 400 };
  }

  if (!invitedUser.invitationExpiresAt || invitedUser.invitationExpiresAt < new Date()) {
    return { error: 'Activation link expired', statusCode: 410 };
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
  return { user: invitedUser, accessToken };
};

const authenticateUser = async ({ email, password }) => {
  if (!email || !password) {
    return { error: 'Email and password are required', statusCode: 400 };
  }

  const user = await userModel.findOne({ email: normalizeEmail(email) }).select('+password');

  if (!user) {
    return { error: 'Invalid credentials', statusCode: 401 };
  }

  const normalizedStatus = normalizeUserStatus(user.status);
  if (normalizedStatus === USER_STATUSES.PENDING) {
    return { error: 'Your account is pending activation. Check your activation link.', statusCode: 403 };
  }

  if (normalizedStatus === USER_STATUSES.DISABLED) {
    return { error: 'Your account is disabled. Contact an administrator.', statusCode: 403 };
  }

  const isValidPassword = await user.isValidPassword(password);
  if (!isValidPassword) {
    return { error: 'Invalid credentials', statusCode: 401 };
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(String(user._id));
  return { user, accessToken };
};

const regenerateInvitation = async (userId) => {
  const user = await userModel.findById(userId).select('+invitationTokenHash +invitationExpiresAt');
  if (!user) {
    return { error: 'User not found', statusCode: 404 };
  }

  if (normalizeUserStatus(user.status) !== USER_STATUSES.PENDING) {
    return { error: 'Only pending users can receive a new activation link', statusCode: 400 };
  }

  const rawToken = generateInvitationToken();
  const invitationLink = buildInvitationLink(rawToken);

  user.invitationTokenHash = hashInvitationToken(rawToken);
  user.invitationExpiresAt = getInvitationExpiryDate();
  user.invitationSentAt = new Date();

  await user.save({ validateBeforeSave: false });

  return { user, invitationLink };
};

const updateExistingUser = async ({ id, username, email, password, role, status, currentUser }) => {
  const targetUser = await userModel.findById(id).select('+password');
  if (!targetUser) {
    return { error: 'User not found', statusCode: 404 };
  }

  if (String(currentUser._id) === id && (role !== undefined || status !== undefined)) {
    return { error: 'Administrators cannot change their own role or status here', statusCode: 400 };
  }

  const updatedData = {};

  if (username !== undefined) updatedData.username = username.trim();
  if (email !== undefined) updatedData.email = normalizeEmail(email);

  if (role !== undefined) {
    if (!Object.values(USER_ROLES).includes(role)) {
      return { error: 'Invalid role informed', statusCode: 400 };
    }
    updatedData.role = role;
  }

  if (status !== undefined) {
    if (status === USER_STATUSES.PENDING) {
      return { error: 'Pending status can only be created through invitation flow', statusCode: 400 };
    }
    if (!Object.values(USER_STATUSES).includes(status)) {
      return { error: 'Invalid status informed', statusCode: 400 };
    }
    updatedData.status = status;
  }

  if (password !== undefined) {
    if (!isPasswordStrongEnough(password)) {
      return { error: 'Password must contain at least 6 characters', statusCode: 400 };
    }
    updatedData.password = await bcrypt.hash(password, 12);
    updatedData.passwordSetAt = new Date();
    if (!updatedData.status) {
      updatedData.status = USER_STATUSES.ACTIVE;
    }
  }

  if (Object.keys(updatedData).length === 0) {
    return { error: 'No valid fields were sent for update', statusCode: 400 };
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
      return { error: 'At least one active admin must remain in the system', statusCode: 400 };
    }
  }

  Object.assign(targetUser, updatedData);
  await targetUser.save();

  return { user: targetUser };
};

const deleteExistingUser = async (id, currentUser) => {
  if (String(currentUser._id) === id) {
    return { error: 'You cannot delete your own account', statusCode: 400 };
  }

  const targetUser = await userModel.findById(id);
  if (!targetUser) {
    return { error: 'User not found', statusCode: 404 };
  }

  if (normalizeUserRole(targetUser.role) === USER_ROLES.ADMIN) {
    const activeAdminCount = await countActiveAdminUsers();
    if (normalizeUserStatus(targetUser.status) === USER_STATUSES.ACTIVE && activeAdminCount <= 1) {
      return { error: 'At least one admin account must remain in the system', statusCode: 400 };
    }
  }

  await targetUser.deleteOne();
  return { success: true };
};

module.exports = {
  isValidObjectId,
  sanitizeUser,
  bootstrapNewAdmin,
  createNewUser,
  activateFromInvitation,
  authenticateUser,
  regenerateInvitation,
  updateExistingUser,
  deleteExistingUser,
};
