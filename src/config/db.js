const mongoose = require('mongoose');
require('dotenv').config(); // Carrega o arquivo .env

const connectDB = async () => {
    try {
        // Tenta conectar no banco usando a URL que está no .env
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Erro ao conectar no MongoDB: ${error.message}`);
        process.exit(1); // Para o servidor se der erro na conexão com o banco
    }
};

module.exports = connectDB;