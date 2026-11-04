'use strict';
const mongoose = require('mongoose');
const { createApp } = require('./app');
const { getConfig } = require('./config/env');
const connectDB = require('./config/db');

async function startServer(config = getConfig(), { connect = connectDB, logger = console } = {}) {
    await connect(config.mongoUri);
    const app = createApp(config, { logger });
    const server = await new Promise((resolve, reject) => {
        const instance = app.listen(config.port, config.host, () => resolve(instance));
        instance.once('error', reject);
    });
    return server;
}

if (require.main === module) {
    require('dotenv').config({ quiet: true });
    startServer().then(server => {
        console.log(`API disponível em http://${server.address().address}:${server.address().port}`);
        let stopping = false;
        const shutdown = () => {
            if (stopping) return;
            stopping = true;
            const timer = setTimeout(() => process.exit(1), 10_000);
            timer.unref();
            server.close(async () => {
                await mongoose.disconnect();
                clearTimeout(timer);
            });
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }).catch(async error => {
        console.error('Falha ao iniciar a API. Confira a configuração e o acesso ao MongoDB.', { name: error.name });
        await mongoose.disconnect();
        process.exitCode = 1;
    });
}

module.exports = { startServer };
