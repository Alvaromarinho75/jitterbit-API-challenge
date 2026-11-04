'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { resolve } = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getConfig } = require('../src/config/env');
const connectDB = require('../src/config/db');
const { createApp } = require('../src/app');
const { startServer } = require('../src/server');
const Order = require('../src/models/Order');

let mongo, server, origin, config, token;
const loggedErrors = [];
const payload = (id = 'v10089015vdb-01') => ({ numeroPedido: id, valorTotal: 10000, dataCriacao: '2023-07-19T12:24:11.529Z', items: [{ idItem: '2434', quantidadeItem: 1, valorItem: 1000 }] });

async function request(path, { method = 'GET', body, auth = token, headers = {} } = {}) {
    const response = await fetch(origin + path, {
        method,
        headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(auth && { Authorization: `Bearer ${auth}` }), ...headers },
        ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : null };
}

before(async () => {
    // Always create a new test-only database. Never read MONGO_URI or .env here.
    mongo = await MongoMemoryServer.create({
        binary: { version: '8.2.6', downloadDir: resolve(__dirname, '../.cache/mongodb') },
        instance: { ip: '127.0.0.1', dbName: 'orders-integration' },
    });
    config = { ...getConfig({ MONGO_URI: mongo.getUri(), JWT_SECRET: randomBytes(48).toString('hex'), AUTH_USERNAME: 'test-user', AUTH_PASSWORD: 'fictional-test-password' }), port: 0 };
    server = await startServer(config, { logger: { error: (...args) => loggedErrors.push(args) } });
    origin = `http://127.0.0.1:${server.address().port}`;
    const login = await request('/auth/login', { method: 'POST', auth: null, body: { username: config.authUsername, password: config.authPassword } });
    assert.equal(login.status, 200);
    token = login.data.token;
});

after(async () => {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await mongoose.disconnect();
    await mongo?.stop();
});

test('health só informa sucesso com MongoDB conectado e não expõe credenciais', async () => {
    const result = await request('/health', { auth: null });
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, { status: 'ok', database: 'connected' });
    assert.equal(result.headers.get('x-powered-by'), null);
    assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('login rejeita credenciais erradas, corpos inválidos e a antiga senha fixa', async () => {
    for (const body of [{ username: 'admin', password: '123456' }, { username: config.authUsername, password: 'wrong' }, { username: 'wrong', password: config.authPassword }]) {
        assert.equal((await request('/auth/login', { method: 'POST', auth: null, body })).status, 401);
    }
    for (const body of [{}, { username: 5, password: [] }, { username: 'x', password: 'x', admin: true }]) {
        assert.equal((await request('/auth/login', { method: 'POST', auth: null, body })).status, 400);
    }
});

test('todas as operações de pedidos exigem autenticação', async () => {
    for (const [method, path, body] of [['POST', '/order', payload()], ['GET', '/order/list'], ['GET', '/order/absent'], ['PUT', '/order/absent', { value: 1 }], ['DELETE', '/order/absent']]) {
        assert.equal((await request(path, { method, body, auth: null })).status, 401);
    }
});

test('token expirado, adulterado, algoritmo/issuer/audience/usuário incorretos são recusados', async () => {
    const options = { algorithm: 'HS256', issuer: 'jitterbit-order-api', audience: 'jitterbit-order-client', subject: config.authUsername, expiresIn: '1h' };
    const tokens = [
        'not-a-token',
        jwt.sign({ user: config.authUsername }, 'different-secret', options),
        jwt.sign({ user: config.authUsername }, config.jwtSecret, { ...options, expiresIn: -1 }),
        jwt.sign({ user: config.authUsername }, config.jwtSecret, { ...options, algorithm: 'HS384' }),
        jwt.sign({ user: config.authUsername }, config.jwtSecret, { ...options, issuer: 'wrong' }),
        jwt.sign({ user: config.authUsername }, config.jwtSecret, { ...options, audience: 'wrong' }),
        jwt.sign({ user: 'another-user' }, config.jwtSecret, options),
    ];
    for (const auth of tokens) assert.equal((await request('/order/list', { auth })).status, 401);
    for (const header of ['Basic abc', 'Bearer', `Bearer ${token} extra`]) {
        assert.equal((await request('/order/list', { headers: { Authorization: header } })).status, 401);
    }
});

test('POST persiste em MongoDB real, faz mapping e fornece Location', async () => {
    const result = await request('/order', { method: 'POST', body: payload() });
    assert.equal(result.status, 201);
    assert.equal(result.headers.get('location'), '/order/v10089015vdb-01');
    assert.equal(result.data.orderId, 'v10089015vdb-01');
    assert.equal(result.data.value, 10000);
    assert.equal(result.data.items[0].productId, 2434);
    assert.equal(result.data.items[0].quantity, 1);
    assert.equal(result.data.creationDate, payload().dataCriacao);
    assert.equal(result.data.numeroPedido, undefined);
    const stored = await Order.findOne({ orderId: result.data.orderId }).lean();
    assert.equal(stored.items[0].price, 1000);
});

test('índice único recusa pedidos duplicados com 409, inclusive criações concorrentes', async () => {
    const duplicate = await request('/order', { method: 'POST', body: payload() });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.data.error, undefined);
    const results = await Promise.all([1, 2].map(() => request('/order', { method: 'POST', body: payload('concurrent-001') })));
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    assert.equal(await Order.countDocuments({ orderId: 'concurrent-001' }), 1);
});

