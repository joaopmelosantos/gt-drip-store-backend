const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  Category,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../models');
const AppError = require('../utils/AppError');
const { parsePaginationAndFields, pickFields } = require('../utils/queryParser');
const {
  saveProductImage,
  formatImageContentUrl,
  removeProductMediaDir,
} = require('./mediaService');

const ALLOWED_PRODUCT_FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'use_in_menu',
  'stock',
  'description',
  'price',
  'price_with_discount',
  'category_ids',
  'images',
  'options',
];

const PRODUCT_INCLUDES = [
  { model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } },
  { model: ProductImage, as: 'images', attributes: ['id', 'enabled', 'path'] },
  {
    model: ProductOption,
    as: 'options',
    attributes: ['id', 'title', 'shape', 'radius', 'type', 'values'],
  },
];

function formatProduct(product) {
  return {
    id: product.id,
    enabled: Boolean(product.enabled),
    name: product.name,
    slug: product.slug,
    use_in_menu: Boolean(product.use_in_menu),
    stock: product.stock ?? 0,
    description: product.description ?? '',
    price: Number(product.price),
    price_with_discount: Number(product.price_with_discount),
    category_ids: (product.categories || []).map((cat) => cat.id),
    images: (product.images || []).map((img) => ({
      id: img.id,
      content: formatImageContentUrl(img.path),
    })),
    options: (product.options || []).map((opt) => ({
      id: opt.id,
      title: opt.title,
      shape: opt.shape,
      radius: opt.radius,
      type: opt.type,
      values: opt.values
        ? String(opt.values)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : [],
    })),
  };
}

function parseRadius(rawRadius) {
  if (rawRadius === undefined || rawRadius === null || rawRadius === '') {
    return 0;
  }
  const numeric = typeof rawRadius === 'string'
    ? Number.parseInt(rawRadius.replace(/px$/i, '').trim(), 10)
    : Number(rawRadius);

  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new AppError(400, 'O campo "radius" da opção deve ser um inteiro não negativo.');
  }
  return numeric;
}

function normalizeOptionValues(optionInput) {
  const rawValues = optionInput.values !== undefined ? optionInput.values : optionInput.value;
  if (Array.isArray(rawValues)) {
    const cleaned = rawValues.map((item) => String(item).trim()).filter(Boolean);
    if (cleaned.length === 0) {
      throw new AppError(400, 'As opções do produto devem conter ao menos um valor.');
    }
    return cleaned.join(',');
  }
  if (typeof rawValues === 'string' && rawValues.trim()) {
    return rawValues
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(',');
  }
  throw new AppError(400, 'O campo "values" (ou "value") da opção é obrigatório.');
}

function normalizeOptionPayload(optionInput, { isUpdate = false } = {}) {
  const shape = optionInput.shape || 'square';
  const type = optionInput.type || 'text';

  if (!['square', 'circle'].includes(shape)) {
    throw new AppError(400, 'O campo "shape" da opção deve ser "square" ou "circle".');
  }
  if (!['text', 'color'].includes(type)) {
    throw new AppError(400, 'O campo "type" da opção deve ser "text" ou "color".');
  }

  const normalized = {};
  if (!isUpdate || optionInput.title !== undefined) {
    if (!optionInput.title || typeof optionInput.title !== 'string' || !optionInput.title.trim()) {
      throw new AppError(400, 'O campo "title" da opção é obrigatório.');
    }
    normalized.title = optionInput.title.trim();
  }
  if (!isUpdate || optionInput.shape !== undefined) {
    normalized.shape = shape;
  }
  if (!isUpdate || optionInput.radius !== undefined) {
    normalized.radius = parseRadius(optionInput.radius);
  }
  if (!isUpdate || optionInput.type !== undefined) {
    normalized.type = type;
  }
  if (!isUpdate || optionInput.values !== undefined || optionInput.value !== undefined) {
    normalized.values = normalizeOptionValues(optionInput);
  }

  return normalized;
}

function validateProductFields(data = {}) {
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new AppError(400, 'O campo "name" é obrigatório.');
  }
  if (!data.slug || typeof data.slug !== 'string' || !data.slug.trim()) {
    throw new AppError(400, 'O campo "slug" é obrigatório.');
  }

  const price = Number(data.price);
  if (data.price === undefined || data.price === null || Number.isNaN(price) || price < 0) {
    throw new AppError(400, 'O campo "price" deve ser um número válido não negativo.');
  }

  const priceWithDiscount = Number(data.price_with_discount);
  if (
    data.price_with_discount === undefined ||
    data.price_with_discount === null ||
    Number.isNaN(priceWithDiscount) ||
    priceWithDiscount < 0
  ) {
    throw new AppError(
      400,
      'O campo "price_with_discount" deve ser um número válido não negativo.'
    );
  }

  const stock = data.stock !== undefined ? Number(data.stock) : 0;
  if (!Number.isInteger(stock) || stock < 0) {
    throw new AppError(400, 'O campo "stock" deve ser um inteiro não negativo.');
  }

  return {
    enabled: data.enabled !== undefined ? Boolean(data.enabled) : false,
    name: data.name.trim(),
    slug: data.slug.trim(),
    use_in_menu: data.use_in_menu !== undefined ? Boolean(data.use_in_menu) : false,
    stock,
    description: data.description !== undefined ? String(data.description) : null,
    price,
    price_with_discount: priceWithDiscount,
  };
}

