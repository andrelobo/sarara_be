const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {
  USER_ROLES,
  USER_STATUSES,
  LEGACY_DEFAULT_ROLE,
  LEGACY_DEFAULT_STATUS,
} = require('../constants/userAccess');

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false, select: false },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: LEGACY_DEFAULT_ROLE,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUSES),
      default: LEGACY_DEFAULT_STATUS,
    },
    invitationTokenHash: { type: String, select: false, default: null },
    invitationExpiresAt: { type: Date, select: false, default: null },
    invitationSentAt: { type: Date, default: null },
    invitationAcceptedAt: { type: Date, default: null },
    passwordSetAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  },
);

// Método para verificar se a senha fornecida é válida
userSchema.methods.isValidPassword = async function(candidatePassword) {
  if (!this || !this.password || !candidatePassword) {
    return false;
  }
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Erro ao comparar as senhas:', error);
    throw error; // Rejeita a promessa se ocorrer um erro na comparação
  }
};

const User = model('User', userSchema);

module.exports = User;
