# Jitterbit - Desafio Técnico API

Esta é uma API RESTful desenvolvida em Node.js para o desafio prático de Integração de Sistemas da Jitterbit. O objetivo principal do projeto é gerenciar pedidos (CRUD) e realizar o *mapping* (transformação) dos dados de entrada, convertendo o payload recebido em português para um schema estruturado em inglês antes da persistência no banco de dados.

## 🚀 Tecnologias Utilizadas
- **Node.js** com **Express** (Framework base)
- **MongoDB** com **Mongoose** (Persistência de dados em formato BSON/JSON)
- **JSON Web Token (JWT)** (Autenticação e segurança das rotas)
- **Swagger UI** (Documentação interativa da API)
- **Dotenv** (Gerenciamento de variáveis de ambiente)

## ✅ Funcionalidades Implementadas
- [x] Criação de pedido com tradução de campos (PT -> EN).
- [x] Busca de pedido específico através do `orderId`.
- [x] Listagem geral de pedidos cadastrados.
- [x] Atualização de dados de um pedido (`PUT`).
- [x] Exclusão de pedidos (`DELETE`).
- [x] Tratamento robusto de exceções e uso correto dos Status Codes HTTP.
- [x] **Bônus:** Rotas de pedido protegidas por autenticação JWT.
- [x] **Bônus:** Documentação completa da API via Swagger.

## 🛠️ Como executar o projeto localmente

1. Clone este repositório:
   git clone [https://github.com/SEU_USUARIO/jitterbit-API-challenge.git](https://github.com/SEU_USUARIO/jitterbit-API-challenge.git)

2. Acesse a pasta do projeto e instale as dependências:
    cd jitterbit-API-challenge
    npm install
3. Crie um arquivo .env na raiz do diretório e configure as variáveis de ambiente necessárias:
    PORT=3000
    MONGO_URI="sua_string_de_conexao_mongodb_atlas_aqui"
    JWT_SECRET="seu_segredo_para_gerar_os_tokens_aqui"
4. Inicie o servidor em modo de desenvolvimento:
    npm run dev

📄 Documentação (Swagger)

Com a aplicação em execução, acesse a documentação interativa pelo navegador para visualizar todos os endpoints, schemas esperados e testar as requisições:
👉 http://localhost:3000/api-docs

🔐 Testando a Autenticação
As rotas /order estão protegidas. Para realizar as requisições:

1. Faça um POST em /auth/login enviando as credenciais de teste (username: admin, password: 123456).

2. Copie o token retornado.

3. No Swagger (botão Authorize) ou no Postman/Thunder Client, adicione o token no formato Bearer para liberar o acesso aos endpoints.