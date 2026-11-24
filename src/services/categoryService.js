const { Category } = require('../models');
const AppError = require('../utils/AppError');
const { parsePaginationAndFields, pickFields } = require('../utils/queryParser');

const ALLOWED_CATEGORY_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

function formatCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    use_in_menu: Boolean(category.use_in_menu),
  };
}

function validateCategoryPayload(data = {}) {
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new AppError(400, 'O campo "name" é obrigatório.');
  }
  if (!data.slug || typeof data.slug !== 'string' || !data.slug.trim()) {
    throw new AppError(400, 'O campo "slug" é obrigatório.');
  }
  if (data.use_in_menu !== undefined && typeof data.use_in_menu !== 'boolean') {
    throw new AppError(400, 'O campo "use_in_menu" deve ser booleano.');
  }

  return {
    name: data.name.trim(),
    slug: data.slug.trim(),
    use_in_menu: data.use_in_menu !== undefined ? data.use_in_menu : false,
  };
}

/**
 * Lista categorias com suporte a paginação, projeção de campos e filtro `use_in_menu`.
 * @param {Record<string, unknown>} query Query string da requisição
 */
async function searchCategories(query = {}) {
  const { limit, page, fields } = parsePaginationAndFields(query, ALLOWED_CATEGORY_FIELDS);

  const where = {};
  if (query.use_in_menu !== undefined) {
    const raw = String(query.use_in_menu).toLowerCase();
    if (raw === 'true' || raw === '1') {
      where.use_in_menu = true;
    } else if (raw === 'false' || raw === '0') {
      where.use_in_menu = false;
    } else {
      throw new AppError(400, 'O parâmetro "use_in_menu" deve ser true ou false.');
    }
  }

  const queryOptions = {
    where,
    order: [['id', 'ASC']],
  };

  if (limit !== -1) {
    queryOptions.limit = limit;
    queryOptions.offset = (page - 1) * limit;
  }

  const { rows, count } = await Category.findAndCountAll(queryOptions);

  return {
    data: rows.map((category) => pickFields(formatCategory(category), fields)),
    total: count,
    limit,
    page,
  };
}

/**
 * Busca uma categoria específica pelo ID.
 * @param {number} id ID da categoria
 */
async function getCategoryById(id) {
  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError(404, 'Categoria não encontrada.');
  }
  return formatCategory(category);
}

/**
 * Cria uma nova categoria.
 * @param {{ name: string, slug: string, use_in_menu?: boolean }} data
 */
async function createCategory(data = {}) {
  const payload = validateCategoryPayload(data);
  const created = await Category.create(payload);
  return formatCategory(created);
}

/**
 * Atualiza uma categoria existente pelo ID.
 * @param {number} id ID da categoria
 * @param {{ name: string, slug: string, use_in_menu?: boolean }} data
 */
async function updateCategory(id, data = {}) {
  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError(404, 'Categoria não encontrada.');
  }

  const payload = validateCategoryPayload(data);
  await category.update(payload);
}

/**
 * Remove uma categoria pelo ID.
 * @param {number} id ID da categoria
 */
async function deleteCategory(id) {
  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError(404, 'Categoria não encontrada.');
  }

  await category.destroy();
}

module.exports = {
  searchCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
