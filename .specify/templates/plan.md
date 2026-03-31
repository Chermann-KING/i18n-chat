# speckit.plan — i18n-chat

> This document translates the specification into a concrete technical architecture.
> Every decision here is traceable to a requirement in `specify.md`.

---

## 1. Repository Structure

**Strategy**: Monorepo managed with **Turborepo** and **pnpm workspaces**.

```
i18n-chat/
├── apps/
│   ├── api/                  # NestJS — REST API
│   └── web/                  # Next.js 15 — Staff-facing UI (App Router)
├── packages/
│   ├── database/             # Prisma schema, migrations, seed, generated client
│   ├── domain/               # Shared enums, exceptions, port interfaces (zero infra imports)
│   ├── dto/                  # Shared Zod schemas + inferred TypeScript types
│   └── config/               # Shared environment validation (zod + dotenv)
├── infra/
│   ├── docker/               # Dockerfiles per service (api, web)
│   ├── compose/              # docker-compose.yml (on-premise)
│   └── k8s/                  # Kubernetes manifests (cloud)
├── .github/workflows/        # CI pipeline (lint → type-check → test → build → docker push)
├── .specify/                 # Spec-driven development artifacts
├── .husky/                   # Git hooks (lint-staged on pre-commit)
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── CLAUDE.md
```

---

## 2. Tech Stack

| Layer              | Technology                     | Version | Rationale                                                      |
| ------------------ | ------------------------------ | ------- | -------------------------------------------------------------- |
| Frontend           | Next.js (App Router)           | 15      | SSR, file-based routing, React Server Components               |
| UI components      | shadcn/ui + Tailwind CSS       | latest  | Accessible, unstyled primitives, rapid composition             |
| Icons              | Lucide React                   | latest  | Cohesive icon set, tree-shakeable                              |
| i18n (UI)          | next-intl                      | latest  | Type-safe translations, locale routing, AppConfig augmentation |
| Backend API        | NestJS                         | 11      | Modules, DI, guards, interceptors — enterprise-ready           |
| ORM                | Prisma                         | 6       | Type-safe queries, migrations, clean schema DSL                |
| Database           | PostgreSQL                     | 16      | ACID, JSONB, pgcrypto, full-text search                        |
| Message queue      | BullMQ + Redis                 | 5 / 7   | Job retries, delays, rate-limiting per queue                   |
| Translation engine | LibreTranslate (self-hosted)   | latest  | 0 € cost, GDPR-compliant, ~30 languages                        |
| Auth               | JWT (NestJS Passport + argon2) | —       | Access token 4 h / Refresh token 7 days, rotation              |
| Validation         | Zod                            | 3       | Runtime + compile-time safety at every API boundary            |
| Testing            | Jest + Supertest               | —       | Unit + integration tests                                       |
| Email              | Nodemailer + Brevo SMTP        | —       | Free tier, reliable deliverability                             |
| SMS                | Vonage / Twilio-compatible     | —       | Configurable via env; abstracted behind IMessageChannel        |
| WhatsApp           | Meta Cloud API (Graph API v18) | —       | Direct integration; requires pre-approved HSM templates        |
| Containerisation   | Docker + Docker Compose        | —       | On-premise deployment                                          |
| Orchestration      | Kubernetes (Helm charts)       | —       | Cloud deployment                                               |
| Logging            | Pino (structured JSON)         | —       | Low overhead, correlation ID support                           |

---

## 3. Database Schema (Prisma DSL)

The canonical schema lives at `packages/database/prisma/schema.prisma`.
The summary below highlights design decisions and field semantics.

### Identity & Access

```prisma
model User {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email                 String   @unique
  passwordHash          String                      // argon2 hash — never plaintext
  firstName             String?
  lastName              String?
  role                  UserRole @default(SENDER)
  preferredLanguageCode String   @default("fr")     // ISO 639-1; drives post-login locale redirect
  notifyOnFailure       Boolean  @default(false)    // email alert when a dispatch fails
  mustChangePassword    Boolean  @default(false)    // true = first-login modal shown; cleared on change or dismiss
  isActive              Boolean  @default(true)     // soft-delete; set to false to deactivate
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum UserRole { ADMIN  SENDER  VIEWER }
```

