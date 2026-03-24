# CLAUDE.md — i18n-chat

> This file is the primary reference for any AI assistant or developer working in this repository.
> Read it fully before writing any code.

---

## What is this project?

**i18n-chat** is a multilingual message dispatch platform for Belgian public-sector institutions.
Staff compose messages once; the platform translates and delivers them to each recipient in their
native language via Email, SMS, or WhatsApp.

---

## Spec-Driven Development Artifacts

All specifications live under `.specify/templates/`. Read them in this order:

| File                                                  | Purpose                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [constitution.md](.specify/templates/constitution.md) | Coding standards, naming conventions, Clean Code + SOLID rules — **always respected**    |
| [specify.md](.specify/templates/specify.md)           | What to build and why — user scenarios, channels, languages, non-functional requirements |
| [plan.md](.specify/templates/plan.md)                 | Technical architecture — stack, DB schema, module structure, queue design                |
| [tasks.md](.specify/templates/tasks.md)               | Phased, ordered work breakdown with dependency graph                                     |

---

## Non-Negotiable Rules (summary)

1. **TypeScript strict mode** — no `any`, no implicit types.
2. **Clean Code** — meaningful names, small functions (≤ 20 lines), single responsibility.
3. **SOLID** — depend on interfaces (`IMessageChannel`, `ITranslationProvider`…), not concretions.
4. **JSDoc** on every public symbol (class, method, function, type, interface, enum).
5. **Zod validation** at every API boundary — never trust raw request data.
6. **No magic strings/numbers** — use enums and named constants.
7. **No secrets in code** — always from environment variables.
8. **Audit log is append-only** — no `UPDATE`/`DELETE` on `audit_logs`.
9. **GDPR** — anonymous targets purged after 30 days; personal data encrypted at rest.
10. **Tests required** — unit tests for every service, integration tests for every endpoint.

---

## Monorepo Structure

```
i18n-chat/
├── apps/
│   ├── api/        NestJS REST API + WebSocket gateway
│   └── web/        Next.js 14 staff-facing UI
├── packages/
│   ├── database/   Prisma schema, migrations, seed
│   ├── domain/     Enums, exceptions, port interfaces (zero infra imports)
│   ├── dto/        Zod schemas + inferred TypeScript types
│   └── config/     Shared env validation
├── infra/
│   ├── compose/    docker-compose.yml (on-premise)
│   └── k8s/        Kubernetes manifests (cloud)
└── .specify/       Spec-driven development artifacts
```

---

## Key Technology Decisions

| Decision                | Choice                          | Reason                                 |
| ----------------------- | ------------------------------- | -------------------------------------- |
| Monorepo                | Turborepo + pnpm                | Single source of truth, shared types   |
| ORM                     | Prisma                          | Type-safe, clean migrations            |
| Auth                    | JWT (argon2 + refresh rotation) | No vendor dependency, enterprise-grade |
| Translation (free-text) | LibreTranslate (self-hosted)    | 0 €, GDPR-compliant                    |
| Template rendering      | Handlebars.js                   | Secure, no code execution              |
| Message queue           | BullMQ + Redis                  | Reliable async delivery with retry     |
| WhatsApp                | Meta Cloud API (direct)         | Pre-approved HSM templates required    |
| Fallback language       | English (`en`)                  | Configured per template                |

---

## Starting a New Task

1. Check `tasks.md` for the next pending item.
2. Read the relevant section of `plan.md` for architecture context.
3. Check `constitution.md` for applicable naming and coding rules.
4. Write the implementation, then the tests.
5. Ensure `pnpm lint && pnpm type-check && pnpm test` pass before committing.

---

## Running the Project Locally

```bash
# Install dependencies
pnpm install

# Start infrastructure (postgres, redis, libretranslate)
docker compose -f infra/compose/docker-compose.yml up -d

# Push DB schema and seed
pnpm --filter database prisma migrate dev
pnpm --filter database prisma db seed

# Start all apps in dev mode
pnpm dev
```

---

## Contact

Project initiated: 2026-03-24
Stack: Next.js 14 · NestJS 10 · Prisma 5 · PostgreSQL 16 · BullMQ · LibreTranslate · Meta Cloud API
