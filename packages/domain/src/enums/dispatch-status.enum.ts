/**
 * Lifecycle states of a message dispatch.
 *
 * Transitions: DRAFT → QUEUED → SENDING → DONE | FAILED
 */
export enum DispatchStatus {
  DRAFT = 'DRAFT',
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}