### Recipients

```prisma
model Recipient {
  id                    String   @id ...
  firstName             String
  lastName              String
  preferredLanguageCode String
  isActive              Boolean  @default(true)
  // relations: RecipientChannel[], Message[], DispatchVariableSet[]
}

model RecipientChannel {
  recipientId  String
  channel      MessageChannel    // EMAIL | SMS | WHATSAPP
  contact      String            // encrypted at application layer
  isActive     Boolean  @default(true)
  @@unique([recipientId, channel])
}
```

### Templates

```prisma
model Template {
  name                 String              // human-readable display name
  slug                 String   @unique    // machine identifier, e.g. 'appointment_reminder'
  category             String   @default("general")
  fallbackLanguageCode String   @default("en")
  createdById          String
  isActive             Boolean  @default(true)
}

model TemplateVariable {
  key            String          // Handlebars key, e.g. 'prenom'
  label          String          // UI label shown to sender
  type           VariableType    @default(TEXT)    // TEXT | NUMBER | DATE | TIME
  source         VariableSource  @default(MANUAL)  // MANUAL | RECIPIENT_FIELD
  recipientField RecipientField?                   // firstName | lastName (when source = RECIPIENT_FIELD)
  isRequired     Boolean  @default(true)
  defaultValue   String?
  @@unique([templateId, key])
}

model TemplateTranslation {
  languageCode   String
  name           String?         // localized template name (falls back to Template.name)
  subject        String?         // email subject line
  body           String          // Handlebars template string
  variableLabels Json?           // {"date": "Datum van de afspraak"} — per-language variable labels
  // WhatsApp Meta fields: waTemplateName, waTemplateStatus, waTemplateCategory, waTemplateMetaId
  @@unique([templateId, languageCode])
}
```

### Dispatches & Messages

```prisma
enum DispatchStatus { DRAFT  QUEUED  IN_PROGRESS  DONE  CANCELLED  FAILED }
enum MessageStatus  { PENDING  SENT  DELIVERED  FAILED }

model Dispatch {
  recipientMode    RecipientMode   // REGISTERED | ANONYMOUS
  templateId       String?
  freeTextOriginal String?         // set when free-text mode
  status           DispatchStatus  @default(DRAFT)
}

model Message {
  // exactly one of recipientId / anonymousTargetId is set
  channel          MessageChannel
  translatedBody   String          // final rendered + translated body
  status           MessageStatus   @default(PENDING)
  providerMessageId String?        // ID returned by Brevo / Vonage / Meta
}
```

### Audit

```prisma
// Append-only. No UPDATE or DELETE permitted on this table.
model AuditLog {
  userId     String?
  action     String    // dot-namespaced: 'dispatch.created', 'user.password_changed', …
  entityType String
  entityId   String
  metadata   Json      @default("{}")
}
```

---

## 4. API Module Architecture (NestJS)

