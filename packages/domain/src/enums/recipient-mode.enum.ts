/**
 * Determines how recipients are specified when creating a dispatch.
 *
 * - `REGISTERED`  — recipients are selected from the platform's database.
 * - `ANONYMOUS`   — recipients are provided ad-hoc (email/phone + language);
 *                   their data is purged after 30 days (GDPR).
 */
export enum RecipientMode {
  REGISTERED = 'REGISTERED',
  ANONYMOUS = 'ANONYMOUS',
}
