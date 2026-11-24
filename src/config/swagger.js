const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Drip Store API — Projeto Back-end',
    version: '1.0.0',
    description:
      'API RESTful de e-commerce desenvolvida segundo a especificação oficial do Projeto Back-end (Digital College / Geração Tech).',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor Local',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Geração de token JWT' },
    { name: 'Users', description: 'Gerenciamento de usuários' },
    { name: 'Categories', description: 'Gerenciamento de categorias' },
    { name: 'Products', description: 'Gerenciamento de produtos, imagens e opções' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', example: 'user@mail.com' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Descrição do produto 01' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 15] },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                content: { type: 'string', example: '/media/product-1/image.png' },
              },
            },
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                title: { type: 'string', example: 'Tamanho' },
                shape: { type: 'string', enum: ['square', 'circle'] },
                radius: { type: 'integer', example: 4 },
                type: { type: 'string', enum: ['text', 'color'] },
                values: { type: 'array', items: { type: 'string' }, example: ['PP', 'M', 'GG'] },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/v1/user/token': {
      post: {
        tags: ['Auth'],
        summary: 'Gera um token JWT para autenticação',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'user@mail.com' },
                  password: { type: 'string', example: '123@123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Token gerado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { token: { type: 'string' } },
                },
              },
            },
          },
          400: { description: 'Credenciais ou dados inválidos' },
        },
      },
    },
    '/v1/user': {
      post: {
        tags: ['Users'],
        summary: 'Cadastra um novo usuário',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
                properties: {
                  firstname: { type: 'string', example: 'João' },
                  surname: { type: 'string', example: 'Silva' },
                  email: { type: 'string', example: 'user@mail.com' },
                  password: { type: 'string', example: '123@123' },
                  confirmPassword: { type: 'string', example: '123@123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Usuário cadastrado' },
          400: { description: 'Dados inválidos' },
        },
      },
    },
    '/v1/user/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Obtém usuário por ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Usuário encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } } },
          },
          404: { description: 'Usuário não encontrado' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Atualiza usuário por ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstname', 'surname', 'email'],
                properties: {
                  firstname: { type: 'string' },
                  surname: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          204: { description: 'Atualizado sem conteúdo no corpo' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
          404: { description: 'Usuário não encontrado' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Remove usuário por ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          204: { description: 'Removido sem conteúdo no corpo' },
          401: { description: 'Não autorizado' },
          404: { description: 'Usuário não encontrado' },
        },
      },
    },
    '/v1/category/search': {
      get: {
        tags: ['Categories'],
        summary: 'Lista categorias com filtros e paginação',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'fields', in: 'query', schema: { type: 'string', example: 'name,slug' } },
          { name: 'use_in_menu', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'Lista paginada de categorias' },
          400: { description: 'Parâmetros inválidos' },
        },
      },
    },
    '/v1/category/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Obtém categoria por ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Categoria encontrada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } },
          },
          404: { description: 'Categoria não encontrada' },
        },
      },
      put: {
        tags: ['Categories'],
        summary: 'Atualiza categoria por ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'slug'],
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  use_in_menu: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          204: { description: 'Atualizada sem conteúdo' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
          404: { description: 'Categoria não encontrada' },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Remove categoria por ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          204: { description: 'Removida sem conteúdo' },
          401: { description: 'Não autorizado' },
          404: { description: 'Categoria não encontrada' },
        },
      },
    },
    '/v1/category': {
      post: {
        tags: ['Categories'],
        summary: 'Cria uma nova categoria',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'slug'],
                properties: {
                  name: { type: 'string', example: 'Shoes' },
                  slug: { type: 'string', example: 'shoes' },
                  use_in_menu: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Categoria criada' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
        },
      },
    },
    '/v1/product/search': {
      get: {
        tags: ['Products'],
        summary: 'Busca produtos com paginação e filtros avançados',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'fields', in: 'query', schema: { type: 'string', example: 'name,images,price' } },
          { name: 'match', in: 'query', schema: { type: 'string', example: 'Tênis' } },
          { name: 'category_ids', in: 'query', schema: { type: 'string', example: '1,2' } },
          { name: 'price-range', in: 'query', schema: { type: 'string', example: '100-200' } },
        ],
        responses: {
          200: { description: 'Lista paginada de produtos' },
          400: { description: 'Parâmetros inválidos' },
        },
      },
    },
    '/v1/product/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Obtém produto por ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Produto encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          404: { description: 'Produto não encontrado' },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Atualiza produto por ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Product' },
            },
          },
        },
        responses: {
          204: { description: 'Atualizado sem conteúdo' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
          404: { description: 'Produto não encontrado' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Remove produto por ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          204: { description: 'Removido sem conteúdo' },
          401: { description: 'Não autorizado' },
          404: { description: 'Produto não encontrado' },
        },
      },
    },
    '/v1/product': {
      post: {
        tags: ['Products'],
        summary: 'Cria um novo produto',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Product' },
            },
          },
        },
        responses: {
          201: { description: 'Produto criado' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
        },
      },
    },
  },
};

module.exports = swaggerDocument;