test('POST rejeita payloads inválidos sem persistir os dados', async () => {
    const before = await Order.countDocuments();
    for (const body of [null, [], {}, { ...payload('invalid'), items: [] }, { ...payload('invalid'), items: [{ idItem: '1', quantidadeItem: -1, valorItem: 10 }] }, { ...payload('invalid'), dataCriacao: '2026-02-30T00:00:00Z' }, { ...payload('invalid'), valorTotal: -1 }, { ...payload('invalid'), $set: { value: 1 } }]) {
        assert.equal((await request('/order', { method: 'POST', body })).status, 400);
    }
    assert.equal(await Order.countDocuments(), before);
});

test('GET busca por orderId e list mantém o contrato em array', async () => {
    const order = await request('/order/v10089015vdb-01');
    assert.equal(order.status, 200);
    const listed = await request('/order/list');
    assert.equal(listed.status, 200);
    assert.ok(Array.isArray(listed.data));
    assert.equal(listed.data.length, 2);
    assert.deepEqual(listed.data.map(order => order.orderId), ['concurrent-001', 'v10089015vdb-01']);
});

test('PUT parcial atualiza campos EN com validação e conserva os demais', async () => {
    const updated = await request('/order/v10089015vdb-01', { method: 'PUT', body: { value: 50000 } });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.value, 50000);
    assert.equal(updated.data.orderId, 'v10089015vdb-01');
    assert.equal(updated.data.creationDate, payload().dataCriacao);
    assert.equal(updated.data.items[0].productId, 2434);
    const items = [{ productId: '22', quantity: 2, price: 5 }];
    const changed = await request('/order/v10089015vdb-01', { method: 'PUT', body: { items } });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.items[0].productId, 22);
    assert.equal((await Order.findOne({ orderId: 'v10089015vdb-01' })).items[0].quantity, 2);
});

test('PUT recusa operadores, identidade, campos desconhecidos e valores inválidos', async () => {
    for (const body of [{ orderId: 'other' }, { $inc: { value: 1 } }, { valorTotal: 1 }, { value: -1 }, { items: [] }, { value: 2, __v: 9 }, {}]) {
        assert.equal((await request('/order/v10089015vdb-01', { method: 'PUT', body })).status, 400);
    }
    assert.equal((await Order.findOne({ orderId: 'v10089015vdb-01' })).value, 50000);
});

test('defesas do modelo também validam atualização direta fora do HTTP', async () => {
    await assert.rejects(Order.findOneAndUpdate({ orderId: 'v10089015vdb-01' }, { $set: { value: -2 } }, { runValidators: true }), { name: 'ValidationError' });
});

test('pedidos ausentes e IDs malformados têm 404 e 400 consistentes', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
        assert.equal((await request('/order/absent', { method, ...(method === 'PUT' && { body: { value: 1 } }) })).status, 404);
    }
    assert.equal((await request('/order/bad%20id')).status, 400);
    assert.equal((await request('/unknown', { auth: null })).status, 404);
});

test('DELETE remove o documento e a consulta seguinte retorna 404', async () => {
    assert.equal((await request('/order/v10089015vdb-01', { method: 'DELETE' })).status, 200);
    assert.equal(await Order.countDocuments({ orderId: 'v10089015vdb-01' }), 0);
    assert.equal((await request('/order/v10089015vdb-01')).status, 404);
});

test('JSON quebrado e corpos grandes retornam erro JSON sem detalhes internos', async () => {
    const response = await fetch(origin + '/order', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{broken' });
    assert.equal(response.status, 400);
    const error = await response.json();
    assert.deepEqual(Object.keys(error), ['message']);
    const oversized = await request('/order', { method: 'POST', body: { padding: 'x'.repeat(110000) } });
    assert.equal(oversized.status, 413);
});

test('erros inesperados não vazam stack, dados ou mensagens internas', async () => {
    const original = Order.find;
    try {
        Order.find = () => { throw new Error('private-connection-and-password'); };
        const result = await request('/order/list');
        assert.equal(result.status, 500);
        assert.deepEqual(result.data, { message: 'Erro interno ao processar a solicitação.' });
        assert.equal(loggedErrors.length, 1);
        assert.doesNotMatch(JSON.stringify(loggedErrors), /private-connection-and-password/);
    } finally { Order.find = original; }
});

test('limite de login funciona com Retry-After, sem depender de serviço externo', async () => {
    const limited = createApp(config, { loginLimit: 2 });
    const local = await new Promise(resolve => { const instance = limited.listen(0, '127.0.0.1', () => resolve(instance)); });
    try {
        const login = () => fetch(`http://127.0.0.1:${local.address().port}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'wrong', password: 'wrong' }) });
        for (let i = 0; i < 2; i++) { const response = await login(); assert.equal(response.status, 401); await response.arrayBuffer(); }
        const response = await login();
        assert.equal(response.status, 429);
        assert.ok(Number(response.headers.get('retry-after')) > 0);
        assert.match((await response.json()).message, /Muitas tentativas/);
    } finally { await new Promise(resolve => local.close(resolve)); }
});

test('OpenAPI e Swagger são acessíveis sem token e usam a origem atual', async () => {
    const result = await request('/openapi.json', { auth: null });
    assert.equal(result.status, 200);
    assert.equal(result.data.servers[0].url, '/');
    const response = await fetch(origin + '/api-docs/');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Swagger UI/);
});

test('health e pedidos retornam 503 se a conexão cair', async () => {
    await mongoose.disconnect();
    try {
        assert.equal((await request('/health', { auth: null })).status, 503);
        assert.equal((await request('/order/list')).status, 503);
    } finally { await connectDB(config.mongoUri); }
});
