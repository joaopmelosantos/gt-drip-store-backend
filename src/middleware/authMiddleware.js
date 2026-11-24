const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * Middleware de autenticação que exige cabeçalho Authorization: Bearer <jwt>.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return next(new AppError(401, 'Token de autorização não fornecido.'));
  }

  const [scheme, token] = authHeader.split(' ');

  if (!/^Bearer$/i.test(scheme) || !token) {
    return next(new AppError(401, 'Formato do token de autorização inválido.'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new AppError(500, 'JWT_SECRET não configurado no servidor.'));
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch {
    return next(new AppError(401, 'Token de autorização inválido ou expirado.'));
  }
}

module.exports = authMiddleware;
