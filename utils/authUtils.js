const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

// Chave secreta para assinar os tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'suaChaveSecretaAqui';
const INVITATION_TTL_HOURS = Number(process.env.INVITATION_TTL_HOURS || 72);

// Função para gerar um token de acesso com base no ID do usuário
function generateAccessToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

// Função para verificar e decodificar um token JWT
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    // Se o token não for válido, retornamos null
    return null;
  }
}

function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashInvitationToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getInvitationExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_TTL_HOURS);
  return expiresAt;
}

module.exports = {
  generateAccessToken,
  verifyToken,
  generateInvitationToken,
  hashInvitationToken,
  getInvitationExpiryDate,
};
