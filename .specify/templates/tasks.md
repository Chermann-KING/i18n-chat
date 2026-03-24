# speckit.tasks — i18n-chat

> Actionable breakdown of all work items, ordered by dependency.
> Each task maps to a section of `plan.md` and traces back to a user scenario in `specify.md`.

---

## Phase 0 — Project Scaffolding

| #   | Task                                                                | Artifact                                               | Depends on |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------ | ---------- |
| 0.1 | Initialise pnpm monorepo with Turborepo                             | `/pnpm-workspace.yaml`, `/turbo.json`                  | —          |
| 0.2 | Create workspace packages: `database`, `domain`, `dto`, `config`    | `/packages/*`                                          | 0.1        |
| 0.3 | Create apps: `api` (NestJS), `web` (Next.js)                        | `/apps/*`                                              | 0.1        |
| 0.4 | Configure `tsconfig.base.json` with `strict: true` and path aliases | `/tsconfig.base.json`                                  | 0.1        |
| 0.5 | Configure ESLint + Prettier (Airbnb base) shared config             | `/packages/config/eslint`, `/packages/config/prettier` | 0.1        |
| 0.6 | Configure Husky + lint-staged (type-check + lint on pre-commit)     | `/.husky/pre-commit`                                   | 0.5        |
| 0.7 | Configure `.env.example` files for `api` and `web`                  | `/apps/api/.env.example`, `/apps/web/.env.example`     | —          |
| 0.8 | Write Docker Compose stack (postgres, redis, libretranslate)        | `/infra/compose/docker-compose.yml`                    | —          |

---

## Phase 1 — Database

| #   | Task                                                                                                    | Artifact                                     | Depends on |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------- |
| 1.1 | Write Prisma schema (all models from `plan.md` §3)                                                      | `packages/database/prisma/schema.prisma`     | 0.2        |
| 1.2 | Generate and run initial migration                                                                      | `packages/database/prisma/migrations/`       | 1.1, 0.8   |
| 1.3 | Write database seed (languages, admin user, sample templates)                                           | `packages/database/prisma/seed.ts`           | 1.2        |
| 1.4 | Configure `pgcrypto` extension for contact encryption                                                   | Migration file                               | 1.2        |
| 1.5 | Add DB indexes: `recipient_channels(channel)`, `messages(dispatch_id, status)`, `audit_logs(entity_id)` | Migration file                               | 1.2        |
| 1.6 | Write a `purge-anonymous-targets` scheduled job (TTL = 30 days)                                         | `apps/api/src/modules/dispatch/purge.job.ts` | 1.2        |

---

## Phase 2 — Domain & Shared Packages

| #   | Task                                                                                                                                                          | Artifact                          | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------- |
| 2.1 | Define domain enums: `MessageChannel`, `UserRole`, `DispatchStatus`, `MessageStatus`, `WaTemplateStatus`, `WaTemplateCategory`                                | `packages/domain/src/enums/`      | 0.2        |
| 2.2 | Define domain exceptions: `AppException`, `NotFoundException`, `UnauthorizedException`, `TemplateTranslationNotFoundException`                                | `packages/domain/src/exceptions/` | 0.2        |
| 2.3 | Define port interfaces: `IMessageChannel`, `ITranslationProvider`, `IRecipientRepository`, `ITemplateRepository`, `IDispatchRepository`, `IMessageRepository` | `packages/domain/src/ports/`      | 2.1        |
| 2.4 | Define Zod schemas and inferred types for all DTOs (Auth, User, Language, Recipient, Template, Dispatch, Message)                                             | `packages/dto/src/`               | 2.1        |

---

## Phase 3 — API — Auth Module

| #   | Task                                                                                      | Artifact                                                       | Depends on |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| 3.1 | Implement `AuthService`: `login()`, `logout()`, `refreshTokens()`                         | `apps/api/src/modules/auth/auth.service.ts`                    | 1.2, 2.2   |
| 3.2 | Implement JWT strategy (access token 15 min, argon2 password hashing)                     | `apps/api/src/modules/auth/strategies/jwt.strategy.ts`         | 3.1        |
| 3.3 | Implement JWT Refresh strategy (7 days, rotation on use)                                  | `apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts` | 3.1        |
| 3.4 | Implement `AuthController`: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | `apps/api/src/modules/auth/auth.controller.ts`                 | 3.1        |
| 3.5 | Implement `JwtAuthGuard` and `RolesGuard`                                                 | `apps/api/src/common/guards/`                                  | 3.2        |
| 3.6 | Write unit tests for `AuthService`                                                        | `apps/api/src/modules/auth/auth.service.spec.ts`               | 3.1        |
| 3.7 | Write integration tests for `AuthController`                                              | `apps/api/src/modules/auth/auth.controller.e2e-spec.ts`        | 3.4        |

---

## Phase 4 — API — Core Modules

