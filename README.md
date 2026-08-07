# nefertum-nest

Phase 1 fragrance platform API: NestJS + Prisma + GraphQL.

## Prerequisites

- Docker (with Compose v2)
- Node 24 (install via `nvm`; the repo's `.nvmrc` pins the version)

## Local dev with Docker

```bash
nvm use                  # honors .nvmrc → Node 24
docker compose up -d     # api on :3000, postgres on :5432
docker compose logs -f api
```

Apply pending Prisma migrations:

```bash
docker compose --profile migrate run --rm migrate
```

Reset Postgres (drop the volume):

```bash
docker compose down -v
```

## End-to-end verification

Run the full loop — bring up Postgres, apply migrations, run the Jest e2e
suit against the real DB:

```bash
npm run verify
```

Current e2e cover (in `apps/api/test/app.e2e-spec.ts`):

- The `AppModule` boots without throwing
- `/graphql` responds to a `{ __typename }` query
- The introspection schema exposes the `perfume` query

The host-based dev path (`npm run start:dev` against a host Postgres) is still
supported via the existing `.env` file.

## API

GraphQL playground: <http://localhost:3000/graphql>
