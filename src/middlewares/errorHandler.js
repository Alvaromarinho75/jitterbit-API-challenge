'use strict';
const HttpError = require('../lib/HttpError');

module.exports = (error, req, res, next) => {
    if (res.headersSent) return next(error);
    let status = 500;
    let message = 'Erro interno ao processar a solicitação.';
    let details;
    if (error instanceof HttpError) {
        ({ status, message, details } = error);
    } else if (error.code === 11000) {
        status = 409; message = 'Já existe um pedido com esse numeroPedido.';
    } else if (error.type === 'entity.parse.failed') {
        status = 400; message = 'O corpo deve conter JSON válido.';
    } else if (error.type === 'entity.too.large') {
        status = 413; message = 'Corpo da requisição acima do limite de 100 KB.';
    } else if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) {
        status = 400; message = 'Dados do pedido inválidos.';
    } else if (['MongoNetworkError', 'MongoServerSelectionError', 'MongooseServerSelectionError'].includes(error.name)) {
        status = 503; message = 'Banco de dados indisponível.';
    }
    if (status === 500) req.app.locals.logger.error('Erro inesperado na API.', { name: error.name, code: error.code });
    res.status(status).json({ message, ...(details && { details }) });
};
