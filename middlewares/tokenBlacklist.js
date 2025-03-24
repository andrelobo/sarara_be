const tokenBlacklist = new Set();

// Adiciona um token à lista negra
function addToken(token) {
  tokenBlacklist.add(token);
}

// Verifica se um token está na lista negra
function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token);
}

module.exports = { addToken, isTokenBlacklisted };
