const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController'); 
const authMiddleware = require('../middlewares/authMiddleware'); 

// Aplica o middleware de autenticação para TODAS as rotas abaixo desta linha
router.use(authMiddleware);

// Define a rota POST para criar o pedido
router.post('/', orderController.createOrder);

// Rota para listar todos os pedidos
router.get('/list', orderController.getAllOrders);

// Rota para buscar um pedido específico
router.get('/:id', orderController.getOrderById);

// Rota para atualizar um pedido
router.put('/:id', orderController.updateOrder);

// Rota para deletar um pedido
router.delete('/:id', orderController.deleteOrder);

module.exports = router;