'use strict';
const { createHash, timingSafeEqual } = require('node:crypto');
const jwt = require('jsonwebtoken');
const HttpError = require('../lib/HttpError');

function equal(actual, expected) {
    const hash = value => createHash('sha256').update(value).digest();
    return timingSafeEqual(hash(actual), hash(expected));
}

exports.login = (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).some(key => !['username', 'password'].includes(key))
        || typeof body.username !== 'string' || body.username.length < 1 || body.username.length > 64
        || typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 256) {
        throw new HttpError(400, 'Informe username e password como textos válidos.');
    }
    const config = req.app.locals.config;
    const userMatches = equal(body.username, config.authUsername);
    const passwordMatches = equal(body.password, config.authPassword);
    if (!userMatches || !passwordMatches) throw new HttpError(401, 'Credenciais inválidas.');

    const token = jwt.sign({ user: config.authUsername }, config.jwtSecret, {
        algorithm: 'HS256', expiresIn: '1h',
        issuer: 'jitterbit-order-api', audience: 'jitterbit-order-client', subject: config.authUsername,
    });
    res.status(200).json({ message: 'Autenticação bem-sucedida!', token });
};
