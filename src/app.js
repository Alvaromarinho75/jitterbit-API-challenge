'use strict';
const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const orderRoutes = require('./routes/orderRoutes');
const createAuthRoutes = require('./routes/authRoutes');
const errorHandler = require('./middlewares/errorHandler');
const HttpError = require('./lib/HttpError');

function createApp(config, { logger = console, loginLimit = 10 } = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.locals.config = config;
    app.locals.logger = logger;
    app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
    app.use(express.json({ limit: '100kb' }));
    app.get('/health', (req, res) => {
        const connected = mongoose.connection.readyState === 1;
        res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected' });
    });
    app.get('/openapi.json', (req, res) => res.json(swaggerDocument));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use('/auth', createAuthRoutes({ loginLimit }));
    app.use('/order', orderRoutes);
    app.use((req, res) => { throw new HttpError(404, 'Rota não encontrada.'); });
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
