const Order = require('../models/Order');

// Cria um novo pedido
exports.createOrder = async (req, res) => {
    try {
        const payload = req.body;

        // Mapping dos dados do payload para o formato do nosso modelo de Pedido
        const mappedData = {
            orderId: payload.numeroPedido,
            value: payload.valorTotal,
            creationDate: payload.dataCriacao,
            items: payload.items.map(item => ({
                productId: item.idItem,
                quantity: item.quantidadeItem,
                price: item.valorItem
            }))
        };

        // Cria o pedido no banco de dados com os dados mapeados
        const newOrder = new Order(mappedData);
        const savedOrder = await newOrder.save();

        // Retorna status 201 (Created) em caso de sucesso
        res.status(201).json(savedOrder);

    } catch (error) {
        // Tratamento de erro
        res.status(400).json({ 
            message: "Erro ao processar o pedido. Verifique os dados enviados.", 
            error: error.message 
        });
    }
};