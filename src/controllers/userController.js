const userService = require('../services/userService');
const { parsePositiveIntId } = require('../utils/queryParser');

async function getById(req, res, next) {
  try {
    const id = parsePositiveIntId(req.params.id);
    const user = await userService.getUserById(id);
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parsePositiveIntId(req.params.id);
    await userService.updateUser(id, req.body);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = parsePositiveIntId(req.params.id);
    await userService.deleteUser(id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function generateToken(req, res, next) {
  try {
    const result = await userService.authenticate(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getById,
  create,
  update,
  remove,
  generateToken,
};
