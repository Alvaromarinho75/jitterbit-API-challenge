'use strict';
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { login } = require('../controllers/authController');

module.exports = function createAuthRoutes({ loginLimit = 10 } = {}) {
    const router = express.Router();
    router.post('/login', rateLimit({
        windowMs: 60_000,
        limit: loginLimit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { message: 'Muitas tentativas de login. Tente novamente em um minuto.' },
    }), login);
    return router;
};
