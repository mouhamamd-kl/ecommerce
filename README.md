<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Inventory backend: TypeORM or warehouse gRPC

### Run both backends with Docker

From this ecommerce directory, start the warehouse stack first, then NestJS:

```powershell
docker compose -f ../warehouse-service/docker-compose.yml up -d --build
docker compose up -d --build
docker compose ps
```

The Nest API is at `http://localhost:3000/api/v1`, Swagger at
`http://localhost:3000/api/docs`, and warehouse gRPC at `localhost:50051`.
Compose defaults Nest's inventory driver to gRPC when `INVENTORY_DRIVER` is not
set in `.env`. The container uses `warehouse:50051` on the shared
`ecommerce-warehouse` network. An explicit `INVENTORY_DRIVER=typeorm` keeps local
ORM inventory available.

An initialization container runs before NestJS. It creates the current entity
schema only if the ecommerce database is empty. For an existing database, it
preserves existing tables and data and creates the missing warehouse reservation
mapping table. It does not run destructive schema synchronization or seed data
over an existing database. The category ORM entity explicitly maps to the
existing `category` table.

The warehouse database remains independent. Existing ORM quantities and pending
orders are not silently migrated. Initialize stock in the admin dashboard for new
gRPC orders; use the original backend or an explicit reservation migration for
existing ORM orders.

On Windows, `docker/wslconfig.example` shows the optional host WSL limits used
when troubleshooting Docker Desktop resource errors. `%USERPROFILE%/.wslconfig`
applies to all WSL 2 distributions and requires a WSL restart to take effect.

`INVENTORY_DRIVER=typeorm` is the default. Set `INVENTORY_DRIVER=grpc` to use
the Go warehouse service for both admin inventory endpoints and order checkout,
cancellation, and delivery. Orders, carts, products, and users still use the
ecommerce database.

1. Start `C:\Users\HP\Desktop\PersonalProjects\backend\warehouse-service` with its
   database migrations applied, `REPOSITORY_DRIVER=postgres`, `DATABASE_URL`, and
   `GRPC_PORT=50051` in the process environment (`go run ./cmd/warehouse`). That
   Go entry point reads environment variables directly; it does not load `.env`.
2. Apply `src/database/migrations/20261104-order-inventory-reservations.sql` to
   the **ecommerce** database. This app has `synchronize: false`; the new table
   stores the warehouse reservation ID for each order.
3. Configure ecommerce `.env` and restart Nest:

   ```dotenv
   INVENTORY_DRIVER=grpc
   WAREHOUSE_GRPC_URL=localhost:50051
   WAREHOUSE_GRPC_TIMEOUT_MS=3000
   ```

The gRPC client uses `src/proto/warehouse/v1/warehouse.proto`, copied from the
warehouse project. Keep the two contracts in sync when changing the service.
`nest build` copies this contract into `dist/proto` so the compiled app can load
it without the source tree. `WAREHOUSE_GRPC_URL` takes a gRPC host and port;
inside containers, use the warehouse service hostname instead of `localhost`.
The connection uses plaintext transport, matching the Go server.

Create inventory for ecommerce product IDs in the selected backend. Selecting a
backend does not copy local stock or existing reservations. Finish existing
orders or migrate their stock and reservation mappings before switching
backends. A missing warehouse mapping is rejected instead of modifying local
inventory. There is no automatic fallback to ORM when the warehouse is down.

Checkout submits all products in one atomic `ReserveStock` call (up to 100
distinct products), with an order-specific idempotency key. Reservations do not
expire automatically, matching the ORM behavior. Cancellation releases the saved
reservation; delivery confirms it. Movement responses include `referenceId` for
opaque warehouse references; `referenceOrderId` remains null for those references.
Remote list calls fetch every page to preserve the existing HTTP array responses.

Admin product details (`GET /api/v1/admin/products/:id`) also include an `inventory`
object with `quantityOnHand`, `quantityReserved`, `availableQuantity`,
`lowStockThreshold`, and `isLowStock`, from the configured inventory backend.
`inventory` is null if stock has not been initialized for that product. A warehouse
outage returns an error rather than reporting an incorrect quantity. Public product
responses keep their existing fields.

Insufficient stock during checkout returns HTTP 409 in the normal
`{ status: "error", message, data: null }` response format. Warehouse timeouts and
unavailability return HTTP 504 and 503 with clear messages. Unexpected internal
errors still return a generic HTTP 500 response.

The ecommerce transaction and warehouse transaction commit separately. Checkout
attempts to release a newly created reservation if its local transaction fails,
including recovering a lost response with the same idempotency key. Failed
cleanup is logged with the order ID, reservation ID when known, and key. A process
crash or prolonged warehouse outage can still leave an orphan reservation that
needs reconciliation. Release and confirmation are idempotent in the Go service:
if an RPC succeeds but the local status update fails, retry the same transition.
Resolve any uncertain outcome before attempting a different transition. This
integration does not provide a durable outbox or distributed transaction.

`npm test` includes a local gRPC server test suite covering protobuf mapping,
pagination, deadlines, reservation persistence, rollback cleanup, and ORM batch
compatibility. These tests do not require running PostgreSQL or the Go service.

## Performance and caching (requirement 3)

Compose now starts a PostgreSQL streaming replica (`localhost:5435`) and a
dedicated Redis catalog cache (`localhost:6379`). Set `DB_REPLICATION_PASSWORD`
and the settings listed in `.env.example` before startup. Database initialization
applies the additive performance migration without replacing existing data.

Public product/category responses use a 30-second Redis TTL, transactional cache
revisions, explicit ETags, and `Cache-Control: public, no-cache`. Private responses
use `no-store`. Catalog cache misses use the replica only after its WAL replay
passes a primary freshness fence; lag or failure falls back to the primary.
Orders, authentication, carts, and inventory always use authoritative reads.
`GET /api/v1/admin/performance` exposes administrator-only cache/routing counters.

The repeatable experiment uses separate `ecommerce_performance` and
`warehouse_performance` databases and an API bound to `127.0.0.1:3001`. Start the
normal warehouse stack first, then from this backend directory:

```powershell
node performance/benchmark.mjs
# Or run the individual correctness checks and regenerate the local report:
node performance/verify.mjs
node performance/compare.mjs
```

The benchmark seeds 200,000 orders and measures the same k6 workload through five
stages: baseline, indexes, batched queries, Redis, and replica routing. Its saved
baseline comes from setup commit `e485cf1`, with only the benchmark rate limit
parameterized. Normal API rate limits remain enabled. Raw results and the full
personal `PERFORMANCE_CACHING_WALKTHROUGH.md` explanation are ignored by Git.
Stop the extra benchmark services with
`docker compose -f docker-compose.performance.yml stop`; normal storefront
services keep running.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