```
apps/api/src/
├── main.ts                          # Bootstrap, Pino logger, GlobalExceptionFilter, Swagger
├── app.module.ts                    # Root module: JwtAuthGuard, RolesGuard, ThrottlerGuard, CorrelationIdInterceptor
├── common/
│   ├── filters/                     # GlobalExceptionFilter (HttpException → domain → 500)
│   ├── guards/                      # JwtAuthGuard, RolesGuard
│   ├── interceptors/                # CorrelationIdInterceptor
│   ├── decorators/                  # @CurrentUser(), @Roles(), @Public()
│   ├── pipes/                       # ZodValidationPipe
│   ├── logger/                      # PinoLoggerService
│   └── prisma/                      # PrismaService (global module)
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts       # POST /auth/login, /auth/refresh, /auth/logout
│   │   ├── auth.service.ts
│   │   └── strategies/              # JwtStrategy, JwtRefreshStrategy
│   ├── user/
│   │   ├── user.controller.ts       # Admin CRUD: GET/POST /users, GET/PATCH/DELETE /users/:id
│   │   ├── me.controller.ts         # Self-service: GET /users/me, PATCH /users/me/profile,
│   │   │                            #   /users/me/password, /users/me/password-prompt, /users/me/notifications
│   │   └── user.service.ts          # create() sends welcome email; mustChangePassword lifecycle
│   ├── language/
│   │   └── language.controller.ts   # GET /languages
│   ├── recipient/
│   │   ├── recipient.controller.ts  # CRUD + channel contacts
│   │   └── recipient.repository.ts
│   ├── template/
│   │   ├── template.controller.ts   # CRUD + variables + translations
│   │   └── translation.service.ts   # Resolves translation + fallback to template.fallbackLanguageCode
│   ├── dispatch/
│   │   ├── dispatch.controller.ts   # POST /dispatches, GET /dispatches, GET /dispatches/:id, PATCH cancel
│   │   ├── dispatch.service.ts      # Orchestrates creation, queuing, cancellation
│   │   └── dispatch.repository.ts
│   ├── channel/
│   │   ├── email/email.channel.ts   # Nodemailer + Brevo SMTP
│   │   ├── sms/sms.channel.ts
│   │   └── whatsapp/                # WhatsAppChannel + WhatsAppTemplateService + WhatsAppWebhookController
│   ├── queue/
│   │   ├── dispatch.producer.ts     # Enqueues per-message BullMQ jobs
│   │   └── workers/                 # EmailWorker, SmsWorker, WhatsAppWorker (3 retries, exp. backoff)
│   ├── translation/
│   │   └── libre-translate.service.ts  # ITranslationProvider (free-text mode)
│   └── audit/
│       └── audit.service.ts         # append-only AuditLog writes
```

**Retry policy**: 3 attempts with exponential backoff (1 s, 5 s, 30 s).
Failed jobs after 3 attempts → `message.status = FAILED`, error stored in `errorDetails`.

---

## 5. Key Abstractions (Interfaces)

```typescript
// packages/domain/src/ports/message-channel.interface.ts
export interface IMessageChannel {
  readonly channel: MessageChannel;
  send(payload: SendMessagePayload): Promise<string>;
  validateContact(contact: string): boolean;
}

// packages/domain/src/ports/translation-provider.interface.ts
export interface ITranslationProvider {
  translate(text: string, targetLanguageCode: string, sourceLanguageCode?: string): Promise<string>;
}
```

---

## 6. Message Queue Architecture

```
DispatchService.createDispatch()
        │
        ▼
DispatchProducer.enqueueMessages(dispatchId)
        │
        ├─── Queue: 'email-messages'    (concurrency: 20)
        ├─── Queue: 'sms-messages'      (concurrency: 10)
        └─── Queue: 'whatsapp-messages' (concurrency: 5, rate: 80/s)
                │
                ▼ (BullMQ Worker)
        Worker reads message from DB
        Renders body (Handlebars + variables)
        Calls IMessageChannel.send()
        Updates message.status → SENT / FAILED
```

---

## 7. Translation Resolution Flow

```
resolveMessageBody(templateId, languageCode, variables):
  1. Find TemplateTranslation WHERE templateId AND languageCode
  2. If not found → find TemplateTranslation WHERE templateId AND languageCode = template.fallbackLanguageCode
  3. If still not found → throw TemplateTranslationNotFoundException
  4. Compile body with Handlebars using variables
  5. Return rendered string

resolveMessageBody(freeText, targetLanguageCode):
  1. If targetLanguageCode = source language → return freeText as-is
  2. Call ITranslationProvider.translate(freeText, targetLanguageCode)
  3. Return translated string
```

---

## 8. Frontend Architecture (Next.js 15)

**Pattern**: Next.js App Router with a BFF (Backend-For-Frontend) layer.
All API calls from client components go through Next.js route handlers (`/api/*`) which forward
to NestJS using HttpOnly cookie tokens. The raw JWT tokens are never exposed to the browser.

