const jwt = require('jsonwebtoken');
const authMiddleware = require('../src/middleware/authMiddleware');
const AppError = require('../src/utils/AppError');

describe('authMiddleware', () => {
  it('deve chamar next com AppError 401 quando cabeçalho Authorization estiver ausente', () => {
    const req = { headers: {} };
    const next = jest.fn();

    authMiddleware(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('deve chamar next com AppError 401 quando o formato não for Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const next = jest.fn();

    authMiddleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('deve chamar next com AppError 401 para token inválido', () => {
    const req = { headers: { authorization: 'Bearer token.invalido.aqui' } };
    const next = jest.fn();

    authMiddleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('deve autenticar e preencher req.user quando o JWT for válido', () => {
    const token = jwt.sign({ id: 1, email: 'user@mail.com' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();

    authMiddleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: 1, email: 'user@mail.com' });
  });
});
