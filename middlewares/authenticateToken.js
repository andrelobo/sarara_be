// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('./tokenBlacklist');

function authenticateToken(req, res, next) {
  const authorizationHeader = req.headers['authorization'];
  if (!authorizationHeader) {
    return res.status(401).json({ error: 'O token de autenticacao e obrigatorio' });
  }

  const [scheme, bearerToken] = authorizationHeader.split(' ');
  const token = bearerToken && scheme.toLowerCase() === 'bearer' ? bearerToken : authorizationHeader;

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ error: 'O token foi invalidado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalido' });
    }

    req.user = payload;
    req.authToken = token;
    next();
  });
}

module.exports = authenticateToken;