| #   | Task                                                                              | Artifact                                                    | Depends on |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| 4.1 | Implement `LanguageModule` (CRUD, admin-only for create/update/delete)            | `apps/api/src/modules/language/`                            | 3.5        |
| 4.2 | Implement `UserModule` (CRUD, admin-only)                                         | `apps/api/src/modules/user/`                                | 3.5        |
| 4.3 | Implement `RecipientModule` (CRUD + CSV import + channel contacts)                | `apps/api/src/modules/recipient/`                           | 4.1        |
| 4.4 | Implement `TemplateModule` (CRUD + variable schema management)                    | `apps/api/src/modules/template/`                            | 4.1        |
| 4.5 | Implement `TranslationService` (template + fallback resolution using Handlebars)  | `apps/api/src/modules/template/translation.service.ts`      | 4.4        |
| 4.6 | Write unit tests for `TranslationService` (fallback to EN, variable substitution) | `apps/api/src/modules/template/translation.service.spec.ts` | 4.5        |

---

## Phase 5 — API — Channel Adapters

| #   | Task                                                                                                | Artifact                                                               | Depends on |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| 5.1 | Implement `IMessageChannel` interface (domain port)                                                 | `packages/domain/src/ports/message-channel.interface.ts`               | 2.3        |
| 5.2 | Implement `EmailChannel` (Nodemailer + Brevo SMTP)                                                  | `apps/api/src/modules/channel/email/email.channel.ts`                  | 5.1        |
| 5.3 | Implement `SmsChannel` (Vonage/Twilio-compatible REST)                                              | `apps/api/src/modules/channel/sms/sms.channel.ts`                      | 5.1        |
| 5.4 | Implement `WhatsAppChannel` (Meta Cloud API — send approved template)                               | `apps/api/src/modules/channel/whatsapp/whatsapp.channel.ts`            | 5.1        |
| 5.5 | Implement `WhatsAppTemplateService` (submit HSM template to Meta, sync approval status via webhook) | `apps/api/src/modules/channel/whatsapp/whatsapp-template.service.ts`   | 5.4        |
| 5.6 | Implement Meta webhook endpoint `POST /webhooks/whatsapp` (delivery status callbacks)               | `apps/api/src/modules/channel/whatsapp/whatsapp-webhook.controller.ts` | 5.4        |
| 5.7 | Implement `LibreTranslateService` (ITranslationProvider)                                            | `apps/api/src/modules/translation/libre-translate.service.ts`          | 2.3        |
| 5.8 | Write unit tests for each channel adapter (mocked HTTP clients)                                     | `*.spec.ts` per adapter                                                | 5.2–5.4    |

---

## Phase 6 — API — Dispatch Module & Queue

| #    | Task                                                                                         | Artifact                                                | Depends on |
| ---- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- |
| 6.1  | Implement `DispatchService.createDispatch()` (validates, persists, enqueues)                 | `apps/api/src/modules/dispatch/dispatch.service.ts`     | 4.5, 5.1   |
| 6.2  | Implement `DispatchProducer` (BullMQ — enqueues per-message jobs per channel)                | `apps/api/src/modules/queue/dispatch.producer.ts`       | 6.1        |
| 6.3  | Implement `EmailWorker` (consumes email queue, calls EmailChannel)                           | `apps/api/src/modules/queue/workers/email.worker.ts`    | 5.2, 6.2   |
| 6.4  | Implement `SmsWorker`                                                                        | `apps/api/src/modules/queue/workers/sms.worker.ts`      | 5.3, 6.2   |
| 6.5  | Implement `WhatsAppWorker`                                                                   | `apps/api/src/modules/queue/workers/whatsapp.worker.ts` | 5.4, 6.2   |
| 6.6  | Configure retry policy (3 attempts, exponential backoff: 1s, 5s, 30s)                        | Worker configs                                          | 6.3–6.5    |
| 6.7  | Implement `DispatchController`: `POST /dispatches`, `GET /dispatches`, `GET /dispatches/:id` | `apps/api/src/modules/dispatch/dispatch.controller.ts`  | 6.1        |
| 6.8  | Implement `MessageController`: `GET /dispatches/:id/messages`                                | `apps/api/src/modules/message/message.controller.ts`    | 6.1        |
| 6.9  | Implement WebSocket gateway for real-time delivery status updates                            | `apps/api/src/modules/queue/delivery-status.gateway.ts` | 6.3–6.5    |
| 6.10 | Write unit tests for `DispatchService`                                                       | `dispatch.service.spec.ts`                              | 6.1        |
| 6.11 | Write integration tests for dispatch creation → message queuing                              | `dispatch.e2e-spec.ts`                                  | 6.7        |

---

## Phase 7 — API — Audit & Observability

