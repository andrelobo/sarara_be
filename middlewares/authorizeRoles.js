function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Usuario autenticado nao encontrado' });
    }

    if (!allowedRoles.includes(req.currentUser.role)) {
      return res.status(403).json({ error: 'Voce nao tem permissao para executar esta acao' });
    }

    next();
  };
}

module.exports = authorizeRoles;
