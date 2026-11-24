const AppError = require('./AppError');

/**
 * Converte e valida parâmetros de paginação e seleção de campos comuns às buscas.
 * @param {Record<string, unknown>} query Query string da requisição Express
 * @param {string[]} allowedFields Lista de campos permitidos em `fields`
 * @returns {{ limit: number, page: number, fields: string[] | null }}
 */
function parsePaginationAndFields(query = {}, allowedFields = []) {
  let limit = 12;
  if (query.limit !== undefined) {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || (parsedLimit < 1 && parsedLimit !== -1)) {
      throw new AppError(400, 'O parâmetro "limit" deve ser um inteiro positivo ou -1.');
    }
    limit = parsedLimit;
  }

  let page = 1;
  if (query.page !== undefined && limit !== -1) {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new AppError(400, 'O parâmetro "page" deve ser um inteiro positivo.');
    }
    page = parsedPage;
  }

  let fields = null;
  if (query.fields !== undefined) {
    const rawFields = String(query.fields)
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);

    if (rawFields.length === 0) {
      throw new AppError(400, 'O parâmetro "fields" não pode ser vazio.');
    }

    const invalidFields = rawFields.filter((field) => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      throw new AppError(
        400,
        `Campos inválidos em "fields": ${invalidFields.join(', ')}.`
      );
    }

    fields = rawFields;
  }

  return { limit, page, fields };
}

/**
 * Converte um parâmetro de ID de rota para inteiro positivo.
 * @param {string | number} rawId Valor recebido em req.params.id
 * @returns {number}
 */
function parsePositiveIntId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'O parâmetro "id" deve ser um número inteiro positivo.');
  }
  return id;
}

/**
 * Seleciona apenas as chaves permitidas de um objeto quando `fields` está definido.
 * @param {Record<string, unknown>} item Objeto completo
 * @param {string[] | null} fields Lista de campos desejados
 * @returns {Record<string, unknown>}
 */
function pickFields(item, fields) {
  if (!fields) {
    return item;
  }
  return fields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(item, field)) {
      acc[field] = item[field];
    }
    return acc;
  }, {});
}

module.exports = {
  parsePaginationAndFields,
  parsePositiveIntId,
  pickFields,
};
