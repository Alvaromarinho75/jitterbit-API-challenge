'use strict';
const jwt = require('jsonwebtoken');
const HttpError = require('../lib/HttpError');

module.exports = (req, res, next) => {
    const match = req.headers.authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match || match[1].length > 4096) throw new HttpError(401, 'Token Bearer não fornecido ou mal formatado.');
    const config = req.app.locals.config;
    try {
        const decoded = jwt.verify(match[1], config.jwtSecret, {
            algorithms: ['HS256'], issuer: 'jitterbit-order-api', audience: 'jitterbit-order-client',
        });
        if (typeof decoded !== 'object' || decoded.user !== config.authUsername || decoded.sub !== config.authUsername) {
            throw new Error('Invalid user');
        }
        req.user = decoded.user;
        next();
    } catch {
        throw new HttpError(401, 'Token inválido ou expirado.');
    }
};
