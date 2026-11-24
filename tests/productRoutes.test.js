const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/mediaService', () => ({
  MEDIA_ROOT: 'media',
  saveProductImage: jest.fn(async (img) =>
    img.content.startsWith('http') ? img.content : '/media/product-1/mock.png'
  ),
  formatImageContentUrl: jest.fn((p) =>
    p.startsWith('http') ? p : `http://localhost:3000${p}`
  ),
  removeProductMediaDir: jest.fn(async () => {}),
}));

const mockTransaction = {};

jest.mock('../src/models', () => ({
  sequelize: {
    authenticate: jest.fn(),
    transaction: jest.fn(async (cb) => cb(mockTransaction)),
  },
  User: {},
  Category: {
    findAll: jest.fn(),
  },
  Product: {
    count: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  ProductImage: {
    bulkCreate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  ProductOption: {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  ProductCategory: {
    findAll: jest.fn(),
  },
}));

const {
  Product,
  Category,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../src/models');
const app = require('../src/app');

describe('Endpoints de Produtos (/v1/product) e Saúde', () => {
  const validToken = jwt.sign({ id: 1, email: 'user@mail.com' }, process.env.JWT_SECRET);

  it('GET /health deve retornar 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  describe('GET /v1/product/search', () => {
    it('deve filtrar por category_ids, option, price-range, match e projetar fields', async () => {
      ProductCategory.findAll.mockResolvedValue([{ product_id: 1 }, { product_id: 2 }]);
      ProductOption.findAll.mockResolvedValue([
        { product_id: 1, values: 'PP,GG,M' },
        { product_id: 2, values: 'P' },
      ]);
      Product.count.mockResolvedValue(1);
      Product.findAll
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([
          {
            id: 1,
            enabled: true,
            name: 'Tênis Runner',
            slug: 'tenis-runner',
            stock: 10,
            description: 'Tênis esportivo',
            price: 150,
            price_with_discount: 120,
            categories: [{ id: 15 }],
            images: [{ id: 1, path: '/media/product-1/mock.png' }],
            options: [
              {
                id: 45,
                title: 'Tamanho',
                shape: 'square',
                radius: 4,
                type: 'text',
                values: 'PP,GG,M',
              },
            ],
          },
        ]);

      const res = await request(app).get(
        '/v1/product/search?limit=12&page=1&fields=name,images,price&match=Tênis&category_ids=15&price-range=100-200&option[45]=GG'
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: [
          {
            name: 'Tênis Runner',
            images: [{ id: 1, content: 'http://localhost:3000/media/product-1/mock.png' }],
            price: 150,
          },
        ],
        total: 1,
        limit: 12,
        page: 1,
      });
    });

    it('deve retornar 400 se price-range for inválido', async () => {
      const res = await request(app).get('/v1/product/search?price-range=300-100');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/product/:id', () => {
    it('deve retornar 200 com produto formatado', async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        enabled: true,
        name: 'Produto 01',
        slug: 'produto-01',
        stock: 10,
        description: 'Descrição do produto 01',
        price: 119.9,
        price_with_discount: 99.9,
        categories: [{ id: 1 }, { id: 15 }],
        images: [{ id: 1, path: 'https://store.com/media/product-01/image-01.png' }],
        options: [
          {
            id: 1,
            title: 'Cor',
            shape: 'circle',
            radius: 0,
            type: 'color',
            values: '#000,#333',
          },
        ],
      });

      const res = await request(app).get('/v1/product/1');

      expect(res.status).toBe(200);
      expect(res.body.category_ids).toEqual([1, 15]);
      expect(res.body.options[0].values).toEqual(['#000', '#333']);
    });

    it('deve retornar 404 quando produto não existir', async () => {
      Product.findByPk.mockResolvedValue(null);
      const res = await request(app).get('/v1/product/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /v1/product', () => {
    it('deve retornar 401 sem token JWT', async () => {
      const res = await request(app).post('/v1/product').send({ name: 'Teste' });
      expect(res.status).toBe(401);
    });

    it('deve criar produto com categorias, imagens e opções e retornar 201', async () => {
      Category.findAll.mockResolvedValue([{ id: 1 }]);
      const setCategoriesMock = jest.fn().mockResolvedValue(true);
      Product.create.mockResolvedValue({ id: 7, setCategories: setCategoriesMock });
      Product.findByPk.mockResolvedValue({
        id: 7,
        enabled: true,
        name: 'Produto 01',
        slug: 'produto-01',
        stock: 10,
        description: 'Descrição',
        price: 119.9,
        price_with_discount: 99.9,
        categories: [{ id: 1 }],
        images: [{ id: 1, path: '/media/product-1/mock.png' }],
        options: [
          { id: 1, title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: 'PP,GG' },
        ],
      });

      const res = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          enabled: true,
          name: 'Produto 01',
          slug: 'produto-01',
          stock: 10,
          description: 'Descrição',
          price: 119.9,
          price_with_discount: 99.9,
          category_ids: [1],
          images: [{ type: 'image/png', content: 'iVBORw0KGgo=' }],
          options: [
            {
              title: 'Tamanho',
              shape: 'square',
              radius: '4px',
              type: 'text',
              value: ['PP', 'GG'],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(setCategoriesMock).toHaveBeenCalledWith([1], { transaction: mockTransaction });
      expect(ProductImage.bulkCreate).toHaveBeenCalledTimes(1);
      expect(ProductOption.bulkCreate).toHaveBeenCalledWith(
        [
          {
            product_id: 7,
            title: 'Tamanho',
            shape: 'square',
            radius: 4,
            type: 'text',
            values: 'PP,GG',
          },
        ],
        { transaction: mockTransaction }
      );
    });
  });

  describe('PUT /v1/product/:id', () => {
    it('deve atualizar produto e aplicar operações em imagens e opções retornando 204', async () => {
      const updateMock = jest.fn().mockResolvedValue(true);
      const setCategoriesMock = jest.fn().mockResolvedValue(true);
      Product.findByPk.mockResolvedValue({
        id: 1,
        update: updateMock,
        setCategories: setCategoriesMock,
      });
      Category.findAll.mockResolvedValue([{ id: 1 }]);

      const res = await request(app)
        .put('/v1/product/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          enabled: true,
          name: 'Produto Atualizado',
          slug: 'produto-atualizado',
          stock: 20,
          description: 'Nova descrição',
          price: 49.9,
          price_with_discount: 0,
          category_ids: [1],
          images: [
            { id: 2, deleted: true },
            { id: 1, content: 'https://store.com/media/product-01/image-01.jpg' },
            { type: 'image/png', content: 'iVBORw0KGgo=' },
          ],
          options: [
            { id: 1, deleted: true },
            { id: 2, radius: '10px', value: ['42/43', '44/45'] },
            { title: 'Tipo', shape: 'square', type: 'text', values: ['Algodão'] },
          ],
        });

      expect(res.status).toBe(204);
      expect(ProductImage.destroy).toHaveBeenCalledTimes(1);
      expect(ProductImage.update).toHaveBeenCalledTimes(1);
      expect(ProductImage.create).toHaveBeenCalledTimes(1);
      expect(ProductOption.destroy).toHaveBeenCalledTimes(1);
      expect(ProductOption.update).toHaveBeenCalledTimes(1);
      expect(ProductOption.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /v1/product/:id', () => {
    it('deve retornar 204 ao remover produto existente', async () => {
      const destroyMock = jest.fn().mockResolvedValue(true);
      Product.findByPk.mockResolvedValue({ id: 1, destroy: destroyMock });

      const res = await request(app)
        .delete('/v1/product/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(204);
      expect(destroyMock).toHaveBeenCalledTimes(1);
    });
  });
});
