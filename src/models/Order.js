'use strict';
const mongoose = require('mongoose');

const finite = { validator: Number.isFinite, message: 'Informe um número finito.' };
const positiveInteger = { validator: value => Number.isSafeInteger(value) && value > 0, message: 'Informe um inteiro positivo seguro.' };
const itemSchema = new mongoose.Schema({
    productId: { type: Number, required: true, validate: positiveInteger },
    quantity: { type: Number, required: true, validate: positiveInteger },
    price: { type: Number, required: true, min: 0, validate: finite },
}, { strict: 'throw' });

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true, immutable: true, maxlength: 100 },
    value: { type: Number, required: true, min: 0, validate: finite },
    creationDate: { type: Date, required: true },
    items: {
        type: [itemSchema],
        required: true,
        validate: { validator: value => value.length >= 1 && value.length <= 100, message: 'Informe de 1 a 100 itens.' },
    },
}, { strict: 'throw', bufferCommands: false });

module.exports = mongoose.model('Order', orderSchema);
