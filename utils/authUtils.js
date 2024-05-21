const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

// Chave secreta para assinar os tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'suaChaveSecretaAqui';

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

module.exports = { generateAccessToken, verifyToken };
