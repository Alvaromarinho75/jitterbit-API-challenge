'use strict';
const HttpError = require('./HttpError');

function invalid(field, message) {
    throw new HttpError(400, 'Dados do pedido inválidos.', [{ field, message }]);
}

function object(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        invalid(field, 'Informe um objeto JSON.');
    }
}

function keys(value, allowed, field) {
    object(value, field);
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key)) invalid(field ? `${field}.${key}` : key, 'Campo não permitido.');
    }
}

function number(value, field, { integer = false, positive = false } = {}) {
    if (typeof value !== 'number' || !Number.isFinite(value)
        || (integer && !Number.isSafeInteger(value)) || (positive ? value <= 0 : value < 0)) {
        invalid(field, integer ? 'Informe um inteiro positivo seguro.' : 'Informe um número finito não negativo.');
    }
    return value;
}

function validateOrderId(value, field = 'id') {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value)
        || value.toLowerCase() === 'list') {
        invalid(field, 'Use de 1 a 100 letras, números, pontos, traços ou sublinhados; list é reservado.');
    }
    return value;
}

function date(value, field) {
    const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);
    if (!match) invalid(field, 'Informe data e hora ISO 8601 com fuso horário.');
    const [, year, month, day, hour, minute, second] = match.map((part, index) => index > 0 && index < 7 ? Number(part) : part);
    const calendar = new Date(0);
    calendar.setUTCFullYear(year, month, 0);
    const days = calendar.getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > days || hour > 23 || minute > 59 || second > 59 || !Number.isFinite(Date.parse(value))) {
        invalid(field, 'Informe uma data e hora existentes.');
    }
    return new Date(value);
}

function items(value, external) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
        invalid('items', 'Informe de 1 a 100 itens.');
    }
    return value.map((item, index) => {
        const field = `items[${index}]`;
        const names = external ? ['idItem', 'quantidadeItem', 'valorItem'] : ['productId', 'quantity', 'price'];
        keys(item, names, field);
        let productId = item[names[0]];
        if (typeof productId === 'string' && /^\d+$/.test(productId)) productId = Number(productId);
        return {
            productId: number(productId, `${field}.${names[0]}`, { integer: true, positive: true }),
            quantity: number(item[names[1]], `${field}.${names[1]}`, { integer: true, positive: true }),
            price: number(item[names[2]], `${field}.${names[2]}`),
        };
    });
}

function mapCreateOrder(payload) {
    keys(payload, ['numeroPedido', 'valorTotal', 'dataCriacao', 'items'], '');
    return {
        orderId: validateOrderId(payload.numeroPedido, 'numeroPedido'),
        value: number(payload.valorTotal, 'valorTotal'),
        creationDate: date(payload.dataCriacao, 'dataCriacao'),
        items: items(payload.items, true),
    };
}

// Preserve the original partial PUT contract in English; IDs cannot be changed.
function validateUpdateOrder(payload) {
    keys(payload, ['value', 'creationDate', 'items'], '');
    if (Object.keys(payload).length === 0) invalid('body', 'Informe ao menos um campo para atualizar.');
    const update = {};
    if (Object.hasOwn(payload, 'value')) update.value = number(payload.value, 'value');
    if (Object.hasOwn(payload, 'creationDate')) update.creationDate = date(payload.creationDate, 'creationDate');
    if (Object.hasOwn(payload, 'items')) update.items = items(payload.items, false);
    return update;
}

module.exports = { mapCreateOrder, validateUpdateOrder, validateOrderId };
