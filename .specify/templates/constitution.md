# speckit.constitution — i18n-chat

> Governing principles that apply to every line of code produced in this project.
> These rules are non-negotiable and take precedence over any implementation convenience.

---

## 1. Language & Runtime

| Concern         | Choice                   |
| --------------- | ------------------------ |
| Language        | TypeScript (strict mode) |
| Runtime         | Node.js ≥ 20 LTS         |
| Package manager | pnpm (workspaces)        |
| Monorepo tool   | Turborepo                |

All TypeScript files **must** compile with zero errors under `strict: true`.
No `any` type is allowed — use `unknown` and narrow explicitly.

---

## 2. Clean Code Principles

### 2.1 Naming

- **Variables & parameters**: `camelCase`, descriptive nouns.
  ✅ `recipientLanguageCode` ✗ `lang`, `l`, `x`
- **Functions**: `camelCase`, start with an action verb.
  ✅ `resolveTemplateTranslation()` ✗ `translation()`, `doStuff()`
- **Classes & Interfaces**: `PascalCase`.
  ✅ `DispatchService`, `IRecipientRepository`
- **Enums**: `PascalCase` for the type; `SCREAMING_SNAKE_CASE` for members.
  ```ts
  enum MessageChannel {
    EMAIL = 'email',
    SMS = 'sms',
    WHATSAPP = 'whatsapp',
  }
  ```
- **Types**: `PascalCase` with a `T` prefix for generic utility types.
  ✅ `type TPagedResult<T> = { data: T[]; total: number }`
- **Interfaces**: `PascalCase` with an `I` prefix for dependency abstractions.
  ✅ `interface ITranslationProvider`
- **Constants**: `SCREAMING_SNAKE_CASE` at module level.
  ✅ `const FALLBACK_LANGUAGE_CODE = 'en'`
- **Files**: `kebab-case`.
  ✅ `dispatch.service.ts`, `recipient.repository.ts`
- **Folders / modules**: `kebab-case`, singular.
  ✅ `template/`, `recipient/`, `channel/`

### 2.2 Functions

- **Single Responsibility**: one function does one thing.
- **Small**: aim for ≤ 20 lines; never exceed 40 without strong justification.
- **No side effects** in pure helpers — isolate I/O to services.
- **Avoid boolean flag parameters** — split into two functions instead.
- **Max 3 parameters** — use an options object beyond that.
- **Early returns** over deeply nested conditions.

### 2.3 Classes & Modules

- **One class per file**.
- **No god classes** — a class must own one cohesive responsibility.
- **Constructors** inject dependencies only; no logic in constructors.
- **Public surface minimal** — default to `private`; expose only what callers need.

### 2.4 Comments & Documentation

- Code must be self-explanatory through good naming.
  Add a comment only when the _why_ is not obvious from the _what_.
- **JSDoc is mandatory** for every public class, method, function, type, interface and enum:

  ```ts
  /**
   * Resolves the best available translation for a given template and language.
   * Falls back to English (`en`) when no translation exists for the target language.
   *
   * @param templateId - UUID of the template to look up.
   * @param languageCode - ISO 639-1 target language code (e.g. `'fr'`, `'nl'`).
   * @returns The resolved {@link TemplateTranslation} or `null` if none found.
   * @throws {TemplateNotFoundException} When the template does not exist.
   */
  async resolveTemplateTranslation(
    templateId: string,
    languageCode: string,
  ): Promise<TemplateTranslation | null>
  ```

- **TODO comments** must include a ticket reference: `// TODO(#42): replace with streaming API`
- No commented-out code committed to the repository.

### 2.5 Error Handling

- Never swallow errors silently (`catch (e) {}`).
- Use typed, domain-specific exceptions extending a base `AppException`.
- Always log the full error context (correlation ID, user ID, entity ID).
- Propagate errors to a global exception filter at the API boundary.

### 2.6 Magic Values

- Zero magic strings or numbers in business logic.
  ✅ `FALLBACK_LANGUAGE_CODE` ✗ `'en'` hardcoded inline.

---

## 3. SOLID Principles

### S — Single Responsibility Principle

Each class/module has exactly one reason to change.
`DispatchService` orchestrates dispatch creation. It does **not** send emails — that is `EmailChannel`'s responsibility.

### O — Open/Closed Principle

Extend behavior through new classes, not by modifying existing ones.
Adding a new channel (e.g. Telegram) requires creating a new `TelegramChannel` class that implements `IMessageChannel` — zero changes to `DispatchService`.

### L — Liskov Substitution Principle

