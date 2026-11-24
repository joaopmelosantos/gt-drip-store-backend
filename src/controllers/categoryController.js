const categoryService = require('../services/categoryService');
const { parsePositiveIntId } = require('../utils/queryParser');

async function search(req, res, next) {
  try {
    const result = await categoryService.searchCategories(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = parsePositiveIntId(req.params.id);
    const category = await categoryService.getCategoryById(id);
    return res.status(200).json(category);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    return res.status(201).json(category);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parsePositiveIntId(req.params.id);
    await categoryService.updateCategory(id, req.body);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = parsePositiveIntId(req.params.id);
    await categoryService.deleteCategory(id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  search,
  getById,
  create,
  update,
  remove,
};
