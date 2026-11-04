'use strict';
const Order = require('../models/Order');
const HttpError = require('../lib/HttpError');
const { mapCreateOrder, validateUpdateOrder } = require('../lib/order-validation');

exports.createOrder = async (req, res) => {
    const order = await Order.create(mapCreateOrder(req.body));
    res.status(201).location(`/order/${encodeURIComponent(order.orderId)}`).json(order);
};

exports.getAllOrders = async (req, res) => {
    const orders = await Order.find().sort({ orderId: 1 });
    res.status(200).json(orders);
};

exports.getOrderById = async (req, res) => {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) throw new HttpError(404, 'Pedido não encontrado.');
    res.status(200).json(order);
};

exports.updateOrder = async (req, res) => {
    const update = validateUpdateOrder(req.body);
    const order = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { $set: update },
        { returnDocument: 'after', runValidators: true },
    );
    if (!order) throw new HttpError(404, 'Pedido não encontrado.');
    res.status(200).json(order);
};

exports.deleteOrder = async (req, res) => {
    const order = await Order.findOneAndDelete({ orderId: req.params.id });
    if (!order) throw new HttpError(404, 'Pedido não encontrado.');
    res.status(200).json({ message: `Pedido ${req.params.id} deletado com sucesso!` });
};
