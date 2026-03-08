const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // O token vem no header da requisição
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Token não fornecido. Acesso negado." });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
        return res.status(401).json({ message: "Erro no formato do Token." });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ message: "Token mal formatado." });
    }

    // Verifica se o token é válido e não expirou usando a senha do .env
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Token inválido ou expirado." });
        }
        
        // Se deu tudo certo, deixa a requisição passar
        req.user = decoded.user;
        return next();
    });
};