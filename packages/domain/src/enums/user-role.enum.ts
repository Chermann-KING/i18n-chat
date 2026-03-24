/**
 * Access control roles for platform users.
 *
 * - `ADMIN`  — full access: users, languages, templates, WhatsApp approvals.
 * - `SENDER` — can compose and dispatch messages.
 * - `VIEWER` — read-only access to dispatch history and delivery reports.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  SENDER = 'SENDER',
  VIEWER = 'VIEWER',
}
