/**
 * Delivery states of an individual message sent to a recipient.
 *
 * Transitions: PENDING → SENT → DELIVERED | FAILED
 */
export enum MessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}
