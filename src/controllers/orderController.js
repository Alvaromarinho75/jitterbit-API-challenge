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
        // Tratamento de erro geral
        res.status(400).json({ 
            message: "Erro ao processar o pedido. Verifique os dados enviados.", 
            error: error.message 
        });
    }
};

// Função para listar TODOS os pedidos
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find(); // Busca tudo no MongoDB
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar a lista de pedidos.", error: error.message });
    }
};

// Função para buscar um pedido específico pelo orderId 
exports.getOrderById = async (req, res) => {
    try {
        // Pega o ID que vem na URL (ex: /order/v10089015vdb-01)
        const orderIdParams = req.params.id; 
        
        // Busca no banco onde o campo "orderId" seja igual ao passado na URL
        const order = await Order.findOne({ orderId: orderIdParams });

        // Se não achar nada, retorna erro 404 (Not Found)
        if (!order) {
            return res.status(404).json({ message: "Pedido não encontrado." });
        }

        res.status(200).json(order);
    } catch (error) {
        // Tratamento de erro geral
        res.status(500).json({ message: "Erro interno ao buscar o pedido.", error: error.message });
    }
};

// Função para atualizar um pedido pelo orderId
exports.updateOrder = async (req, res) => {
    try {
        const orderIdParams = req.params.id;
        const updateData = req.body;

        // Busca pelo orderId, aplica as mudanças e devolve o pedido atualizado. 
        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: orderIdParams },
            updateData,
            { new: true }
        );

        // Se não achar o pedido para atualizar, retorna erro 404 (Not Found)
        if (!updatedOrder) {
            return res.status(404).json({ message: "Pedido não encontrado para atualização." });
        }

        res.status(200).json(updatedOrder);
    } catch (error) {
        // Tratamento de erro geral
        res.status(400).json({ message: "Erro ao atualizar o pedido.", error: error.message });
    }
};

// Função para deletar um pedido pelo orderId
exports.deleteOrder = async (req, res) => {
    try {
        const orderIdParams = req.params.id;

        // Busca pelo orderId e remove do MongoDB
        const deletedOrder = await Order.findOneAndDelete({ orderId: orderIdParams });
        
        // Se não achar o pedido para deletar, retorna erro 404 (Not Found)
        if (!deletedOrder) {
            return res.status(404).json({ message: "Pedido não encontrado para exclusão." });
        }

        res.status(200).json({ message: `Pedido ${orderIdParams} deletado com sucesso!` });
    } catch (error) {
        // Tratamento de erro geral
        res.status(500).json({ message: "Erro ao deletar o pedido.", error: error.message });
    }
};