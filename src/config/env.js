'use strict';

function getConfig(env = process.env) {
    const required = ['MONGO_URI', 'JWT_SECRET', 'AUTH_USERNAME', 'AUTH_PASSWORD'];
    for (const name of required) {
        if (typeof env[name] !== 'string' || !env[name].trim()) {
            throw new Error(`Variável obrigatória ausente: ${name}.`);
        }
    }
    if (!/^mongodb(?:\+srv)?:\/\//.test(env.MONGO_URI)) {
        throw new Error('MONGO_URI deve usar mongodb:// ou mongodb+srv://.');
    }
    if (Buffer.byteLength(env.JWT_SECRET) < 32) {
        throw new Error('JWT_SECRET deve ter pelo menos 32 bytes.');
    }
    if (env.AUTH_USERNAME.length > 64 || env.AUTH_USERNAME !== env.AUTH_USERNAME.trim()) {
        throw new Error('AUTH_USERNAME deve ter até 64 caracteres, sem espaços nas extremidades.');
    }
    if (env.AUTH_PASSWORD.length < 12 || env.AUTH_PASSWORD.length > 256) {
        throw new Error('AUTH_PASSWORD deve ter entre 12 e 256 caracteres.');
    }
    const port = env.PORT === undefined ? 3000 : Number(env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT deve ser um inteiro entre 1 e 65535.');
    }
    return Object.freeze({
        host: env.HOST || '127.0.0.1',
        port,
        mongoUri: env.MONGO_URI,
        jwtSecret: env.JWT_SECRET,
        authUsername: env.AUTH_USERNAME,
        authPassword: env.AUTH_PASSWORD,
    });
}

module.exports = { getConfig };