async function resolveCategoryIds(categoryIds, transaction) {
  if (categoryIds === undefined) return undefined;
  if (!Array.isArray(categoryIds)) {
    throw new AppError(400, 'O campo "category_ids" deve ser um array de IDs.');
  }

  const uniqueIds = [...new Set(categoryIds.map(Number))];
  if (uniqueIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new AppError(400, 'Todos os itens de "category_ids" devem ser inteiros positivos.');
  }

  if (uniqueIds.length > 0) {
    const foundCategories = await Category.findAll({
      where: { id: { [Op.in]: uniqueIds } },
      attributes: ['id'],
      transaction,
    });
    if (foundCategories.length !== uniqueIds.length) {
      throw new AppError(400, 'Uma ou mais categorias informadas em "category_ids" não existem.');
    }
  }

  return uniqueIds;
}

function parsePriceRange(rawRange) {
  if (rawRange === undefined) return null;
  const parts = String(rawRange).split('-');
  if (parts.length !== 2) {
    throw new AppError(400, 'O parâmetro "price-range" deve seguir o formato min-max.');
  }
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || min > max) {
    throw new AppError(400, 'Intervalo de preços inválido em "price-range".');
  }
  return [min, max];
}

function parseCategoryIdsQuery(rawCategoryIds) {
  if (rawCategoryIds === undefined) return null;
  const ids = String(rawCategoryIds)
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));

  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new AppError(400, 'O parâmetro "category_ids" deve conter IDs inteiros separados por vírgula.');
  }
  return [...new Set(ids)];
}

function parseOptionFilters(rawOption) {
  if (!rawOption || typeof rawOption !== 'object') return [];
  return Object.entries(rawOption).map(([optionIdRaw, valuesRaw]) => {
    const optionId = Number(optionIdRaw);
    if (!Number.isInteger(optionId) || optionId <= 0) {
      throw new AppError(400, `ID de opção inválido no filtro: "${optionIdRaw}".`);
    }
    const targetValues = String(valuesRaw)
      .split(',')
      .map((val) => val.trim().toLowerCase())
      .filter(Boolean);
    if (targetValues.length === 0) {
      throw new AppError(400, `Valores de filtro vazios para option[${optionId}].`);
    }
    return { optionId, targetValues };
  });
}

function intersectIdSets(currentIds, nextIds) {
  if (currentIds === null) return nextIds;
  const nextSet = new Set(nextIds);
  return currentIds.filter((id) => nextSet.has(id));
}

/**
 * Busca produtos com paginação, filtros (match, category_ids, price-range, option) e projeção de campos.
 * @param {Record<string, unknown>} query Query string da requisição
 */
