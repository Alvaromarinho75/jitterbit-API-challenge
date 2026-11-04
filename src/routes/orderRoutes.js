'use strict';
const express = require('express');
const mongoose = require('mongoose');
const controller = require('../controllers/orderController');
const auth = require('../middlewares/authMiddleware');
const HttpError = require('../lib/HttpError');
const { validateOrderId } = require('../lib/order-validation');
const router = express.Router();

router.use(auth);
router.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) throw new HttpError(503, 'Banco de dados indisponível.');
    next();
});
router.param('id', (req, res, next, id) => { validateOrderId(id); next(); });
router.post('/', controller.createOrder);
router.get('/list', controller.getAllOrders);
router.get('/:id', controller.getOrderById);
router.put('/:id', controller.updateOrder);
router.delete('/:id', controller.deleteOrder);
module.exports = router;
