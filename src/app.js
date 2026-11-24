const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const swaggerDocument = require('./config/swagger');
const errorMiddleware = require('./middleware/errorMiddleware');
const { MEDIA_ROOT } = require('./services/mediaService');
const AppError = require('./utils/AppError');

const app = express();

// Mantém chaves numéricas em colchetes (ex.: option[45]=GG,PP) como objeto, sem compactar como array
app.set('query parser', (rawQuery) => {
  const params = new URLSearchParams(rawQuery);
  const query = {};
  for (const [key, value] of params.entries()) {
    const bracketMatch = key.match(/^([^[]+)\[([^\]]+)\]$/);
    if (bracketMatch) {
      const [, root, subKey] = bracketMatch;
      if (!query[root] || typeof query[root] !== 'object') {
        query[root] = {};
      }
      query[root][subKey] = value;
    } else {
      query[key] = value;
    }
  }
  return query;
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/media', express.static(MEDIA_ROOT));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/v1', routes);

app.use((req, _res, next) => {
  next(new AppError(404, `Rota não encontrada: ${req.method} ${req.originalUrl}`));
});

app.use(errorMiddleware);

module.exports = app;