| #   | Task                                                                              | Artifact                                      | Depends on           |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------- | -------------------- |
| 7.1 | Implement `AuditService.log()` (append-only, no update/delete)                    | `apps/api/src/modules/audit/audit.service.ts` | 1.2                  |
| 7.2 | Inject `AuditService` into all mutating service methods                           | All service files                             | 7.1                  |
| 7.3 | Implement `CorrelationIdInterceptor` (attach UUID to every request and log entry) | `apps/api/src/common/interceptors/`           | —                    |
| 7.4 | Configure Pino structured logger (JSON output, log level from env)                | `apps/api/src/main.ts`                        | —                    |
| 7.5 | Implement `GlobalExceptionFilter` (formats all errors + logs)                     | `apps/api/src/common/filters/`                | 2.2                  |
| 7.6 | Add throttling (NestJS ThrottlerModule, Redis store)                              | `apps/api/src/app.module.ts`                  | —                    |
| 7.7 | Configure Swagger/OpenAPI documentation                                           | `apps/api/src/main.ts`                        | All controllers done |

---

## Phase 8 — Frontend (Next.js)

| #    | Task                                                                                                                                                      | Depends on | User Scenario |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------- |
| 8.1  | Configure next-intl with `fr`, `nl`, `en` message files                                                                                                   | 0.3        | —             |
| 8.2  | Implement auth pages: Login, token refresh, protected route HOC                                                                                           | Phase 3    | —             |
| 8.3  | Implement layout: sidebar, topbar, language switcher                                                                                                      | 8.2        | —             |
| 8.4  | Implement `RecipientList` + `RecipientForm` + CSV import                                                                                                  | Phase 4    | US-04         |
| 8.5  | Implement `TemplateList` + `TemplateForm` + `TranslationEditor`                                                                                           | Phase 4    | US-03         |
| 8.6  | Implement `WhatsApp approval status` panel per translation                                                                                                | Phase 5    | US-03         |
| 8.7  | Implement `NewDispatch` wizard: mode toggle (Registered / Anonymous), recipient selection, template/free-text, variable input, channel selection, preview | Phase 6    | US-01, US-02  |
| 8.8  | Implement dispatch preview (renders translated body per language before sending)                                                                          | 8.7        | US-01, US-02  |
| 8.9  | Implement `DispatchDetail` page with real-time message status (WebSocket)                                                                                 | Phase 6    | US-01, US-02  |
| 8.10 | Implement `DispatchHistory` page with filters and CSV export                                                                                              | Phase 6    | US-05         |
| 8.11 | Write Playwright E2E tests for US-01 and US-02                                                                                                            | 8.7–8.9    | —             |

---

## Phase 9 — Infrastructure & Deployment

| #   | Task                                                                                  | Artifact                           | Depends on |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------- | ---------- |
| 9.1 | Write `Dockerfile` for `api` + `worker` (multi-stage, non-root user)                  | `infra/docker/api/Dockerfile`      | Phase 3–7  |
| 9.2 | Write `Dockerfile` for `web` (multi-stage, standalone output)                         | `infra/docker/web/Dockerfile`      | Phase 8    |
| 9.3 | Write `docker-compose.yml` for on-premise (all services, healthchecks, volume mounts) | `infra/compose/docker-compose.yml` | 9.1, 9.2   |
| 9.4 | Write Kubernetes manifests (Deployments, Services, StatefulSets, HPA, Ingress)        | `infra/k8s/`                       | 9.1, 9.2   |
| 9.5 | Configure Nginx reverse proxy with TLS termination                                    | `infra/docker/nginx/`              | 9.3        |
| 9.6 | Write GitHub Actions CI pipeline (lint → type-check → test → build → docker push)     | `.github/workflows/ci.yml`         | All phases |
| 9.7 | Document deployment runbook: on-premise + cloud                                       | `docs/deployment.md`               | 9.3, 9.4   |

---

## Dependency Graph (simplified)

```
Phase 0 (Scaffolding)
  └─► Phase 1 (Database)
        └─► Phase 2 (Domain)
              ├─► Phase 3 (Auth)
              │     └─► Phase 4 (Core Modules)
              │           ├─► Phase 5 (Channels)
              │           └─► Phase 6 (Dispatch + Queue)
              │                 ├─► Phase 7 (Audit + Observability)
              │                 └─► Phase 8 (Frontend)
              └─────────────────────────────► Phase 9 (Infrastructure)
```

---

## Estimated Effort (indicative)

| Phase | Scope                    | Complexity |
| ----- | ------------------------ | ---------- |
| 0     | Scaffolding              | Low        |
| 1     | Database                 | Medium     |
| 2     | Domain & Shared          | Low        |
| 3     | Auth                     | Medium     |
| 4     | Core Modules             | Medium     |
| 5     | Channels (esp. WhatsApp) | High       |
| 6     | Dispatch + Queue         | High       |
| 7     | Audit + Observability    | Low        |
| 8     | Frontend                 | High       |
| 9     | Infrastructure           | Medium     |
