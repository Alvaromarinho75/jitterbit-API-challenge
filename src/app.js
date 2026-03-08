// Constantes e dependências iniciais
const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config(); // Carrega o arquivo .env

const app = express();
const PORT = process.env.PORT || 3000;

// Rota para os pedidos
const orderRoutes = require('./routes/orderRoutes');

connectDB(); // Conecta ao banco de dados antes de iniciar o servidor

// Middleware para entender JSON no body das requisições
app.use(express.json());

// Usamos as rotas de pedidos para qualquer requisição que começar com "/order"
app.use('/order', orderRoutes);

// Rota de teste básica
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'API online e funcionando!' });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});