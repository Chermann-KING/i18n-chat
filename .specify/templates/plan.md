# speckit.plan — i18n-chat

> This document translates the specification into a concrete technical architecture.
> Every decision here is traceable to a requirement in `specify.md`.

---

## 1. Repository Structure

**Strategy**: Monorepo managed with **Turborepo** and **pnpm workspaces**.

```
i18n-chat/
├── apps/
│   ├── api/                  # NestJS — REST API + WebSocket gateway
│   └── web/                  # Next.js 14 — Staff-facing UI
├── packages/
│   ├── database/             # Prisma schema, migrations, seed, generated client
│   ├── domain/               # Shared entities, value objects, exceptions, enums
│   ├── dto/                  # Shared Zod schemas + inferred TypeScript types
│   └── config/               # Shared environment validation (zod + dotenv)
├── infra/
│   ├── docker/               # Dockerfiles per service
│   ├── compose/              # docker-compose.yml (on-premise)
│   └── k8s/                  # Kubernetes manifests (cloud)
├── .specify/                 # Spec-driven development artifacts
├── .husky/                   # Git hooks
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── CLAUDE.md
```

---

## 2. Tech Stack

| Layer                | Technology                        | Version | Rationale                                               |
| -------------------- | --------------------------------- | ------- | ------------------------------------------------------- |
| Frontend             | Next.js (App Router)              | 15      | SSR, file-based routing, React Server Components        |
| UI components        | shadcn/ui + Tailwind CSS          | latest  | Accessible, unstyled primitives, rapid composition      |
| Icons                | Lucide React                      | latest  | Cohesive icon set, tree-shakeable, React-native         |
| i18n (UI)            | next-intl                         | latest  | Type-safe translations for staff interface              |
| Backend API          | NestJS                            | 11      | Modules, DI, guards, interceptors — enterprise-ready    |
| ORM                  | Prisma                            | 5       | Type-safe queries, auto-migrations, clean schema DSL    |
| Database             | PostgreSQL                        | 16      | ACID, JSONB, pgcrypto, full-text search                 |
| Message queue        | BullMQ + Redis                    | 5 / 7   | Job retries, delays, rate-limiting per queue            |
| Translation engine   | LibreTranslate (self-hosted)      | latest  | 0 € cost, GDPR-compliant, ~30 languages                 |
| Auth                 | JWT (NestJS Passport)             | —       | Access token 15 min / Refresh token 7 days, rotated     |
| Validation           | Zod                               | 3       | Runtime + compile-time safety at API boundary           |
| Testing              | Jest + Supertest + Playwright     | —       | Unit, integration, E2E                                  |
| Email                | Nodemailer + Brevo SMTP           | —       | Free tier, reliable deliverability                      |
| SMS                  | Vonage / Twilio-compatible        | —       | Configurable via env; abstracted behind IMessageChannel |
| WhatsApp             | Meta Cloud API (Graph API v18)    | —       | Direct integration; requires pre-approved HSM templates |
| Containerisation     | Docker + Docker Compose           | —       | On-premise deployment                                   |
| Orchestration        | Kubernetes (Helm charts)          | —       | Cloud deployment                                        |
| Secrets (on-premise) | HashiCorp Vault                   | —       | Injected as env vars at container startup               |
| Secrets (cloud)      | Azure Key Vault / AWS Secrets Mgr | —       | Native secret injection via CSI driver                  |
| Logging              | Pino (structured JSON)            | —       | Low overhead, correlation ID support                    |

---

## 3. Database Schema (Prisma DSL)

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Reference Data ──────────────────────────────────────────────────────────

model Language {
  code      String  @id @db.VarChar(10)   // ISO 639-1, e.g. 'fr', 'nl', 'en'
  label     String
  isActive  Boolean @default(true)

  users                    User[]
  recipients               Recipient[]
  anonymousTargets         AnonymousTarget[]
  templateTranslations     TemplateTranslation[]
  @@map("languages")
}

// ─── Identity & Access ───────────────────────────────────────────────────────

model User {
  id                   String    @id @default(uuid()) @db.Uuid
  email                String    @unique
  passwordHash         String
  role                 UserRole  @default(SENDER)
  preferredLanguageCode String   @default("fr") @db.VarChar(10)
  isActive             Boolean   @default(true)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  preferredLanguage    Language  @relation(fields: [preferredLanguageCode], references: [code])
  refreshTokens        RefreshToken[]
  dispatches           Dispatch[]
  auditLogs            AuditLog[]
  @@map("users")
}

