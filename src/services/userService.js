const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const AppError = require('../utils/AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
  return {
    id: user.id,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email,
  };
}

function validateEmail(email) {
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new AppError(400, 'Informe um endereço de e-mail válido.');
  }
  return email.trim().toLowerCase();
}

function validateRequiredText(value, fieldName) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, `O campo "${fieldName}" é obrigatório.`);
  }
  return value.trim();
}

/**
 * Busca um usuário pelo ID sem expor a senha.
 * @param {number} id ID do usuário
 */
async function getUserById(id) {
  const user = await User.findByPk(id, {
    attributes: ['id', 'firstname', 'surname', 'email'],
  });

  if (!user) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  return sanitizeUser(user);
}

/**
 * Cadastra um novo usuário com senha criptografada em bcrypt.
 * @param {{ firstname: string, surname: string, email: string, password: string, confirmPassword: string }} data
 */
async function createUser(data = {}) {
  const firstname = validateRequiredText(data.firstname, 'firstname');
  const surname = validateRequiredText(data.surname, 'surname');
  const email = validateEmail(data.email);

  if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
    throw new AppError(400, 'A senha deve possuir ao menos 6 caracteres.');
  }

  if (data.password !== data.confirmPassword) {
    throw new AppError(400, 'A confirmação de senha não confere.');
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError(400, 'Já existe um usuário cadastrado com este e-mail.');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const created = await User.create({
    firstname,
    surname,
    email,
    password: hashedPassword,
  });

  return sanitizeUser(created);
}

/**
 * Atualiza os dados cadastrais de um usuário existente.
 * @param {number} id ID do usuário
 * @param {{ firstname: string, surname: string, email: string }} data
 */
async function updateUser(id, data = {}) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  const firstname = validateRequiredText(data.firstname, 'firstname');
  const surname = validateRequiredText(data.surname, 'surname');
  const email = validateEmail(data.email);

  const duplicateEmail = await User.findOne({
    where: {
      email,
      id: { [Op.ne]: id },
    },
  });
  if (duplicateEmail) {
    throw new AppError(400, 'Este e-mail já está em uso por outro usuário.');
  }

  await user.update({ firstname, surname, email });
}

/**
 * Remove um usuário pelo ID.
 * @param {number} id ID do usuário
 */
async function deleteUser(id) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  await user.destroy();
}

/**
 * Autentica o usuário via e-mail e senha e gera um token JWT.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string }>}
 */
async function authenticate(credentials = {}) {
  if (!credentials.email || !credentials.password) {
    throw new AppError(400, 'E-mail e senha são obrigatórios.');
  }

  const email = validateEmail(credentials.email);
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new AppError(400, 'Credenciais inválidas.');
  }

  const passwordMatches = await bcrypt.compare(String(credentials.password), user.password);
  if (!passwordMatches) {
    throw new AppError(400, 'Credenciais inválidas.');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, 'JWT_SECRET não configurado no servidor.');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return { token };
}

module.exports = {
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  authenticate,
};
