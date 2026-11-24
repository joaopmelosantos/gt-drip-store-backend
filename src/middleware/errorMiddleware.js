const AppError = require('../utils/AppError');

/**
 * Middleware centralizado de tratamento de erros da API.
 */
function errorMiddleware(err, req, res, _next) {
  if (err instanceof AppError) {
    const body = { error: err.message };
    if (err.details !== undefined) {
      body.details = err.details;
    }
    return res.status(err.statusCode).json(body);
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }

  if (
    err.name === 'SequelizeValidationError' ||
    err.name === 'SequelizeUniqueConstraintError'
  ) {
    return res.status(400).json({
      error: 'Erro de validação nos dados enviados.',
      details: err.errors ? err.errors.map((item) => item.message) : undefined,
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Referência de chave estrangeira inválida.',
    });
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[ErrorMiddleware]', err);
  }

  return res.status(500).json({ error: 'Erro interno do servidor.' });
}

module.exports = errorMiddleware;