async function searchProducts(query = {}) {
  const { limit, page, fields } = parsePaginationAndFields(query, ALLOWED_PRODUCT_FIELDS);

  const where = {};
  if (query.match !== undefined && String(query.match).trim()) {
    const term = `%${String(query.match).trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { description: { [Op.like]: term } },
    ];
  }

  const priceRange = parsePriceRange(query['price-range']);
  if (priceRange) {
    where.price = { [Op.between]: priceRange };
  }

  let filteredProductIds = null;

  const categoryIds = parseCategoryIdsQuery(query.category_ids);
  if (categoryIds) {
    const categoryLinks = await ProductCategory.findAll({
      where: { category_id: { [Op.in]: categoryIds } },
      attributes: ['product_id'],
    });
    const matchedByCategory = [...new Set(categoryLinks.map((row) => row.product_id))];
    filteredProductIds = intersectIdSets(filteredProductIds, matchedByCategory);
  }

  const optionFilters = parseOptionFilters(query.option);
  for (const filter of optionFilters) {
    const matchingOptions = await ProductOption.findAll({
      where: { id: filter.optionId },
      attributes: ['product_id', 'values'],
    });
    const matchedByOption = matchingOptions
      .filter((opt) => {
        const available = String(opt.values || '')
          .split(',')
          .map((v) => v.trim().toLowerCase());
        return filter.targetValues.some((target) => available.includes(target));
      })
      .map((opt) => opt.product_id);

    filteredProductIds = intersectIdSets(filteredProductIds, [...new Set(matchedByOption)]);
  }

  if (filteredProductIds !== null) {
    if (filteredProductIds.length === 0) {
      return { data: [], total: 0, limit, page };
    }
    where.id = { [Op.in]: filteredProductIds };
  }

  const total = await Product.count({ where });
  if (total === 0) {
    return { data: [], total: 0, limit, page };
  }

  const idQueryOptions = {
    where,
    attributes: ['id'],
    order: [['id', 'ASC']],
  };
  if (limit !== -1) {
    idQueryOptions.limit = limit;
    idQueryOptions.offset = (page - 1) * limit;
  }

  const pageRows = await Product.findAll(idQueryOptions);
  const pageIds = pageRows.map((row) => row.id);

  if (pageIds.length === 0) {
    return { data: [], total, limit, page };
  }

  const products = await Product.findAll({
    where: { id: { [Op.in]: pageIds } },
    include: PRODUCT_INCLUDES,
    order: [['id', 'ASC']],
  });

  return {
    data: products.map((product) => pickFields(formatProduct(product), fields)),
    total,
    limit,
    page,
  };
}

/**
 * Retorna um produto detalhado pelo ID.
 * @param {number} id ID do produto
 */
async function getProductById(id) {
  const product = await Product.findByPk(id, { include: PRODUCT_INCLUDES });
  if (!product) {
    throw new AppError(404, 'Produto não encontrado.');
  }
  return formatProduct(product);
}

/**
 * Cria um novo produto com categorias, imagens e opções dentro de transação.
 * @param {Record<string, unknown>} data Payload de criação
 */
async function createProduct(data = {}) {
  const productFields = validateProductFields(data);

  const createdId = await sequelize.transaction(async (transaction) => {
    const validCategoryIds = await resolveCategoryIds(data.category_ids, transaction);
    const product = await Product.create(productFields, { transaction });

    if (validCategoryIds && validCategoryIds.length > 0) {
      await product.setCategories(validCategoryIds, { transaction });
    }

    if (Array.isArray(data.images) && data.images.length > 0) {
      const imageRecords = [];
      for (const img of data.images) {
        const storedPath = await saveProductImage(img, product.id);
        imageRecords.push({
          product_id: product.id,
          enabled: img.enabled !== undefined ? Boolean(img.enabled) : true,
          path: storedPath,
        });
      }
      await ProductImage.bulkCreate(imageRecords, { transaction });
    }

    if (Array.isArray(data.options) && data.options.length > 0) {
      const optionRecords = data.options.map((opt) => ({
        product_id: product.id,
        ...normalizeOptionPayload(opt),
      }));
      await ProductOption.bulkCreate(optionRecords, { transaction });
    }

    return product.id;
  });

  return getProductById(createdId);
}

/**
 * Atualiza um produto, suas categorias e alterações incrementais de imagens e opções.
 * @param {number} id ID do produto
 * @param {Record<string, unknown>} data Payload de atualização
 */
async function updateProduct(id, data = {}) {
  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError(404, 'Produto não encontrado.');
  }

  const productFields = validateProductFields(data);

  await sequelize.transaction(async (transaction) => {
    await product.update(productFields, { transaction });

    const validCategoryIds = await resolveCategoryIds(data.category_ids, transaction);
    if (validCategoryIds !== undefined) {
      await product.setCategories(validCategoryIds, { transaction });
    }

    if (Array.isArray(data.images)) {
      for (const img of data.images) {
        if (img.id && img.deleted) {
          await ProductImage.destroy({
            where: { id: img.id, product_id: product.id },
            transaction,
          });
          continue;
        }

        if (img.id) {
          const updateData = {};
          if (img.content !== undefined) {
            updateData.path = await saveProductImage(img, product.id);
          }
          if (img.enabled !== undefined) {
            updateData.enabled = Boolean(img.enabled);
          }
          if (Object.keys(updateData).length > 0) {
            await ProductImage.update(updateData, {
              where: { id: img.id, product_id: product.id },
              transaction,
            });
          }
          continue;
        }

        const storedPath = await saveProductImage(img, product.id);
        await ProductImage.create(
          {
            product_id: product.id,
            enabled: img.enabled !== undefined ? Boolean(img.enabled) : true,
            path: storedPath,
          },
          { transaction }
        );
      }
    }

    if (Array.isArray(data.options)) {
      for (const opt of data.options) {
        if (opt.id && opt.deleted) {
          await ProductOption.destroy({
            where: { id: opt.id, product_id: product.id },
            transaction,
          });
          continue;
        }

        if (opt.id) {
          const updateData = normalizeOptionPayload(opt, { isUpdate: true });
          await ProductOption.update(updateData, {
            where: { id: opt.id, product_id: product.id },
            transaction,
          });
          continue;
        }

        await ProductOption.create(
          {
            product_id: product.id,
            ...normalizeOptionPayload(opt),
          },
          { transaction }
        );
      }
    }
  });
}

/**
 * Remove um produto pelo ID e limpa suas mídias locais.
 * @param {number} id ID do produto
 */
async function deleteProduct(id) {
  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError(404, 'Produto não encontrado.');
  }

  await product.destroy();
  await removeProductMediaDir(id);
}

module.exports = {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
