/**
 * Determines how a template variable's value is resolved at dispatch time.
 *
 * - `MANUAL`: the staff member types the value in the dispatch wizard (e.g. date, lieu).
 * - `RECIPIENT_FIELD`: the value is injected automatically from the recipient's profile
 *   (e.g. firstName → prenom). Staff never sees this field in the wizard.
 */
export enum VariableSource {
  MANUAL = 'MANUAL',
  RECIPIENT_FIELD = 'RECIPIENT_FIELD',
}

/**
 * Recipient profile fields that can be automatically mapped to a template variable.
 * Add entries here when new profile fields become available.
 */
export enum RecipientField {
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
}
