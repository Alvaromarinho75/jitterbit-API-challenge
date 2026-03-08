const mongoose = require('mongoose');

// Esquema dos itens
const itemSchema = new mongoose.Schema({
    productId: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
});

// Esquema dos pedidos
const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true // Garante que não terá dois pedidos com o mesmo número no banco
    },
    value: {
        type: Number,
        required: true
    },
    creationDate: {
        type: Date,
        required: true
    },
    items: [itemSchema] // O array de itens usando a estrutura criada ali em cima
});

// Exporta o modelo para usar nas rotas na próxima fase
module.exports = mongoose.model('Order', orderSchema);