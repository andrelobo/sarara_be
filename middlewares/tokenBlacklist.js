const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklistModel');

const fallbackBlacklist = new Set();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function addToken(token) {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await TokenBlacklist.create({
      tokenHash: hashToken(token),
      expiresAt,
    });
  } catch (err) {
    console.warn('TokenBlacklist: MongoDB unavailable, using in-memory fallback');
    fallbackBlacklist.add(token);
  }
}

async function isTokenBlacklisted(token) {
  try {
    const entry = await TokenBlacklist.findOne({ tokenHash: hashToken(token) });
    return !!entry;
  } catch (err) {
    console.warn('TokenBlacklist: MongoDB unavailable, checking in-memory fallback');
    return fallbackBlacklist.has(token);
  }
}

module.exports = { addToken, isTokenBlacklisted };
