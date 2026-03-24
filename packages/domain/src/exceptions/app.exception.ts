/**
 * Base class for all domain-level exceptions.
 * Extend this class to create typed, meaningful exceptions that carry context.
 *
 * @example
 * ```ts
 * throw new AppException('Template not found', 'TEMPLATE_NOT_FOUND', { templateId });
 * ```
 */
export class AppException extends Error {
  /** Machine-readable error code used by the global exception filter. */
  public readonly code: string;

  /** Additional context attached to the error for logging. */
  public readonly context: Record<string, unknown>;

  constructor(message: string, code: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
  }
}
