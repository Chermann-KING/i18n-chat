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

| Role     | Description                                                            |
| -------- | ---------------------------------------------------------------------- |
| `admin`  | Manages the platform: users, languages, templates, WhatsApp approvals. |
| `sender` | Composes and dispatches messages to recipients.                        |
| `viewer` | Read-only access to dispatch history and delivery reports.             |

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
in **English** (`en`). This is configurable per template.

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

Examples:

```
"Bonjour {{prenom}}, votre rendez-vous est confirmé pour le {{date}} à {{lieu}}."
"Beste {{prenom}}, uw afspraak is bevestigd op {{datum}} om {{tijdstip}}."
```

Variable values are provided by the sender at dispatch creation time, either globally
(same value for all recipients) or per recipient.

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

- Full name
- Preferred language
- One or more channel contacts (email / phone number)

Senders search, filter, or import recipient lists from the database.

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
2. Admin creates a new template: sets slug, category, and variable schema.
3. Admin adds translations for each supported language.
4. For WhatsApp-eligible templates: Admin submits translations to Meta for approval.
5. Admin monitors approval status per language.
6. Once approved, the template becomes available to senders for WhatsApp dispatches.

### US-04 — Admin manages recipients

1. Admin creates, edits, or deactivates recipient profiles.
2. Admin adds channel contacts per recipient.
3. Admin imports recipients via CSV.

### US-05 — Viewer monitors delivery

1. Viewer navigates to "Dispatch History".
2. Viewer filters by date, channel, status, or sender.
3. Viewer opens a dispatch to see per-message delivery status (sent / delivered / failed).
4. Viewer exports a delivery report as CSV.

---

## 9. Non-Functional Requirements

| Category             | Requirement                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| Security             | Authentication required for all routes. RBAC enforced per endpoint.     |
| GDPR                 | Anonymous targets deleted after 30 days. Audit log for all mutations.   |
| Availability         | 99.5 % uptime SLA (on-premise and cloud deployments).                   |
| Scalability          | Support dispatches of up to 10 000 recipients without degradation.      |
| Observability        | Structured JSON logs, correlation IDs on every request and job.         |
| Internationalisation | Staff UI available in French, Dutch, and English.                       |
| Accessibility        | WCAG 2.1 AA for the web interface.                                      |
| Portability          | Full deployment via Docker Compose (on-premise) and Kubernetes (cloud). |

---

## 10. Out of Scope (v1)

- Two-way messaging (recipients replying to messages).
- Push notifications (mobile apps).
- Voice calls.
- AI-generated message content.
- Self-service recipient registration.
