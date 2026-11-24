const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/models', () => ({
  sequelize: { authenticate: jest.fn(), transaction: jest.fn() },
  User: {},
  Category: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Product: {},
  ProductImage: {},
  ProductOption: {},
  ProductCategory: {},
}));

const { Category } = require('../src/models');
const app = require('../src/app');

describe('Endpoints de Categorias (/v1/category)', () => {
  const validToken = jwt.sign({ id: 1, email: 'user@mail.com' }, process.env.JWT_SECRET);

  describe('GET /v1/category/search', () => {
    it('deve retornar categorias paginadas com fields e use_in_menu', async () => {
      Category.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: [
          { id: 1, name: 'Shoes', slug: 'shoes', use_in_menu: true },
          { id: 2, name: 'Offers', slug: 'offers', use_in_menu: true },
        ],
      });

      const res = await request(app).get(
        '/v1/category/search?limit=-1&fields=name,slug&use_in_menu=true'
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: [
          { name: 'Shoes', slug: 'shoes' },
          { name: 'Offers', slug: 'offers' },
        ],
        total: 2,
        limit: -1,
        page: 1,
      });
      expect(Category.findAndCountAll).toHaveBeenCalledWith({
        where: { use_in_menu: true },
        order: [['id', 'ASC']],
      });
    });

    it('deve retornar 400 se use_in_menu for inválido', async () => {
      const res = await request(app).get('/v1/category/search?use_in_menu=talvez');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/category/:id', () => {
    it('deve retornar 200 com dados da categoria', async () => {
      Category.findByPk.mockResolvedValue({
        id: 1,
        name: 'Shoes',
        slug: 'shoes',
        use_in_menu: true,
      });

      const res = await request(app).get('/v1/category/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 1,
        name: 'Shoes',
        slug: 'shoes',
        use_in_menu: true,
      });
    });

    it('deve retornar 404 quando categoria não existir', async () => {
      Category.findByPk.mockResolvedValue(null);
      const res = await request(app).get('/v1/category/99');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /v1/category', () => {
    it('deve retornar 401 sem token JWT', async () => {
      const res = await request(app).post('/v1/category').send({
        name: 'Shoes',
        slug: 'shoes',
      });
      expect(res.status).toBe(401);
    });

    it('deve criar categoria com token válido e retornar 201', async () => {
      Category.create.mockResolvedValue({
        id: 3,
        name: 'Black Friday',
        slug: 'black-friday',
        use_in_menu: false,
      });

      const res = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Black Friday',
          slug: 'black-friday',
          use_in_menu: false,
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 3,
        name: 'Black Friday',
        slug: 'black-friday',
        use_in_menu: false,
      });
    });
  });

  describe('PUT /v1/category/:id', () => {
    it('deve retornar 204 ao atualizar categoria', async () => {
      const updateMock = jest.fn().mockResolvedValue(true);
      Category.findByPk.mockResolvedValue({ id: 1, update: updateMock });

      const res = await request(app)
        .put('/v1/category/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Tênis', slug: 'tenis', use_in_menu: true });

      expect(res.status).toBe(204);
      expect(updateMock).toHaveBeenCalledWith({
        name: 'Tênis',
        slug: 'tenis',
        use_in_menu: true,
      });
    });
  });

  describe('DELETE /v1/category/:id', () => {
    it('deve retornar 204 ao deletar categoria', async () => {
      const destroyMock = jest.fn().mockResolvedValue(true);
      Category.findByPk.mockResolvedValue({ id: 1, destroy: destroyMock });

      const res = await request(app)
        .delete('/v1/category/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(204);
      expect(destroyMock).toHaveBeenCalledTimes(1);
    });
  });
});
