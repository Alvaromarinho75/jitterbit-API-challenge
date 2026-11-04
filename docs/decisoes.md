# Decisões e limites da revisão

## Problemas encontrados e correções

| Antes | Agora | Evidência |
| --- | --- | --- |
| listen iniciava sem aguardar connectDB | Conexão e índice único concluídos antes da porta HTTP | Falha de conexão propagada; CRUD real em banco temporário |
| admin/123456 no código | Conta e segredo obrigatórios no ambiente; sem credenciais padrão | Testes de login, configuração e JWT |
| PUT entregava req.body ao MongoDB, sem runValidators | Allowlist de campos EN, $set construído no servidor e runValidators | Rejeição de operadores, campos extras, identidade e valores negativos |
| items.map falhava com corpos inválidos | Validação explícita de objeto, campos, números, datas e itens | Casos unitários e HTTP sem persistência em erro |
| Erros do driver eram enviados ao cliente | Respostas JSON sanitizadas e status específicos | Teste de erro interno, JSON inválido e duplicidade real |
| Health sempre dizia online | 200/503 conforme estado da conexão | Teste após desconexão real |
| npm test era apenas um placeholder | 26 testes com MongoDB temporário e OpenAPI validado | npm run check |
| Dependências de instalação no Git | Removidas do índice, mantidas pelo lockfile | git ls-files node_modules vazio |

## Compatibilidade deliberada

As rotas `/order`, `/order/list`, `/order/:id` e `/auth/login` continuam disponíveis, com os mesmos métodos e formato básico de resposta. O POST continua recebendo português e respondendo inglês. O PUT continua parcial e em inglês, como no Swagger original. Ao atualizar itens, a lista é substituída, sem mesclar posições.

A validação agora é mais estrita: tipos incorretos, pedidos sem itens, datas impossíveis, valores negativos, campos não documentados, operadores MongoDB e mudança de `orderId` são recusados. `list` é reservado porque colide com a rota de listagem, que não diferencia caixa. Pedidos existentes com esse ID exigiriam migração antes de uma implantação real; o projeto não encontrou nem acessou banco de usuários.

JWTs anteriores precisam ser reemitidos: a revisão usa HS256 explicitamente e valida emissor, audiência, usuário e subject. A antiga conta fixa foi removida. Os campos de ambiente novos e o arquivo de entrada `src/server.js` estão documentados. `/health` pode responder 503; isso é intencional. Duplicidade é 409 e indisponibilidade não é disfarçada como erro de validação 400.

## Dados e testes

Os testes nunca carregam `.env` nem utilizam a MONGO_URI do usuário. Criam uma instância própria com MongoMemoryServer, verificam os documentos persistidos, índice único e corrida de duplicação, e encerram o processo ao final. A única substituição de método de modelo simula uma falha inesperada para verificar que a resposta e os logs não expõem sua mensagem. O fluxo CRUD não usa um banco simulado em JavaScript.

O valor total é preservado, mesmo quando difere da soma dos itens, porque o exercício original não define moeda, arredondamento ou conciliação. IDs de produto continuam numéricos, conforme o schema original; strings decimais são normalizadas. Não se presume suporte a identificadores alfanuméricos ou a zeros à esquerda.

## Limites para uma implantação real

Conta única não equivale a um cadastro de usuários. Não há papéis, multi-tenant, tokens de atualização/revogação, paginação ou pagamentos. O rate limit é local por processo, com trust proxy desativado. Uma implantação atrás de proxy precisa configurar conscientemente IPs confiáveis e armazenamento distribuído, sem aceitar qualquer X-Forwarded-For. A API não configura TLS; um ambiente exposto precisa de HTTPS e operação adequada.

Credenciais ficam no ambiente, sem gerenciamento completo de usuários. Não foram inseridos segredos no Git, configurado banco remoto ou publicado um serviço de produção. Os READMEs PT/EN e o OpenAPI descrevem o comportamento implementado, sem prometer infraestrutura inexistente.

## Referências de implementação

- [Express 5: tratamento de erros](https://expressjs.com/en/5x/guide/error-handling/): rejeições dos handlers async seguem para o middleware de erro.
- [Mongoose: validação](https://mongoosejs.com/docs/validation): unique é índice de banco; validação de updates precisa ser habilitada.
- [MongoDB Memory Server](https://typegoose.github.io/mongodb-memory-server/): processo temporário utilizado pelos testes.
- [express-rate-limit](https://express-rate-limit.mintlify.app/): limite de tentativas de login em memória.
