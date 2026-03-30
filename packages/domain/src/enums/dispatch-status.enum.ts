/**
 * Lifecycle states of a message dispatch.
 *
 * Transitions: DRAFT → QUEUED → IN_PROGRESS → DONE | FAILED | CANCELLED
 */
export enum DispatchStatus {
  DRAFT = 'DRAFT',
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}
