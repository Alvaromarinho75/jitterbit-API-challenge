const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Define a rota POST para criar o pedido
router.post('/', orderController.createOrder);

module.exports = router;