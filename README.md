# Drip Store API — Projeto Back-end (Geração Tech)

API RESTful de e-commerce desenvolvida em **Node.js, Express, Sequelize ORM e MySQL**, implementada seguindo integralmente os requisitos do escopo oficial em [digitalcollegebr/projeto-backend](https://github.com/digitalcollegebr/projeto-backend) e das diretrizes em [projeto.md](projeto.md).

---

## Sumário

- [Visão Geral e Arquitetura](#visão-geral-e-arquitetura)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Modelagem do Banco de Dados](#modelagem-do-banco-de-dados)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução Passo a Passo](#instalação-e-execução-passo-a-passo)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Referência dos Endpoints](#referência-dos-endpoints)
- [Testes Automatizados](#testes-automatizados)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Autor](#autor)

---

## Visão Geral e Arquitetura

A aplicação foi estruturada seguindo o padrão **MVC estendido com camada de Services** e princípios **SOLID**:

- **Routes (`src/routes/`):** definição dos endpoints REST sob o prefixo `/v1` e aplicação do middleware de autenticação JWT nas rotas protegidas.
- **Controllers (`src/controllers/`):** recebimento das requisições HTTP, extração de parâmetros e retorno padronizado dos status codes (`200`, `201`, `204`, `400`, `401`, `404`, `500`).
- **Services (`src/services/`):** regras de negócio, validações, hash de senhas, transações Sequelize, filtros avançados e manipulação de imagens em disco/URL.
- **Models & Migrations (`src/models/`, `src/database/migrations/`):** mapeamento relacional completo no MySQL com versionamento de schema via `sequelize-cli`.
- **Middlewares & Utils (`src/middleware/`, `src/utils/`):** autenticação `Bearer <jwt>`, tratamento centralizado de erros (`AppError`) e parsing padronizado de paginação/projeção de campos.

---

## Tecnologias Utilizadas

- **Runtime & Framework:** Node.js, Express.js
- **Banco de Dados & ORM:** MySQL 8.4, `mysql2`, Sequelize ORM, `sequelize-cli` (Migrations e Seeders)
- **Segurança & Autenticação:** `jsonwebtoken` (JWT), `bcryptjs` (hash de senhas), `cors`, `dotenv`
- **Documentação:** `swagger-ui-express` (especificação OpenAPI 3.0)
- **Testes & Desenvolvimento:** Jest, Supertest, Nodemon

---

## Estrutura de Diretórios

```text
GT - Projeto BackEnd/
├── src/
│   ├── config/
│   │   ├── config.js              # Configuração do Sequelize CLI por ambiente
│   │   ├── database.js            # Instância de conexão MySQL com Sequelize
│   │   └── swagger.js             # Especificação OpenAPI 3.0 da API
│   ├── controllers/
│   │   ├── categoryController.js  # Endpoints de categorias
│   │   ├── productController.js   # Endpoints de produtos
│   │   └── userController.js      # Endpoints de usuários e geração de token JWT
│   ├── database/
│   │   ├── migrations/            # 6 migrations ordenadas para criação das tabelas
│   │   └── seeders/               # Seeder inicial opcional (usuário e categorias demo)
│   ├── middleware/
│   │   ├── authMiddleware.js      # Validação do cabeçalho Authorization: Bearer <jwt>
│   │   └── errorMiddleware.js     # Tratamento global de erros HTTP e Sequelize
│   ├── models/
│   │   ├── Category.js
│   │   ├── Product.js
│   │   ├── ProductCategory.js
│   │   ├── ProductImage.js
│   │   ├── ProductOption.js
│   │   ├── User.js
│   │   └── index.js               # Registro de associações entre entidades
│   ├── routes/
│   │   ├── categoryRoutes.js
│   │   ├── productRoutes.js
│   │   ├── userRoutes.js
│   │   └── index.js
│   ├── services/
│   │   ├── categoryService.js
│   │   ├── mediaService.js        # Persistência de imagens Base64 em /media ou URL
│   │   ├── productService.js
│   │   └── userService.js
│   ├── utils/
│   │   ├── AppError.js            # Classe de erro operacional com status HTTP
│   │   └── queryParser.js         # Validação de limit, page, fields e IDs
│   ├── app.js                     # Configuração do Express, CORS, Swagger, /media e rotas
│   └── server.js                  # Conexão com MySQL e inicialização do servidor HTTP
├── tests/
│   ├── authMiddleware.test.js
│   ├── categoryRoutes.test.js
│   ├── productRoutes.test.js
│   ├── queryParser.test.js
│   ├── setup.js
│   └── userRoutes.test.js
├── .env.example                   # Modelo de variáveis de ambiente
├── .gitignore
├── .sequelizerc                   # Mapeamento de caminhos do Sequelize CLI
├── jest.config.js
├── package.json
├── projeto.md                     # Requisitos e critérios do projeto
└── README.md
```

---

## Modelagem do Banco de Dados

O banco relacional **MySQL** é composto por **6 tabelas** criadas via Migrations:

| Tabela | Colunas Principais | Observações |
| :--- | :--- | :--- |
| `users` | `id`, `firstname`, `surname`, `email`, `password`, `created_at`, `updated_at` | `email` único; `password` armazenada em hash `bcrypt` |
| `categories` | `id`, `name`, `slug`, `use_in_menu`, `created_at`, `updated_at` | `use_in_menu` padrão `false` (`0`) |
| `products` | `id`, `enabled`, `name`, `slug`, `use_in_menu`, `stock`, `description`, `price`, `price_with_discount`, `created_at`, `updated_at` | Valores padrão: `enabled=0`, `use_in_menu=0`, `stock=0` |
| `product_images` | `id`, `product_id`, `enabled`, `path` | Chave estrangeira para `products(id)` (`ON DELETE CASCADE`) |
| `product_options` | `id`, `product_id`, `title`, `shape`, `radius`, `type`, `values` | `shape`: `square`/`circle`; `type`: `text`/`color`; `values` separados por vírgula |
| `product_categories` | `product_id`, `category_id` | Tabela associativa `N:N` entre `products` e `categories` |

---

## Pré-requisitos

- **Node.js** `18+` e **npm** `9+`
- **MySQL Server** `8.0+` (ou `8.4+`) em execução

> **Uso local no drive `D:` (ambiente Windows):**
> Caso esteja utilizando o MySQL portátil configurado em `D:\Tools\mysql\mysql-8.4.9`, inicie o servidor antes de rodar a aplicação:
> ```powershell
> D:\Tools\mysql\mysql-8.4.9\bin\mysqld.exe --defaults-file="D:\Tools\mysql\my.ini" --console
> ```
> Ou execute o atalho `D:\Tools\mysql\start-mysql.bat`.

---

## Instalação e Execução Passo a Passo

1. **Clone o repositório e acesse a pasta:**
   ```bash
   git clone https://github.com/joaopmelosantos/gt-drip-store-backend.git
   cd gt-drip-store-backend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` a partir do `.env.example` e ajuste as credenciais conforme seu ambiente MySQL:
   ```env
   PORT=3000
   NODE_ENV=development
   APP_URL=http://localhost:3000

   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=drip_store
   DB_USER=root
   DB_PASS=

   JWT_SECRET=troque_esta_chave_secreta_em_producao
   JWT_EXPIRES_IN=1d
   ```

4. **Crie o banco de dados no MySQL:**
   ```sql
   CREATE DATABASE IF NOT EXISTS drip_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. **Execute as Migrations:**
   ```bash
   npm run db:migrate
   ```

6. *(Opcional)* **Popule dados iniciais de demonstração:**
   ```bash
   npm run db:seed
   ```
   > Cria o usuário `admin@dripstore.com` (senha `123@123`) e as categorias `Tênis`, `Camisetas` e `Ofertas`.

7. **Inicie o servidor:**
   ```bash
   # Desenvolvimento (com nodemon)
   npm run dev

   # Produção
   npm start
   ```

---

## Documentação da API (Swagger)

Com o servidor em execução:
- **Swagger UI:** `http://localhost:3000/api-docs`
- **Health Check:** `http://localhost:3000/health` *(retorna `200 { "status": "ok" }`)*

No Swagger UI, utilize o botão **Authorize** informando o token obtido em `POST /v1/user/token` para testar os endpoints protegidos.

---

## Referência dos Endpoints

> Todas as rotas protegidas exigem o cabeçalho: `Authorization: Bearer <jwt>`.

### Autenticação

| Método | Rota | Auth | Descrição | Status Codes |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/v1/user/token` | Não | Autentica com `email` e `password` e retorna `{ "token": "<JWT>" }` | `200`, `400` |

### Usuários

| Método | Rota | Auth | Descrição | Status Codes |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/v1/user/:id` | Não | Retorna `id`, `firstname`, `surname` e `email` | `200`, `400`, `404` |
| `POST` | `/v1/user` | Não | Cadastra usuário validando `confirmPassword` e salvando hash bcrypt | `201`, `400` |
| `PUT` | `/v1/user/:id` | Sim | Atualiza `firstname`, `surname` e `email` | `204`, `400`, `401`, `404` |
| `DELETE` | `/v1/user/:id` | Sim | Remove usuário pelo ID | `204`, `400`, `401`, `404` |

### Categorias

| Método | Rota | Auth | Descrição | Status Codes |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/v1/category/search` | Não | Lista categorias com `limit` (padrão `12`, `-1` para todos), `page`, `fields` e `use_in_menu` | `200`, `400` |
| `GET` | `/v1/category/:id` | Não | Retorna categoria pelo ID | `200`, `400`, `404` |
| `POST` | `/v1/category` | Sim | Cria categoria (`name`, `slug`, `use_in_menu`) | `201`, `400`, `401` |
| `PUT` | `/v1/category/:id` | Sim | Atualiza categoria existente | `204`, `400`, `401`, `404` |
| `DELETE` | `/v1/category/:id` | Sim | Remove categoria pelo ID | `204`, `400`, `401`, `404` |

### Produtos

| Método | Rota | Auth | Descrição | Status Codes |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/v1/product/search` | Não | Busca produtos com `limit`, `page`, `fields`, `match`, `category_ids`, `price-range` (`min-max`) e `option[id]=v1,v2` | `200`, `400` |
| `GET` | `/v1/product/:id` | Não | Retorna produto completo com `category_ids`, `images` e `options` | `200`, `400`, `404` |
| `POST` | `/v1/product` | Sim | Cria produto com associação de categorias, imagens (Base64/URL) e opções | `201`, `400`, `401` |
| `PUT` | `/v1/product/:id` | Sim | Atualiza produto, categorias e aplica criação/edição/remoção (`deleted: true`) em imagens e opções | `204`, `400`, `401`, `404` |
| `DELETE` | `/v1/product/:id` | Sim | Remove produto, vínculos e diretório local de mídias | `204`, `400`, `401`, `404` |

---

## Testes Automatizados

A suíte de testes com **Jest** e **Supertest** valida utilitários, middleware JWT e todos os endpoints HTTP (com mocks dos models Sequelize para execução rápida sem dependência de banco ativo):

```bash
npm test
```

Cobertura atual dos arquivos em `tests/`:
- `queryParser.test.js` — paginação (`limit`, `page`), projeção `fields` e validação de IDs.
- `authMiddleware.test.js` — ausência de token, formato inválido, token expirado/inválido e token válido.
- `userRoutes.test.js` — CRUD de usuários, criptografia bcrypt e emissão de token JWT.
- `categoryRoutes.test.js` — busca paginada, filtros e CRUD de categorias.
- `productRoutes.test.js` — busca avançada (`match`, `category_ids`, `price-range`, `option[id]`), criação transacional e atualização incremental de imagens/opções.

---

## Scripts Disponíveis

| Script | Comando | Descrição |
| :--- | :--- | :--- |
| `npm start` | `node src/server.js` | Inicia o servidor em modo produção |
| `npm run dev` | `nodemon src/server.js` | Inicia o servidor com recarregamento automático |
| `npm test` | `jest --runInBand` | Executa toda a suíte de testes Jest |
| `npm run test:watch` | `jest --watch` | Executa os testes em modo observação |
| `npm run db:migrate` | `sequelize-cli db:migrate` | Aplica todas as migrations no MySQL |
| `npm run db:migrate:undo` | `sequelize-cli db:migrate:undo:all` | Reverte todas as migrations |
| `npm run db:seed` | `sequelize-cli db:seed:all` | Executa os seeders iniciais no banco |

---

## Autor

- **João Paulo Melo dos Santos** — [GitHub](https://github.com/joaopmelosantos)

---

## Licença

Projeto desenvolvido para fins educacionais no programa **Geração Tech / Digital College**. Licença `ISC`.
