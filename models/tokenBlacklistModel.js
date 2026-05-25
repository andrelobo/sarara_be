const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const tokenBlacklistSchema = new Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('TokenBlacklist', tokenBlacklistSchema);
