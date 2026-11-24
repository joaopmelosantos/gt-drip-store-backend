const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../src/models', () => ({
  sequelize: { authenticate: jest.fn(), transaction: jest.fn() },
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Category: {},
  Product: {},
  ProductImage: {},
  ProductOption: {},
  ProductCategory: {},
}));

const { User } = require('../src/models');
const app = require('../src/app');

describe('Endpoints de Usuários e Autenticação (/v1/user)', () => {
  const validToken = jwt.sign({ id: 1, email: 'user@mail.com' }, process.env.JWT_SECRET);

  describe('GET /v1/user/:id', () => {
    it('deve retornar 200 e os dados públicos do usuário', async () => {
      User.findByPk.mockResolvedValue({
        id: 1,
        firstname: 'João',
        surname: 'Silva',
        email: 'user@mail.com',
      });

      const res = await request(app).get('/v1/user/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 1,
        firstname: 'João',
        surname: 'Silva',
        email: 'user@mail.com',
      });
    });

    it('deve retornar 404 quando usuário não existir', async () => {
      User.findByPk.mockResolvedValue(null);

      const res = await request(app).get('/v1/user/999');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /v1/user', () => {
    it('deve cadastrar usuário com senha criptografada e retornar 201', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockImplementation(async (payload) => ({
        id: 10,
        ...payload,
      }));

      const res = await request(app).post('/v1/user').send({
        firstname: 'Maria',
        surname: 'Souza',
        email: 'maria@mail.com',
        password: '123@123',
        confirmPassword: '123@123',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 10,
        firstname: 'Maria',
        surname: 'Souza',
        email: 'maria@mail.com',
      });
      const savedPassword = User.create.mock.calls[0][0].password;
      expect(savedPassword).not.toBe('123@123');
      expect(await bcrypt.compare('123@123', savedPassword)).toBe(true);
    });

    it('deve retornar 400 quando confirmPassword não conferir', async () => {
      const res = await request(app).post('/v1/user').send({
        firstname: 'Maria',
        surname: 'Souza',
        email: 'maria@mail.com',
        password: '123@123',
        confirmPassword: 'outra',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/user/token', () => {
    it('deve retornar 200 e token JWT quando credenciais forem válidas', async () => {
      const passwordHash = await bcrypt.hash('123@123', 10);
      User.findOne.mockResolvedValue({
        id: 1,
        email: 'user@mail.com',
        password: passwordHash,
      });

      const res = await request(app).post('/v1/user/token').send({
        email: 'user@mail.com',
        password: '123@123',
      });

      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(1);
    });

    it('deve retornar 400 quando senha estiver incorreta', async () => {
      const passwordHash = await bcrypt.hash('123@123', 10);
      User.findOne.mockResolvedValue({
        id: 1,
        email: 'user@mail.com',
        password: passwordHash,
      });

      const res = await request(app).post('/v1/user/token').send({
        email: 'user@mail.com',
        password: 'errada',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /v1/user/:id', () => {
    it('deve retornar 401 quando enviado sem token JWT', async () => {
      const res = await request(app).put('/v1/user/1').send({
        firstname: 'Novo',
        surname: 'Nome',
        email: 'novo@mail.com',
      });

      expect(res.status).toBe(401);
    });

    it('deve retornar 204 ao atualizar usuário autenticado', async () => {
      const updateMock = jest.fn().mockResolvedValue(true);
      User.findByPk.mockResolvedValue({ id: 1, update: updateMock });
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .put('/v1/user/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          firstname: 'João',
          surname: 'Atualizado',
          email: 'joao@mail.com',
        });

      expect(res.status).toBe(204);
      expect(updateMock).toHaveBeenCalledWith({
        firstname: 'João',
        surname: 'Atualizado',
        email: 'joao@mail.com',
      });
    });
  });

  describe('DELETE /v1/user/:id', () => {
    it('deve retornar 204 ao deletar usuário autenticado', async () => {
      const destroyMock = jest.fn().mockResolvedValue(true);
      User.findByPk.mockResolvedValue({ id: 1, destroy: destroyMock });

      const res = await request(app)
        .delete('/v1/user/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(204);
      expect(destroyMock).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 404 ao tentar deletar usuário inexistente', async () => {
      User.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .delete('/v1/user/999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
    });
  });
});