enum UserRole {
  ADMIN
  SENDER
  VIEWER
}

model RefreshToken {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @db.Uuid
  tokenHash   String    @unique
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("refresh_tokens")
}

// ─── Recipients ───────────────────────────────────────────────────────────────

model Recipient {
  id                   String    @id @default(uuid()) @db.Uuid
  fullName             String
  preferredLanguageCode String   @db.VarChar(10)
  isActive             Boolean   @default(true)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  preferredLanguage    Language  @relation(fields: [preferredLanguageCode], references: [code])
  channels             RecipientChannel[]
  messages             Message[]
  variableSets         DispatchVariableSet[]
  @@map("recipients")
}

model RecipientChannel {
  id           String         @id @default(uuid()) @db.Uuid
  recipientId  String         @db.Uuid
  channel      MessageChannel
  /// Encrypted at rest via pgcrypto (email or E.164 phone number)
  contact      String
  isActive     Boolean        @default(true)
  createdAt    DateTime       @default(now())

  recipient    Recipient      @relation(fields: [recipientId], references: [id], onDelete: Cascade)
  @@unique([recipientId, channel])
  @@map("recipient_channels")
}

enum MessageChannel {
  EMAIL
  SMS
  WHATSAPP
}

// ─── Templates ────────────────────────────────────────────────────────────────

model Template {
  id          String    @id @default(uuid()) @db.Uuid
  slug        String    @unique  // e.g. 'appointment_reminder'
  category    String
  createdById String    @db.Uuid
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  createdBy   User      @relation(fields: [createdById], references: [id])
  variables   TemplateVariable[]
  translations TemplateTranslation[]
  dispatches  Dispatch[]
  @@map("templates")
}

model TemplateVariable {
  id           String    @id @default(uuid()) @db.Uuid
  templateId   String    @db.Uuid
  key          String    // e.g. 'prenom', 'date', 'lieu'
  label        String    // UI label shown to sender
  isRequired   Boolean   @default(true)
  defaultValue String?

  template     Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  @@unique([templateId, key])
  @@map("template_variables")
}

model TemplateTranslation {
  id                   String               @id @default(uuid()) @db.Uuid
  templateId           String               @db.Uuid
  languageCode         String               @db.VarChar(10)
  subject              String?              // For email channel
  body                 String               // Handlebars template string
  /// WhatsApp-specific — name of the approved HSM template in Meta
  waTemplateName       String?
  waTemplateStatus     WaTemplateStatus     @default(NOT_SUBMITTED)
  waTemplateCategory   WaTemplateCategory?
  waTemplateMetaId     String?
  createdAt            DateTime             @default(now())
  updatedAt            DateTime             @updatedAt

  template             Template             @relation(fields: [templateId], references: [id], onDelete: Cascade)
  language             Language             @relation(fields: [languageCode], references: [code])
  @@unique([templateId, languageCode])
  @@map("template_translations")
}

enum WaTemplateStatus {
  NOT_SUBMITTED
  PENDING
  APPROVED
  REJECTED
}

enum WaTemplateCategory {
  UTILITY
  MARKETING
  AUTHENTICATION
}

// ─── Dispatches ───────────────────────────────────────────────────────────────

model Dispatch {
  id               String         @id @default(uuid()) @db.Uuid
  createdById      String         @db.Uuid
  recipientMode    RecipientMode
  templateId       String?        @db.Uuid
  freeTextOriginal String?        // Non-null when recipientMode = ANONYMOUS + free-text
  status           DispatchStatus @default(DRAFT)
  scheduledAt      DateTime?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  createdBy        User           @relation(fields: [createdById], references: [id])
  template         Template?      @relation(fields: [templateId], references: [id])
  anonymousTargets AnonymousTarget[]
  variableSets     DispatchVariableSet[]
  messages         Message[]
  @@map("dispatches")
}

enum RecipientMode {
  REGISTERED
  ANONYMOUS
}

enum DispatchStatus {
  DRAFT
  QUEUED
  SENDING
  DONE
  FAILED
}

model AnonymousTarget {
  id           String         @id @default(uuid()) @db.Uuid
  dispatchId   String         @db.Uuid
  channel      MessageChannel
  /// Encrypted at rest
  contact      String
  languageCode String         @db.VarChar(10)
  variables    Json           @default("{}")
  /// Scheduled for deletion 30 days after dispatch creation (GDPR)
  purgeAt      DateTime
  createdAt    DateTime       @default(now())

  dispatch     Dispatch       @relation(fields: [dispatchId], references: [id], onDelete: Cascade)
  language     Language       @relation(fields: [languageCode], references: [code])
  messages     Message[]
  variableSets DispatchVariableSet[]
  @@map("anonymous_targets")
}

