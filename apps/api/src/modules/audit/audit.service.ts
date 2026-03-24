import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Parameters required to append one entry to the audit log. */
export interface AuditLogParams {
  /** UUID of the staff user who triggered the action. `undefined` for system events. */
  readonly userId?: string;
  /** Dot-namespaced action name, e.g. `'user.created'`, `'template.translation.deleted'`. */
  readonly action: string;
  /** Name of the affected entity type, e.g. `'User'`, `'Template'`. */
  readonly entityType: string;
  /** UUID of the affected entity. */
  readonly entityId: string;
  /** Any additional context useful for auditing (changed fields, IP address, etc.). */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Append-only audit trail service.
 *
 * Every call to {@link log} inserts one row in `audit_logs`.
 * **No UPDATE or DELETE is ever executed on that table.**
 *
 * Inject this service into any module that performs state mutations and call
 * {@link log} after each successful operation.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends one immutable entry to the audit log.
   *
   * Failures are intentionally non-fatal: a logging error must never
   * interrupt the main business flow.  The promise resolves even when
   * the write fails; the error is re-thrown so the caller can decide
   * whether to surface it.
   *
   * @param params - Event descriptor.
   */
  async log(params: AuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
