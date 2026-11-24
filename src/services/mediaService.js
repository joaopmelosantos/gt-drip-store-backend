const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

const MEDIA_ROOT = path.resolve(__dirname, '..', '..', 'media');

const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/**
 * Resolve e salva imagem enviada via URL ou Base64, retornando o caminho relativo para o banco.
 * @param {{ type?: string, content: string }} imageInput Dados da imagem
 * @param {number} productId ID do produto dono da imagem
 * @returns {Promise<string>} Caminho relativo (/media/...) ou URL externa
 */
async function saveProductImage(imageInput, productId) {
  if (!imageInput || typeof imageInput.content !== 'string' || !imageInput.content.trim()) {
    throw new AppError(400, 'Conteúdo da imagem do produto é obrigatório.');
  }

  const content = imageInput.content.trim();

  // Caso já seja uma URL externa ou caminho relativo salvo anteriormente
  if (/^(https?:\/\/|\/media\/)/i.test(content)) {
    return content;
  }

  let mimeType = imageInput.type ? String(imageInput.type).toLowerCase() : 'image/png';
  let base64Data = content;

  const dataUriMatch = content.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUriMatch) {
    mimeType = dataUriMatch[1].toLowerCase();
    base64Data = dataUriMatch[2];
  }

  const extension = MIME_EXTENSIONS[mimeType] || 'png';
  const productDir = path.join(MEDIA_ROOT, `product-${productId}`);
  await fs.promises.mkdir(productDir, { recursive: true });

  const fileName = `image-${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(productDir, fileName);
  const buffer = Buffer.from(base64Data, 'base64');

  await fs.promises.writeFile(filePath, buffer);
  return `/media/product-${productId}/${fileName}`;
}

/**
 * Constrói a URL pública da imagem a partir do caminho salvo no banco.
 * @param {string} storedPath Caminho salvo na coluna `path`
 * @returns {string}
 */
function formatImageContentUrl(storedPath) {
  if (!storedPath) return '';
  if (/^https?:\/\//i.test(storedPath)) {
    return storedPath;
  }
  const baseUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  return baseUrl ? `${baseUrl}${storedPath}` : storedPath;
}

/**
 * Remove o diretório local de mídias de um produto ao deletá-lo.
 * @param {number} productId ID do produto
 */
async function removeProductMediaDir(productId) {
  const productDir = path.join(MEDIA_ROOT, `product-${productId}`);
  await fs.promises.rm(productDir, { recursive: true, force: true });
}

module.exports = {
  MEDIA_ROOT,
  saveProductImage,
  formatImageContentUrl,
  removeProductMediaDir,
};
