# Order API — Jitterbit technical challenge

[Português](README.md) · [OpenAPI contract](src/swagger.json) · [HTTP examples](examples/requests.http) · [Design notes](docs/decisoes.md)

[![CI](https://github.com/Alvaromarinho75/jitterbit-API-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/Alvaromarinho75/jitterbit-API-challenge/actions/workflows/ci.yml)

A personal project by **Álvaro Marinho**, based on a systems-integration technical challenge. The API accepts order fields in Portuguese, maps them to an English model and stores them in MongoDB. It demonstrates HTTP contracts, data transformation, validation, authentication and integration testing.

This is not an official Jitterbit API, commercial deployment or complete order-management product. Examples are fictional. There is no hosted public demo; run locally and explore Swagger.

## Features

- CRUD with the original routes and an explicit PT → EN mapping.
- Request and schema validation, real calendar dates and an allowlist for partial updates.
- JWT authentication for a single account configured through environment variables, one-hour tokens and login rate limiting.
- Startup waits for MongoDB and its unique index. Health reports 503 when disconnected.
- HTTP integration tests use a real, disposable MongoDB process, including concurrent duplicate creation.
- Validated OpenAPI, reproducible requests and CI for Linux/Windows.

## Run

Use **Node.js 24**, npm and a development MongoDB instance. The project uses CommonJS, Express 5, Mongoose 9 and JSON Web Token.

```sh
git clone https://github.com/Alvaromarinho75/jitterbit-API-challenge.git
cd jitterbit-API-challenge
npm ci
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` in Bash). Configure:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Authorised development database; the example uses local `jitterbit-orders` |
| `AUTH_USERNAME` | Single demo username, for example `demo` |
| `AUTH_PASSWORD` | Your local password, 12–256 characters; no default |
| `JWT_SECRET` | Random secret of at least 32 bytes; no default |
| `HOST` | Defaults to `127.0.0.1`; explicitly configure exposure when needed |
| `PORT` | Defaults to `3000`; integer 1–65535 |

Generate a local secret and copy it only to your `.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

With Docker already installed, an optional development database is `docker run --detach --name jitterbit-mongo --publish 127.0.0.1:27017:27017 mongo:8.2.6`. This creates a local, unauthenticated instance without a persistent data volume, for the exercise only. An existing MongoDB installation also works. Docker is not required for the automated tests.

Run `npm run dev` (Node watch mode) or `npm start`. Open [Swagger](http://127.0.0.1:3000/api-docs/), [OpenAPI JSON](http://127.0.0.1:3000/openapi.json) or [connection health](http://127.0.0.1:3000/health). Startup fails without valid configuration or a database connection, before opening an HTTP port. Swagger uses the current origin, including custom ports. Neither `.env` nor `node_modules` belongs in Git.

## Try it

Use Swagger or [examples/requests.http](examples/requests.http). The following shell example uses Bash; in PowerShell use `curl.exe` with the same method and JSON, or Swagger.

```sh
curl -X POST http://127.0.0.1:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"YOUR_LOCAL_PASSWORD"}'
```

Use the returned token as `Authorization: Bearer YOUR_TOKEN`. In Swagger’s **Authorize** dialog, enter only the token. Create an order with `POST /order` and [examples/order.json](examples/order.json); list, read, update with [examples/update-order.json](examples/update-order.json) and delete it using the routes below. The original fixed `admin`/`123456` credentials are no longer valid.

## Contract

| Create input | Stored/returned field |
| --- | --- |
| `numeroPedido` | `orderId` |
| `valorTotal` | `value` |
| `dataCriacao` | `creationDate` |
| `items[].idItem` | `items[].productId` |
| `items[].quantidadeItem` | `items[].quantity` |
| `items[].valorItem` | `items[].price` |

Creation requires every example field. Order identifiers are 1–100 alphanumeric characters, dots, hyphens or underscores, beginning with a letter/digit. The route name `list` is reserved, case-insensitively. Product IDs accept decimal strings that normalise to positive safe integers, without retaining leading zeroes. Quantities are positive safe integers; price and total are finite, non-negative JSON numbers. Each order contains 1–100 items. Dates require a real ISO 8601 calendar date/time with seconds and explicit timezone, with at most three fractional-second digits.

**PUT preserves the original partial English-input contract:** it accepts `value`, `creationDate` and/or `items` (`productId`, `quantity`, `price`). Sending items replaces the entire item list. Identity changes, extra fields and MongoDB operators are rejected. The endpoint has not silently become full-resource replacement or a Portuguese-input update.

The submitted total is stored without recomputing it or enforcing equality with item sums. The exercise does not specify currency or reconciliation rules; this is not a claim of financial-grade numeric precision. Responses retain MongoDB `_id`, `__v` and item `_id` metadata.

| Method / route | Success | Notes |
| --- | --- | --- |
| `GET /health` | 200 | Public; 503 without an active database connection |
| `POST /auth/login` | 200 | Public; one-hour JWT; 10 attempts per IP/minute |
| `POST /order` | 201 | JWT; Location header; duplicates return 409 |
| `GET /order/list` | 200 | JWT; array sorted by orderId, without pagination |
| `GET /order/:id` | 200 | JWT; absent order returns 404 |
| `PUT /order/:id` | 200 | JWT; partial English-input update |
| `DELETE /order/:id` | 200 | JWT; absent order returns 404 |

Errors are JSON with `message` and optional order-validation `details`. Codes include 400 (invalid JSON/data), 401 (authentication), 404 (not found), 409 (duplicate), 413 (body over 100 KB), 429 (login limit), 500 (internal failure) and 503 (database unavailable). Internal messages and stacks are not returned to clients.

## Verify

```sh
npm run check
npm run test:coverage
npm audit
```

`check` runs syntax checks and **26 configuration, mapping, OpenAPI and HTTP/database tests**. Tests start a new temporary MongoDB 8.2.6 on a random loopback port with fictional credentials, then stop it. **They do not read your .env or environment MONGO_URI, and never clear your own database.** CRUD uses real persistence, rather than model mocks. A deliberate model failure is injected only to test sanitised error handling.

The first dependency installation or test run may download an official MongoDB binary, depending on mongodb-memory-server configuration. Test downloads are cached under `.cache/mongodb`; first-time downloads need network access. A failed test-database startup is a failure, not a silent skip. CI runs on Linux and Windows with Node 24, without production secrets, and fails dependency audit checks at high severity or above.

## Structure and limits

`src/app.js` creates Express without connecting/listening on import; `src/server.js` handles configuration, database readiness, startup and shutdown. `config/`, `controllers/`, `lib/`, `middlewares/`, `models/` and `routes/` separate responsibilities without introducing external infrastructure. `src/swagger.json` is the OpenAPI 3.0.3 contract. Tests and examples live in `tests/` and `examples/`. See [design notes](docs/decisoes.md) for compatibility decisions.

This is a single-account demonstration, not a complete identity system. There is no registration, role enforcement, tenant isolation, refresh/revocation, idempotency, pagination, payment processing or production deployment. Login limits use process memory. Reverse proxies, distributed limits, HTTPS and secret management require explicit deployment design; the demo password lives in the environment. No business results or production security certification are claimed. Repeat dependency audits as versions and advisories change.
