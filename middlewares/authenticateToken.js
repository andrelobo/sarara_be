// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('./tokenBlacklist');
const userModel = require('../models/userModel');
const {
  normalizeUserRole,
  normalizeUserStatus,
  getRolePermissions,
  USER_STATUSES,
} = require('../constants/userAccess');

async function authenticateToken(req, res, next) {
  const authorizationHeader = req.headers['authorization'];
  if (!authorizationHeader) {
    return res.status(401).json({ error: 'O token de autenticacao e obrigatorio' });
  }

  const [scheme, bearerToken] = authorizationHeader.split(' ');
  const token = bearerToken && scheme.toLowerCase() === 'bearer' ? bearerToken : authorizationHeader;

  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) {
    return res.status(401).json({ error: 'O token foi invalidado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalido' });
    }

    try {
      const currentUser = await userModel.findById(payload.userId);

      if (!currentUser) {
        return res.status(401).json({ error: 'Usuario autenticado nao encontrado' });
      }

      const normalizedStatus = normalizeUserStatus(currentUser.status);
      if (normalizedStatus !== USER_STATUSES.ACTIVE) {
        return res.status(403).json({ error: 'Sua conta nao esta ativa no momento' });
      }

      req.user = payload;
      req.authToken = token;
      req.currentUser = {
        ...currentUser.toObject(),
        role: normalizeUserRole(currentUser.role),
        status: normalizedStatus,
        permissions: getRolePermissions(currentUser.role),
      };

      next();
    } catch (loadUserError) {
      console.error('Erro ao carregar usuario autenticado:', loadUserError);
      return res.status(500).json({ error: 'Erro interno ao validar autenticacao' });
    }
  });
}

module.exports = authenticateToken;