```
apps/web/src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   └── (app)/                      # Protected — requires auth cookie
│   │       ├── layout.tsx              # AppSidebar + locale-aware shell
│   │       ├── dispatches/
│   │       │   ├── page.tsx            # Dispatch history (US-05)
│   │       │   ├── new/page.tsx        # Dispatch wizard (US-01, US-02)
│   │       │   └── [id]/page.tsx       # Dispatch detail + delivery status
│   │       ├── templates/page.tsx      # Template management (US-03)
│   │       ├── recipients/page.tsx     # Recipient management (US-04)
│   │       ├── users/page.tsx          # Agent management — ADMIN only (US-06)
│   │       └── settings/page.tsx       # Profile, password, preferences (US-07)
│   └── api/                            # BFF route handlers (server-side, uses HttpOnly cookies)
│       ├── auth/login|logout|refresh|me/
│       ├── users/route|[id]|me/*/
│       ├── languages/
│       ├── recipients/[id]/channels/
│       ├── templates/[id]/variables|translations/
│       └── dispatches/[id]/cancel|messages|export/
├── components/
│   ├── ui/                             # shadcn/ui + custom: ConfirmDialog, LanguageSelect, PhoneInput
│   ├── layout/                         # AppSidebar, Topbar, LocaleSwitcher, ThemeToggle
│   ├── auth/                           # LoginForm
│   ├── dispatches/                     # DispatchHistory, DispatchWizard, DispatchDetail, FirstLoginModal
│   ├── templates/                      # TemplatesView, TemplateDialog, TemplateDetail
│   ├── recipients/                     # RecipientsView, RecipientDialog
│   ├── users/                          # UsersView, UserDialog
│   └── settings/                       # SettingsView
├── lib/
│   ├── bff-client.ts                   # Typed fetch wrapper (bffGet/Post/Patch/Delete)
│   ├── api-client.ts                   # Server-side fetch wrapper for BFF → NestJS calls
│   ├── constants/
│   │   ├── bff-routes.ts               # BFF_ROUTES — all /api/* paths
│   │   └── api-routes.ts               # API_ROUTES — all NestJS endpoint URLs
│   └── use-toast.ts
├── i18n/routing.ts                     # next-intl routing config (SupportedLocale)
└── messages/
    ├── fr.json                         # Namespaces: common, nav, auth, recipients, templates,
    ├── nl.json                         #   dispatches, users, settings, firstLogin
    └── en.json
```

**Sidebar navigation** (role-aware):

- "Nouveaux envois" — all roles
- "Historique" — all roles
- "Modèles" — all roles
- "Destinataires" — all roles
- "Agents" — **ADMIN only**
- "Paramètres" — all roles

---

## 9. Infrastructure

### On-Premise (Docker Compose)

```yaml
services:
  postgres:       image: postgres:16-alpine
  redis:          image: redis:7-alpine
  libretranslate: image: libretranslate/libretranslate
  api:            build: ./infra/docker/api    # NestJS + BullMQ workers
  web:            build: ./infra/docker/web    # Next.js standalone output
```

### Cloud (Kubernetes)

```
k8s/
├── namespace.yaml
├── postgres/          StatefulSet + PVC
├── redis/             StatefulSet + PVC
├── libretranslate/    Deployment
├── api/               Deployment + HPA (min 2, max 10)
├── worker/            Deployment + HPA per queue
├── web/               Deployment
└── ingress.yaml       NGINX Ingress + cert-manager (Let's Encrypt)
```

### CI/CD (GitHub Actions)

```
.github/workflows/ci.yml:
  lint → type-check → test → build (linux/amd64) → push to GHCR
```

---

## 10. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/i18n_chat

# Redis
REDIS_URL=redis://redis:6379

# Auth
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>

# App URL (used in welcome email links)
APP_URL=https://i18n-chat.institution.be

# LibreTranslate
LIBRETRANSLATE_URL=http://libretranslate:5000

# Email (Brevo SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<pass>
SMTP_FROM=noreply@institution.be

# SMS
SMS_PROVIDER_API_KEY=<key>
SMS_FROM=+32XXXXXXXXX

# WhatsApp (Meta Cloud API)
WA_PHONE_NUMBER_ID=<id>
WA_ACCESS_TOKEN=<token>
WA_WEBHOOK_VERIFY_TOKEN=<token>
WA_BUSINESS_ACCOUNT_ID=<id>

# GDPR
ANONYMOUS_TARGET_TTL_DAYS=30
```
