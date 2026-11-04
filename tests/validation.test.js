'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { getConfig } = require('../src/config/env');
const { mapCreateOrder, validateUpdateOrder } = require('../src/lib/order-validation');
const { startServer } = require('../src/server');

const environment = () => ({ MONGO_URI: 'mongodb://127.0.0.1:27017/test', JWT_SECRET: 'test-secret-with-at-least-thirty-two-bytes', AUTH_USERNAME: 'demo', AUTH_PASSWORD: 'local-test-password' });
const payload = () => ({ numeroPedido: 'test-001', valorTotal: 10000, dataCriacao: '2023-07-19T12:24:11.529Z', items: [{ idItem: '2434', quantidadeItem: 1, valorItem: 1000 }] });

test('configuração exige variáveis explícitas e não inclui valores secretos nos erros', () => {
    const config = getConfig(environment());
    assert.equal(config.port, 3000);
    assert.equal(config.host, '127.0.0.1');
    for (const name of ['MONGO_URI', 'JWT_SECRET', 'AUTH_USERNAME', 'AUTH_PASSWORD']) {
        const env = environment(); delete env[name];
        assert.throws(() => getConfig(env), error => error.message.includes(name) && !error.message.includes('local-test-password'));
    }
});

test('configuração rejeita porta, URI e credenciais inadequadas', () => {
    for (const patch of [{ PORT: '0' }, { PORT: '65536' }, { PORT: 'abc' }, { PORT: '' }, { MONGO_URI: 'https://example.test' }, { JWT_SECRET: 'short' }, { AUTH_PASSWORD: '123456' }, { AUTH_USERNAME: ' demo ' }, { AUTH_USERNAME: 'a'.repeat(65) }]) {
        assert.throws(() => getConfig({ ...environment(), ...patch }));
    }
});

test('mapping converte entrada PT para EN sem alterar o payload nem recalcular o total', () => {
    const input = payload(); const copy = structuredClone(input);
    const output = mapCreateOrder(input);
    assert.deepEqual(input, copy);
    assert.equal(output.orderId, 'test-001');
    assert.equal(output.value, 10000);
    assert.equal(output.items[0].productId, 2434);
    assert.equal(output.items[0].quantity, 1);
    assert.equal(output.items[0].price, 1000);
    assert.equal(output.creationDate.toISOString(), input.dataCriacao);
});

test('datas exigem calendário existente e fuso; aceitam ano bissexto e offset explícito', () => {
    for (const date of ['2026-02-30T00:00:00Z', '2025-02-29T00:00:00Z', '2026-06-31T00:00:00Z', '2026-11-04', '2026-11-04T10:00:00', '2026-13-01T00:00:00Z', '2026-11-04T25:00:00Z', '2026-11-04T10:00:00.1234Z', 'not-a-date']) {
        assert.throws(() => mapCreateOrder({ ...payload(), dataCriacao: date }), { status: 400 });
    }
    assert.equal(mapCreateOrder({ ...payload(), dataCriacao: '2024-02-29T10:00:00-03:00' }).creationDate.toISOString(), '2024-02-29T13:00:00.000Z');
});

test('validação rejeita números não finitos, itens inválidos e identificadores reservados', () => {
    for (const patch of [{ valorTotal: NaN }, { valorTotal: Infinity }, { valorTotal: -1 }, { valorTotal: '10' }, { numeroPedido: 'list' }, { numeroPedido: 'LIST' }, { numeroPedido: 'a/b' }, { numeroPedido: '' }, { numeroPedido: 'a'.repeat(101) }, { items: [] }, { items: 'invalid' }, { items: [null] }, { items: Array(101).fill(payload().items[0]) }, { items: [{ idItem: '12bad', quantidadeItem: 1, valorItem: 0 }] }, { items: [{ idItem: '9007199254740992', quantidadeItem: 1, valorItem: 0 }] }, { items: [{ idItem: '1', quantidadeItem: 1.5, valorItem: 0 }] }, { items: [{ idItem: '1', quantidadeItem: 0, valorItem: 0 }] }]) {
        assert.throws(() => mapCreateOrder({ ...payload(), ...patch }), { status: 400 });
    }
    for (const body of [null, [], 'text', {}, { ...payload(), extra: true }]) assert.throws(() => mapCreateOrder(body), { status: 400 });
});

test('PUT parcial aceita apenas campos EN, sem operadores ou mudança de identidade', () => {
    assert.deepEqual(validateUpdateOrder({ value: 0 }), { value: 0 });
    for (const body of [{}, null, [], { orderId: 'other' }, { $set: { value: 1 } }, { valorTotal: 2 }, { value: -1 }, { items: [] }, { value: 1, unexpected: true }]) {
        assert.throws(() => validateUpdateOrder(body), { status: 400 });
    }
    assert.deepEqual(validateUpdateOrder({ items: [{ productId: '10', quantity: 2, price: 5 }] }), { items: [{ productId: 10, quantity: 2, price: 5 }] });
});

test('falha ao conectar é propagada antes de abrir o servidor HTTP', async () => {
    const failure = new Error('connection failed');
    await assert.rejects(startServer(getConfig(environment()), { connect: async () => { throw failure; } }), error => error === failure);
});

test('OpenAPI é válido e documenta todo o contrato HTTP', async () => {
    const spec = await SwaggerParser.validate(require('node:path').resolve(__dirname, '../src/swagger.json'));
    assert.equal(spec.openapi, '3.0.3');
    for (const route of ['/health', '/auth/login', '/order', '/order/list', '/order/{id}']) assert.ok(spec.paths[route]);
    assert.deepEqual(spec.paths['/auth/login'].post.security, []);
    assert.ok(spec.paths['/order'].post.responses['409']);
    assert.ok(spec.paths['/order/{id}'].put.requestBody);
});