model DispatchVariableSet {
  id                  String           @id @default(uuid()) @db.Uuid
  dispatchId          String           @db.Uuid
  /// Null = global values applied to all recipients in the dispatch
  recipientId         String?          @db.Uuid
  anonymousTargetId   String?          @db.Uuid
  variables           Json             // { "prenom": "Amina", "date": "30/03/2026" }

  dispatch            Dispatch         @relation(fields: [dispatchId], references: [id], onDelete: Cascade)
  recipient           Recipient?       @relation(fields: [recipientId], references: [id])
  anonymousTarget     AnonymousTarget? @relation(fields: [anonymousTargetId], references: [id])
  @@map("dispatch_variable_sets")
}

// ─── Messages ─────────────────────────────────────────────────────────────────

model Message {
  id                  String         @id @default(uuid()) @db.Uuid
  dispatchId          String         @db.Uuid
  /// Exactly one of these is set
  recipientId         String?        @db.Uuid
  anonymousTargetId   String?        @db.Uuid
  channel             MessageChannel
  languageCode        String         @db.VarChar(10)
  translatedBody      String
  status              MessageStatus  @default(PENDING)
  /// Message ID returned by the channel provider
  providerMessageId   String?
  errorDetails        Json?
  sentAt              DateTime?
  deliveredAt         DateTime?
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  dispatch            Dispatch       @relation(fields: [dispatchId], references: [id])
  recipient           Recipient?     @relation(fields: [recipientId], references: [id])
  anonymousTarget     AnonymousTarget? @relation(fields: [anonymousTargetId], references: [id])
  @@map("messages")
}

enum MessageStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
}

// ─── Audit ────────────────────────────────────────────────────────────────────

/// Append-only. No UPDATE or DELETE allowed on this table.
model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String?  @db.Uuid
  action     String   // e.g. 'dispatch.created', 'template.updated'
  entityType String
  entityId   String   @db.Uuid
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now())

  user       User?    @relation(fields: [userId], references: [id])
  @@map("audit_logs")
}
```

---

## 4. API Module Architecture (NestJS)

```
apps/api/src/
├── main.ts                          # Bootstrap, Swagger, global pipes/filters
├── app.module.ts                    # Root module
├── common/
│   ├── exceptions/                  # AppException base + domain exceptions
│   ├── filters/                     # GlobalExceptionFilter
│   ├── guards/                      # JwtAuthGuard, RolesGuard
│   ├── interceptors/                # LoggingInterceptor, CorrelationIdInterceptor
│   ├── decorators/                  # @CurrentUser(), @Roles()
│   └── pipes/                       # ZodValidationPipe
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts       # POST /auth/login, /auth/refresh, /auth/logout
│   │   ├── auth.service.ts
│   │   ├── strategies/              # JwtStrategy, JwtRefreshStrategy
│   │   └── dto/
│   ├── user/
│   ├── language/
│   ├── recipient/
│   │   ├── recipient.module.ts
│   │   ├── recipient.controller.ts
│   │   ├── recipient.service.ts
│   │   ├── recipient.repository.ts  # Implements IRecipientRepository
│   │   └── dto/
│   ├── template/
│   │   ├── template.module.ts
│   │   ├── template.controller.ts
│   │   ├── template.service.ts
│   │   ├── template.repository.ts
│   │   ├── translation.service.ts   # Resolves translations + fallback to 'en'
│   │   └── dto/
│   ├── dispatch/
│   │   ├── dispatch.module.ts
│   │   ├── dispatch.controller.ts
│   │   ├── dispatch.service.ts      # Orchestrates dispatch creation & queuing
│   │   ├── dispatch.repository.ts
│   │   └── dto/
│   ├── message/
│   │   ├── message.module.ts
│   │   ├── message.controller.ts    # GET /messages (delivery status)
│   │   └── message.repository.ts
│   ├── channel/
│   │   ├── channel.module.ts
│   │   ├── interfaces/
│   │   │   └── message-channel.interface.ts  # IMessageChannel
│   │   ├── email/
│   │   │   └── email.channel.ts
│   │   ├── sms/
│   │   │   └── sms.channel.ts
│   │   └── whatsapp/
│   │       ├── whatsapp.channel.ts
│   │       └── whatsapp-template.service.ts  # Meta submission & status sync
│   ├── queue/
│   │   ├── queue.module.ts
│   │   ├── dispatch.producer.ts     # Enqueues message jobs
│   │   └── workers/
│   │       ├── email.worker.ts
│   │       ├── sms.worker.ts
│   │       └── whatsapp.worker.ts
│   ├── translation/
│   │   ├── translation.module.ts
│   │   └── libre-translate.service.ts  # ITranslationProvider impl
│   └── audit/
│       ├── audit.module.ts
│       └── audit.service.ts         # append-only writes to audit_logs
```

---

## 5. Key Abstractions (Interfaces)

```typescript
// packages/domain/src/ports/message-channel.interface.ts