Any `IMessageChannel` implementation must be drop-in substitutable without changing caller behavior.
Concrete channels (`EmailChannel`, `SmsChannel`, `WhatsAppChannel`) must honor the full contract of `IMessageChannel`.

### I — Interface Segregation Principle

Prefer narrow, focused interfaces over wide ones.
`IMessageChannel` exposes only `send()` and `validateContact()`.
`IMetaTemplateProvider` exposes only `submit()` and `syncStatus()`.

### D — Dependency Inversion Principle

High-level modules depend on abstractions, not on concretions.
`DispatchService` depends on `IRecipientRepository`, `ITemplateRepository`, and `IMessageChannel[]` — never on Prisma clients or Twilio SDKs directly.

---

## 4. Architecture Rules

- **No circular dependencies** between modules.
- **Domain layer** (`entities`, `value-objects`, `exceptions`) must have zero infrastructure imports.
- **Application layer** (`services`, `use-cases`) depends only on domain and port interfaces.
- **Infrastructure layer** (`repositories`, `channels`, `prisma`) implements the ports.
- **No raw SQL** — use Prisma query builder; raw queries require a documented justification.
- **All database mutations** go through a repository interface.

---

## 5. Security Standards

- All user inputs validated with `zod` at the API boundary before reaching any service.
- Passwords hashed with `argon2` (never bcrypt, never MD5/SHA1 alone).
- JWT access tokens: 15-minute expiry. Refresh tokens: 7-day expiry, rotated on use.
- Secrets loaded exclusively from environment variables — never hardcoded.
- All personal data (emails, phone numbers) encrypted at rest with `pgcrypto`.
- Audit log entries are **immutable** — no `UPDATE` or `DELETE` on `audit_logs`.
- Rate limiting applied on every public endpoint via NestJS `ThrottlerGuard`.
- CORS restricted to known origins (configured per environment).

---

## 6. Testing Standards

- **Unit tests**: every service and use-case function, using Jest + mock repositories.
- **Integration tests**: every API endpoint, using a real PostgreSQL test database.
- **E2E tests**: critical user flows (login, create dispatch, send message).
- Minimum coverage threshold: **80%** on lines and branches.
- Test file naming: `*.spec.ts` (unit) / `*.e2e-spec.ts` (e2e).
- Tests must be **deterministic** — no `Date.now()` inline; inject a clock abstraction.

---

## 7. Performance Baselines

| Metric                   | Target                     |
| ------------------------ | -------------------------- |
| API response (read)      | p95 < 200 ms               |
| API response (write)     | p95 < 500 ms               |
| Message queue throughput | ≥ 500 msg/s                |
| Dispatch creation        | < 1 s for 5 000 recipients |
| DB query (indexed)       | p95 < 50 ms                |

---

## 8. Icons (UI — Next.js)

- **All icons must come exclusively from `lucide-react`** — no inline SVG, no other icon library.
- Import only the icons actually used (tree-shaking): `import { Send, User, Globe } from 'lucide-react'`.
- Always pair an icon with an accessible label when it carries meaning:
  ```tsx
  <button aria-label="Envoyer le message">
    <Send size={16} aria-hidden="true" />
  </button>
  ```
- Use the `size` prop for scaling — never CSS `width`/`height` overrides on the SVG directly.
- Decorative icons must have `aria-hidden="true"`.

---

## 9. Accessibility (UI — Next.js)

- WCAG 2.1 Level AA compliance mandatory.
- All interactive elements reachable via keyboard.
- All images and icons have `aria-label` or `alt` text.
- Color contrast ratio ≥ 4.5:1 for body text.
- Form fields linked to `<label>` elements via `htmlFor` / `id`.
- Error states announced to screen readers via `aria-describedby`.

---

## 9. Git & Collaboration

- Commits follow **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Branch naming: `feat/<ticket>-short-description`, `fix/<ticket>-short-description`.
- PRs require at least one reviewer approval before merge.
- `main` branch is protected — no direct push.
- Linting and type-check must pass before any commit (Husky pre-commit hook).

---

## 10. Tooling

| Tool         | Purpose                          |
| ------------ | -------------------------------- |
| Lucide React | Icon library (all icons)         |
| ESLint       | Linting (Airbnb + custom rules)  |
| Prettier     | Code formatting                  |
| Husky        | Git hooks                        |
| lint-staged  | Run linters only on staged files |
| Jest         | Unit & integration testing       |
| Playwright   | E2E testing                      |
| Prisma       | ORM & migrations                 |
| Zod          | Runtime schema validation        |
