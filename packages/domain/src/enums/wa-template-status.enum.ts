/**
 * Approval status of a WhatsApp message template as reported by Meta.
 *
 * Templates must reach `APPROVED` before they can be used in WhatsApp dispatches.
 */
export enum WaTemplateStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
