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

The host-based dev path (`npm run start:dev` against a host Postgres) is still
supported via the existing `.env` file.

## API

GraphQL playground: <http://localhost:3000/graphql>
