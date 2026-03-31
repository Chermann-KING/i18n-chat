# speckit.specify — i18n-chat

> This document describes **what** to build and **why**.
> It does not prescribe the technical implementation — that belongs to `plan.md`.

---

## 1. Problem Statement

Public-sector institutions in Belgium employ staff who communicate with citizens and beneficiaries
from diverse linguistic backgrounds. Today, those staff members either:

- Write messages manually in multiple languages (time-consuming, error-prone),
- Send messages in a single language that many recipients do not understand (exclusionary).

**There is no existing tool** that allows a staff member to compose one message and have it
automatically delivered to each recipient in their own language, across the most widely used
digital communication channels.

---

## 2. Product Vision

**i18n-chat** is a multilingual message dispatch platform that empowers public-sector staff to
reach every citizen in their native language, on the channel they use, without learning to write
in multiple languages themselves.

---

## 3. Users & Roles

| Role     | Description                                                                         |
| -------- | ----------------------------------------------------------------------------------- |
| `ADMIN`  | Manages the platform: agents, languages, templates, recipients, WhatsApp approvals. |
| `SENDER` | Composes and dispatches messages to recipients.                                     |
| `VIEWER` | Read-only access to dispatch history and delivery reports.                          |

---

## 4. Supported Languages

The platform must support at minimum:

| Code | Language | Notes                           |
| ---- | -------- | ------------------------------- |
| `fr` | French   | Staff input language            |
| `nl` | Dutch    | Staff input language            |
| `en` | English  | Staff input language + fallback |
| `ar` | Arabic   | Recipient-facing                |
| `tr` | Turkish  | Recipient-facing                |
| `pl` | Polish   | Recipient-facing                |
| `ro` | Romanian | Recipient-facing                |
| `es` | Spanish  | Recipient-facing                |

Additional languages can be added by an admin at any time.

**Fallback rule**: when no translation exists for a recipient's language, the message is delivered
in the template's configured fallback language (default: **English** `en`).

---

## 5. Delivery Channels

| Channel  | Protocol / Provider           | Notes                                 |
| -------- | ----------------------------- | ------------------------------------- |
| Email    | SMTP / Nodemailer + Brevo     | Subject + HTML body                   |
| SMS      | Carrier gateway (Twilio-like) | Plain text, max 160 chars per segment |
| WhatsApp | Meta Cloud API (direct)       | Pre-approved HSM templates only       |

Each recipient may have one or more channel contacts. Staff selects which channel(s) to use at
dispatch creation time.

---

## 6. Message Strategies

### 6.1 Template-based messages (primary strategy)

A **template** is a reusable message structure created and translated by the admin.
Templates may include dynamic variables using Handlebars syntax: `{{variableName}}`.

Variables have a **type** (TEXT / NUMBER / DATE / TIME) and a **source**:

- `MANUAL` — the sender types the value at dispatch time.
- `RECIPIENT_FIELD` — auto-injected from the recipient's profile (`firstName`, `lastName`).

Examples:

```
"Bonjour {{prenom}}, votre rendez-vous est confirmé pour le {{date}} à {{lieu}}."
"Beste {{prenom}}, uw afspraak is bevestigd op {{datum}} om {{tijdstip}}."
```

Templates used on **WhatsApp** must be submitted to and approved by Meta before use.
Each language version is a separate submission.

### 6.2 Free-text messages (secondary strategy)

A sender may type a free-text message in French, Dutch, or English.
The platform translates this message to each recipient's language using **LibreTranslate**
(self-hosted, 0 € cost). Variable substitution is not available for free-text messages.

**When to use each strategy:**

| Strategy       | Use case                                           |
| -------------- | -------------------------------------------------- |
| Template-based | Official, recurring, or legally sensitive messages |
| Free-text      | Ad-hoc, informal, or urgent communications         |

> Free-text messages **cannot** be sent via WhatsApp (Meta requires pre-approved templates).

---

## 7. Recipient Modes

The sender toggles between two recipient modes when composing a dispatch:

### 7.1 Registered recipients

Profiles stored in the platform's database. Each profile holds:

- First name + last name
- Preferred language
- One or more channel contacts (email / phone number)

### 7.2 Anonymous recipients

No profile stored beyond the lifetime of the dispatch. The sender provides:

- Contact value (email address or phone number)
- Channel (email / SMS / WhatsApp)
- Language code

This data is purged automatically after **30 days** (GDPR compliance).

