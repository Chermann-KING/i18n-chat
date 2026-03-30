# i18n-chat

A multilingual message dispatch platform. Staff compose a message once; the platform translates it and delivers it to each recipient in their preferred language via email, SMS, or WhatsApp.

---

## Prerequisites

| Requirement    | Minimum version |
| -------------- | --------------- |
| Node.js        | 20.0.0          |
| pnpm           | 10.0.0          |
| Docker         | 24              |
| Docker Compose | 2.20            |

---

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill environment files
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — at minimum, generate ENCRYPTION_KEY and JWT secrets

# 3. Start infrastructure (PostgreSQL, Redis, LibreTranslate, Mailpit)
docker compose -f infra/compose/docker-compose.yml --profile dev up -d

# 4. Apply database schema and seed reference data
pnpm --filter @i18n-chat/database prisma migrate dev
pnpm --filter @i18n-chat/database prisma db seed

# 5. Start all applications in development mode
pnpm dev
```

The API starts on `http://localhost:3001`; the web interface on `http://localhost:3000`.

Swagger documentation is available at `http://localhost:3001/api/docs`.

Dev email (Mailpit) is available at `http://localhost:8025`.

---

## Monorepo structure

```
i18n-chat/
├── apps/
│   ├── api/          NestJS REST API + BullMQ workers (port 3001)
│   └── web/          Next.js 15 staff-facing interface (port 3000)
├── packages/
│   ├── database/     Prisma schema, migrations, seed
│   ├── domain/       Enums, exceptions, port interfaces — no infrastructure imports
│   ├── dto/          Zod schemas and inferred TypeScript types shared by api and web
│   └── config/       Shared ESLint and Prettier configuration
├── infra/
│   ├── compose/      docker-compose.yml for on-premise deployment
│   ├── docker/       Dockerfiles for api, web, and nginx
│   └── k8s/          Kubernetes manifests for cloud deployment
└── .github/
    └── workflows/    GitHub Actions CI pipeline
```

---

## Common commands

```bash
# Run all linters across the monorepo
pnpm lint

# TypeScript type-check all packages and applications
pnpm type-check

# Run all unit tests
pnpm test

# Build all packages and applications (respects dependency order via Turborepo)
pnpm build

# Format all source files with Prettier
pnpm format
```

---

## Environment variables

All secrets must be provided as environment variables — never committed to version control.

Copy `apps/api/.env.example` to `apps/api/.env` and fill in every `CHANGE_ME` value.

Key variables for initial setup:

| Variable                                              | Description                                        | How to generate                                                            |
| ----------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| `ENCRYPTION_KEY`                                      | 64-hex-char key for AES-256-GCM contact encryption | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_ACCESS_SECRET`                                   | Secret for signing access tokens                   | `openssl rand -base64 64`                                                  |
| `JWT_REFRESH_SECRET`                                  | Secret for signing refresh tokens                  | `openssl rand -base64 64`                                                  |
| `DATABASE_URL`                                        | PostgreSQL connection string                       | —                                                                          |
| `REDIS_URL`                                           | Redis connection string                            | —                                                                          |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP relay credentials                             | —                                                                          |
| `WA_PHONE_NUMBER_ID` / `WA_ACCESS_TOKEN`              | Meta Cloud API credentials for WhatsApp            | Meta Business Manager                                                      |

---

## Database

The database schema lives in `packages/database/prisma/schema.prisma`. Migrations are applied with Prisma Migrate.

```bash
# Create and apply a new migration
pnpm --filter @i18n-chat/database prisma migrate dev --name <migration-name>

# Apply migrations in production (no interactive prompt)
pnpm --filter @i18n-chat/database prisma migrate deploy

# Open Prisma Studio (visual DB browser)
pnpm --filter @i18n-chat/database prisma studio
```

The seed script (`packages/database/prisma/seed.ts`) inserts the supported languages and a default admin user. Credentials for the seeded admin are printed to the console during seeding.

---

## Testing

Unit tests use Jest and live alongside the source files (`*.spec.ts`).

```bash
# Run unit tests for the API
pnpm --filter @i18n-chat/api test

# Run with coverage
pnpm --filter @i18n-chat/api test -- --coverage
```

---

## Deployment

### On-premise (Docker Compose)

```bash
# Build application images
docker build -f infra/docker/api/Dockerfile -t i18n-chat-api .
docker build -f infra/docker/web/Dockerfile -t i18n-chat-web .

# Start the full stack (production profile includes Nginx)
docker compose -f infra/compose/docker-compose.yml --profile production up -d
```

TLS certificates must be placed at the paths referenced by `TLS_CERT_PATH` and `TLS_KEY_PATH` (see `infra/compose/docker-compose.yml`).

### Cloud (Kubernetes)

Manifests are in `infra/k8s/`. Apply in the following order:

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/postgres/
kubectl apply -f infra/k8s/redis/
kubectl apply -f infra/k8s/libretranslate/
kubectl apply -f infra/k8s/api/
kubectl apply -f infra/k8s/worker/
kubectl apply -f infra/k8s/web/
kubectl apply -f infra/k8s/ingress.yaml
```

Before applying, create the `app-secret` Kubernetes Secret referenced by the Deployments with the same keys as in `apps/api/.env.example`, and update the image references (`ghcr.io/YOUR_ORG/...`) to your actual registry.

### CI/CD

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests:

1. Lint
2. Type-check
3. Unit tests with coverage upload
4. Docker image build and push to GitHub Container Registry (push to `main` only)

Images are tagged with the short commit SHA and `latest` (main branch only). Multi-platform builds target `linux/amd64` and `linux/arm64`.