/**
 * Port interface for message delivery channels.
 * All concrete channels (Email, SMS, WhatsApp) must implement this contract.
 */
export interface IMessageChannel {
  readonly channel: MessageChannel;

  /**
   * Sends a message to a single contact.
   * @returns The provider-assigned message ID.
   */
  send(payload: SendMessagePayload): Promise<string>;

  /**
   * Validates whether a contact value is acceptable for this channel.
   * (E.g. E.164 format for SMS/WhatsApp, RFC 5322 for Email)
   */
  validateContact(contact: string): boolean;
}

// packages/domain/src/ports/translation-provider.interface.ts

/**
 * Port interface for machine-translation providers.
 */
export interface ITranslationProvider {
  /**
   * Translates text from a source language to a target language.
   * @param text - The text to translate.
   * @param targetLanguageCode - ISO 639-1 code of the target language.
   * @param sourceLanguageCode - ISO 639-1 code of the source language (optional, auto-detect if omitted).
   */
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
        ├─── Queue: 'email-messages'   (concurrency: 20)
        ├─── Queue: 'sms-messages'     (concurrency: 10)
        └─── Queue: 'whatsapp-messages'(concurrency: 5, rate: 80/s)
                │
                ▼ (BullMQ Worker)
        Worker reads message from DB
        Renders body (Handlebars + variables)
        Calls IMessageChannel.send()
        Updates message.status
        Emits WebSocket event to frontend
```

**Retry policy**: 3 attempts with exponential backoff (1s, 5s, 30s).
Failed jobs after 3 attempts → `message.status = FAILED`, error stored in `errorDetails`.

---

## 7. Translation Resolution Flow

```
resolveMessageBody(templateId, languageCode, variables):
  1. Find TemplateTranslation WHERE templateId AND languageCode
  2. If not found → find TemplateTranslation WHERE templateId AND languageCode = 'en'
  3. If still not found → throw TemplateTranslationNotFoundException
  4. Compile body with Handlebars using variables
  5. Return rendered string
```

For free-text dispatches:

```
resolveMessageBody(freeText, targetLanguageCode):
  1. If targetLanguageCode = source language → return freeText as-is
  2. Call ITranslationProvider.translate(freeText, targetLanguageCode)
  3. Return translated string
```

---

## 8. Frontend Architecture (Next.js)

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Auth guard + sidebar
│   │   ├── dispatch/
│   │   │   ├── new/                # Compose dispatch (US-01, US-02)
│   │   │   └── [id]/               # Dispatch detail + delivery status
│   │   ├── templates/              # Template management (US-03)
│   │   ├── recipients/             # Recipient management (US-04)
│   │   └── history/                # Dispatch history (US-05)
│   └── api/                        # Next.js route handlers (BFF layer)
├── components/
│   ├── ui/                         # shadcn/ui re-exports
│   ├── dispatch/
│   ├── template/
│   └── recipient/
├── hooks/
├── lib/
│   ├── api-client.ts               # Typed fetch wrapper
│   └── auth.ts                     # Client-side token management
└── messages/                       # next-intl translation files
    ├── fr.json
    ├── nl.json
    └── en.json
```

---

## 9. Infrastructure

### On-Premise (Docker Compose)

```yaml
services:
  postgres:   image: postgres:16-alpine
  redis:      image: redis:7-alpine
  libretranslate: image: libretranslate/libretranslate
  api:        build: ./infra/docker/api
  worker:     build: ./infra/docker/worker   # Same image as api, different CMD
  web:        build: ./infra/docker/web
  nginx:      image: nginx:alpine            # Reverse proxy + TLS termination
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