---

## 8. User Scenarios

### US-01 — Staff sends a template dispatch to registered recipients

1. Sender logs in and navigates to "New Dispatch".
2. Sender selects mode: **Registered**.
3. Sender searches for recipients by name or language and adds them to the dispatch.
4. Sender selects a template (e.g. `appointment_reminder`).
5. Sender fills in the variable values globally (`date: 30/03/2026`, `lieu: Salle B`).
6. Sender selects channel(s): Email + WhatsApp.
7. Sender previews the message in each recipient's language.
8. Sender confirms. The platform queues one job per recipient × channel.
9. Each recipient receives the message in their preferred language.
10. Sender monitors delivery status on the dispatch detail page.

### US-02 — Staff sends a free-text dispatch to anonymous recipients

1. Sender navigates to "New Dispatch".
2. Sender selects mode: **Anonymous**.
3. Sender imports a CSV: `email,language` or types contacts manually.
4. Sender types a free-text message in French.
5. Platform auto-translates to each target language via LibreTranslate.
6. Sender selects channel: Email only (WhatsApp not available for free-text).
7. Sender previews translated messages.
8. Sender confirms. Jobs are queued and executed.
9. Anonymous data scheduled for deletion after 30 days.

### US-03 — Admin manages templates

1. Admin navigates to "Templates".
2. Admin creates a new template: name, slug, category, fallback language, and variable schema.
3. For each variable, Admin sets its type (TEXT / NUMBER / DATE / TIME) and source (MANUAL or RECIPIENT_FIELD).
4. Admin adds translations for each supported language (with per-language variable labels).
5. For WhatsApp-eligible templates: Admin submits translations to Meta for approval.
6. Admin monitors approval status per language.
7. Once approved, the template becomes available to senders for WhatsApp dispatches.

### US-04 — Admin manages recipients

1. Admin creates, edits, or deactivates recipient profiles (first name, last name, preferred language).
2. Admin adds channel contacts per recipient (email / phone / WhatsApp number).

### US-05 — Viewer monitors delivery

1. Viewer navigates to "Dispatch History".
2. Viewer filters by date, channel, status, or sender.
3. Viewer opens a dispatch to see per-message delivery status (sent / delivered / failed).
4. Viewer exports a delivery report as CSV.

### US-06 — Admin manages staff agents

1. Admin navigates to "Agents" (visible to ADMIN role only).
2. Admin creates a new agent: email, optional first/last name, role, preferred interface language, temporary password.
3. The new agent receives a **personalized welcome email** with their credentials and the login URL.
4. On first login to the application, the agent is shown a **password change modal** displaying the complexity rules. The agent can change their password immediately or dismiss it permanently ("Later").
5. The interface redirects the agent to their **preferred locale** after login.
6. Admin can edit an agent's role or reset their password at any time.
7. Admin can deactivate or reactivate an agent (soft-delete — FK references are preserved).

### US-07 — Agent manages their own profile and preferences

1. Agent navigates to "Settings".
2. Agent updates their display name (first name, last name).
3. Agent changes their password (current password required; complexity rules: 8+ chars, uppercase, digit, special character).
4. Agent sets their preferred interface language and display theme (light / dark / system).
5. Agent configures email notification on dispatch failure.

---

## 9. Non-Functional Requirements

| Category             | Requirement                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Security             | Authentication required for all routes. RBAC enforced per endpoint.                                              |
| Password policy      | Minimum 8 characters, maximum 128. Must include at least one uppercase letter, one digit, one special character. |
| GDPR                 | Anonymous targets deleted after 30 days. Audit log for all mutations (append-only).                              |
| Availability         | 99.5 % uptime SLA (on-premise and cloud deployments).                                                            |
| Scalability          | Support dispatches of up to 10 000 recipients without degradation.                                               |
| Observability        | Structured JSON logs (Pino), correlation IDs on every request and job.                                           |
| Internationalisation | Staff UI available in French, Dutch, and English. Login redirects to agent's preferred locale.                   |
| Accessibility        | WCAG 2.1 AA for the web interface.                                                                               |
| Portability          | Full deployment via Docker Compose (on-premise) and Kubernetes (cloud).                                          |

---

## 10. Out of Scope (v1)

- Two-way messaging (recipients replying to messages).
- Push notifications (mobile apps).
- Voice calls.
- AI-generated message content.
- Self-service recipient registration.
- CSV import for recipients.
