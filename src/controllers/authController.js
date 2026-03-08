const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
    //  Recebe o usuário e senha que vieram no corpo da requisição
    const { username, password } = req.body;

    // Usuário para teste
    if (username === 'admin' && password === '123456') {
        // Se acertou a senha, geramos o Token JWT que expira em 1 hora
        const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        return res.status(200).json({ 
            message: "Autenticação bem-sucedida!", 
            token: token 
        });
    }

    // Se errou a senha
    res.status(401).json({ message: "Credenciais inválidas." });
};