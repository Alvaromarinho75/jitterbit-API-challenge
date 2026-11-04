# API de pedidos — desafio técnico Jitterbit

[English](README.en.md) · [Contrato OpenAPI](src/swagger.json) · [Exemplos HTTP](examples/requests.http) · [Decisões e limites](docs/decisoes.md)

[![CI](https://github.com/Alvaromarinho75/jitterbit-API-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/Alvaromarinho75/jitterbit-API-challenge/actions/workflows/ci.yml)

Projeto pessoal de **Álvaro Marinho**, desenvolvido a partir de um desafio técnico de integração de sistemas. A API recebe pedidos com campos em português, transforma esses dados para um modelo em inglês e persiste no MongoDB. O objetivo é demonstrar contrato HTTP, transformação de dados, validação, autenticação e testes de integração.

Não é uma API oficial da Jitterbit, serviço comercial ou sistema completo de gestão de pedidos. Os exemplos são fictícios. Não há demonstração pública hospedada; você pode executar localmente e explorar o Swagger.

## O que você pode avaliar

- CRUD de pedidos, preservando as rotas originais.
- Mapping explícito de entrada PT para persistência e resposta EN.
- Validação de tipos, datas existentes, itens e campos permitidos; o PUT não repassa operadores recebidos ao banco.
- Autenticação JWT de uma conta configurada no ambiente, com expiração e limite de tentativas de login.
- Inicialização somente após conexão e criação do índice único; saúde retorna 503 se a conexão cair.
- Testes HTTP com um processo MongoDB real, temporário e isolado, incluindo duplicidade concorrente.
- OpenAPI validado, exemplos reproduzíveis e CI em Linux e Windows.

## Executar localmente

Requisitos: **Node.js 24**, npm e um MongoDB acessível. O projeto usa CommonJS, Express 5, Mongoose 9 e JSON Web Token. Instale as dependências pelo lockfile:

```sh
git clone https://github.com/Alvaromarinho75/jitterbit-API-challenge.git
cd jitterbit-API-challenge
npm ci
```

Copie `.env.example` para `.env` (`Copy-Item .env.example .env` no PowerShell, ou `cp .env.example .env` no Bash) e preencha:

| Variável | Uso |
| --- | --- |
| `MONGO_URI` | MongoDB local ou instância de desenvolvimento autorizada. O exemplo aponta para `jitterbit-orders` local |
| `AUTH_USERNAME` | Usuário único desta demonstração; exemplo: `demo` |
| `AUTH_PASSWORD` | Senha definida por você, de 12 a 256 caracteres; sem valor padrão |
| `JWT_SECRET` | Segredo aleatório de pelo menos 32 bytes; sem valor padrão |
| `HOST` | Padrão `127.0.0.1`, para uso local; ajuste explicitamente se precisar expor o servidor |
| `PORT` | Padrão `3000`; de 1 a 65535 |

Para gerar um segredo local, execute e copie o resultado apenas para seu `.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Use uma instância MongoDB de desenvolvimento. Se já tiver Docker instalado, uma alternativa é `docker run --detach --name jitterbit-mongo --publish 127.0.0.1:27017:27017 mongo:8.2.6`. Esse comando cria uma instância local sem autenticação e sem volume de dados permanente, destinada somente ao exercício. Você também pode usar uma instalação MongoDB própria; não é necessário Docker para executar os testes.

```sh
npm run dev
# ou, sem watch:
npm start
```

- Swagger: [http://127.0.0.1:3000/api-docs/](http://127.0.0.1:3000/api-docs/)
- Contrato JSON: [http://127.0.0.1:3000/openapi.json](http://127.0.0.1:3000/openapi.json)
- Conexão do banco: [http://127.0.0.1:3000/health](http://127.0.0.1:3000/health)

A aplicação falha ao iniciar se faltar configuração ou se não conectar ao banco. Nenhuma porta HTTP é aberta antes disso. Ao usar outra porta, o Swagger utiliza a origem atual. `.env` e `node_modules` ficam fora do Git.

## Experimentar o fluxo principal

Os comandos abaixo são para Bash; no PowerShell, use `curl.exe` com o mesmo método e conteúdo, o Swagger ou o arquivo [examples/requests.http](examples/requests.http). Os valores são exemplos locais, não credenciais publicadas.

1. Faça login usando a senha definida no seu `.env`:

```sh
curl -X POST http://127.0.0.1:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"SUA_SENHA_LOCAL"}'
```

2. Copie o `token` retornado. No Swagger, clique em **Authorize** e cole somente o token; a interface acrescenta Bearer. No terminal, substitua `SEU_TOKEN`:

```sh
curl -X POST http://127.0.0.1:3000/order \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN' \
  --data-binary @examples/order.json

curl http://127.0.0.1:3000/order/list \
  -H 'Authorization: Bearer SEU_TOKEN'

curl http://127.0.0.1:3000/order/v10089015vdb-01 \
  -H 'Authorization: Bearer SEU_TOKEN'

curl -X PUT http://127.0.0.1:3000/order/v10089015vdb-01 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN' \
  --data-binary @examples/update-order.json

curl -X DELETE http://127.0.0.1:3000/order/v10089015vdb-01 \
  -H 'Authorization: Bearer SEU_TOKEN'
```

## Contrato e mapping

| Entrada de criação | Modelo e resposta |
| --- | --- |
| `numeroPedido` | `orderId` |
| `valorTotal` | `value` |
| `dataCriacao` | `creationDate` |
| `items[].idItem` | `items[].productId` |
| `items[].quantidadeItem` | `items[].quantity` |
| `items[].valorItem` | `items[].price` |

O POST exige todos os campos do exemplo. `orderId` tem de 1 a 100 caracteres alfanuméricos, ponto, traço ou sublinhado, começando por letra ou número; `list` é reservado sem distinguir maiúsculas/minúsculas. IDs numéricos de produto podem chegar como string decimal e são convertidos para inteiro positivo seguro, sem preservar zeros à esquerda. Quantidade é inteiro positivo; valor e preço são números finitos não negativos. Cada pedido aceita de 1 a 100 itens. Datas exigem calendário válido, segundos e fuso explícito, com até três casas de milissegundos.

**O PUT mantém o contrato parcial original em inglês:** aceita `value`, `creationDate` e/ou `items` (`productId`, `quantity`, `price`). Ao enviar `items`, substitui a lista inteira. `orderId`, campos extras e operadores como `$set`/`$inc` são recusados. Não foi convertido silenciosamente para uma substituição completa do recurso ou para entrada em português.

O total informado é armazenado sem recalcular ou exigir igualdade com a soma dos itens. O exercício não define moeda ou regra de conciliação. Não use os números JavaScript desta demonstração para afirmar precisão de um sistema financeiro. A resposta preserva os metadados MongoDB `_id` e `__v` e os `_id` dos itens.

| Método e rota | Sucesso | Observações |
| --- | --- | --- |
| `GET /health` | 200 | Público; 503 sem conexão ativa |
| `POST /auth/login` | 200 | Público; JWT válido por uma hora; 10 tentativas por IP/minuto |
| `POST /order` | 201 | Com JWT; inclui `Location`; duplicado retorna 409 |
| `GET /order/list` | 200 | Com JWT; array ordenado por `orderId`, sem paginação |
| `GET /order/:id` | 200 | Com JWT; ausente retorna 404 |
| `PUT /order/:id` | 200 | Com JWT; atualização parcial em inglês |
| `DELETE /order/:id` | 200 | Com JWT; remove o documento; ausente retorna 404 |

Erros retornam JSON com `message` e, na validação de pedidos, `details` com campo/motivo. Status: 400 para dados/JSON inválidos, 401 para autenticação, 404 para ausência, 409 para duplicidade, 413 para corpo acima de 100 KB, 429 para limite de login e 500/503 para falha interna/indisponibilidade. Mensagens internas e stack não são devolvidas ao cliente.

## Verificar

```sh
npm run check
npm run test:coverage
npm audit
```

`check` verifica sintaxe e executa **26 testes** de validação, configuração, OpenAPI e HTTP/persistência. Os testes iniciam seu próprio MongoDB 8.2.6 em porta local aleatória, usam credenciais fictícias e descartam a instância ao encerrar. **Não carregam seu `.env`, não usam `MONGO_URI` do ambiente e não limpam seu banco.** Não substituem MongoDB por mocks no fluxo CRUD.

A primeira instalação ou execução de teste pode baixar o binário oficial MongoDB, conforme a configuração do `mongodb-memory-server`; o cache do teste fica em `.cache/mongodb`. É necessário acesso à rede para o primeiro download. Não há skips silenciosos quando o banco de teste não inicia. A CI repete os checks em Linux e Windows com Node 24, sem segredos de produção, e audita dependências com limite de falha em severidade alta.

## Estrutura e decisões

```text
src/
  app.js                 fábrica Express, sem conectar ou abrir porta ao importar
  server.js              configuração, conexão, início e encerramento
  config/                validação do ambiente e conexão/índice MongoDB
  controllers/           operações de login e pedidos
  lib/                   mapping, validação e erro HTTP
  middlewares/           autenticação e resposta de erro
  models/Order.js        schema e índice único
  routes/                rotas originais e limite de login
  swagger.json           contrato OpenAPI 3.0.3
tests/                   testes unitários e de integração
examples/                payloads e requisições reproduzíveis
```

As decisões, correções de compatibilidade e limites estão em [docs/decisoes.md](docs/decisoes.md). O projeto usa a mesma stack do exercício; a revisão prioriza clareza, execução reproduzível e evidência técnica, sem adicionar serviços externos ou uma arquitetura de produção que não foi implementada.

## Limites

Há uma única conta de demonstração, configurada por ambiente. Não há cadastro de usuários, perfis de acesso, isolamento por cliente, refresh/revogação de tokens, idempotência, paginação, pagamentos, deploy público ou compromisso de operação. O limitador de login usa memória de um processo; proxy, distribuição, HTTPS e gestão de segredos precisam ser planejados para uma implantação real. A senha está no ambiente, sem armazenamento de usuários ou ciclo de vida de credenciais implementado.

Não foram medidos resultados comerciais. A revisão e os testes demonstram comportamento desta versão, não certificam segurança ou operação em produção. A auditoria de dependências deve ser repetida conforme novas versões e avisos surgirem.
