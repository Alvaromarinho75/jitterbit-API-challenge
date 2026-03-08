const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Define a rota POST para criar o pedido
router.post('/', orderController.createOrder);

// Rota para listar todos os pedidos
router.get('/list', orderController.getAllOrders);

// Rota para buscar um pedido específico
router.get('/:id', orderController.getOrderById);

module.exports = router;