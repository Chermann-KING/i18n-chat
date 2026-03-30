import type { DispatchStatus } from '../enums/dispatch-status.enum';
import type { MessageChannel } from '../enums/message-channel.enum';
import type { RecipientMode } from '../enums/recipient-mode.enum';
import type { PagedResult } from './paged-result.type';

// ─── Entity Shapes ────────────────────────────────────────────────────────────

/** Domain view of a dispatch operation. */
export interface DispatchEntity {
  readonly id: string;
  readonly createdById: string;
  readonly recipientMode: RecipientMode;
  readonly templateId: string | null;
  /** Denormalized template name — populated by list/detail queries for display purposes. */
  readonly templateName?: string | null;
  readonly freeTextOriginal: string | null;
  readonly status: DispatchStatus;
  readonly scheduledAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Domain view of an anonymous dispatch target. */
export interface AnonymousTargetEntity {
  readonly id: string;
  readonly dispatchId: string;
  readonly channel: MessageChannel;
  /** Decrypted by the repository before returning. */
  readonly contact: string;
  readonly languageCode: string;
  readonly variables: Record<string, string>;
  readonly purgeAt: Date;
  readonly createdAt: Date;
}

/** Domain view of per-recipient variable values within a dispatch. */
export interface DispatchVariableSetEntity {
  readonly id: string;
  readonly dispatchId: string;
  readonly recipientId: string | null;
  readonly anonymousTargetId: string | null;
  readonly variables: Record<string, string>;
}

// ─── Input Types ──────────────────────────────────────────────────────────────

/** Data required to create a new dispatch. */
export interface CreateDispatchData {
  readonly createdById: string;
  readonly recipientMode: RecipientMode;
  readonly templateId?: string;
  readonly freeTextOriginal?: string;
  readonly scheduledAt?: Date;
}

/** Data required to create an anonymous dispatch target. */
export interface CreateAnonymousTargetData {
  readonly channel: MessageChannel;
  /** Plain-text contact value — encrypted by the repository before persistence. */
  readonly contact: string;
  readonly languageCode: string;
  readonly variables: Record<string, string>;
  readonly purgeAt: Date;
}

/** Data required to store per-recipient variable values. */
export interface CreateVariableSetData {
  readonly recipientId?: string;
  readonly anonymousTargetId?: string;
  readonly variables: Record<string, string>;
}

/** Filtering and pagination options for dispatch list queries. */
export interface FindDispatchesOptions {
  readonly createdById?: string;
  readonly status?: DispatchStatus;
  readonly recipientMode?: RecipientMode;
  readonly page?: number;
  readonly limit?: number;
}

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * Port interface for dispatch persistence operations.
 *
 * Implementations live in `apps/api` and use Prisma.
 * Services depend on this interface — never on the concrete class.
 */
export interface IDispatchRepository {
  /**
   * Finds a single dispatch by its UUID.
   *
   * @param id - Dispatch UUID.
   * @returns The dispatch entity, or `null` if not found.
   */
  findById(id: string): Promise<DispatchEntity | null>;

  /**
   * Returns a paginated list of dispatches matching the given filters.
   *
   * @param options - Optional filters and pagination parameters.
   */
  findAll(options?: FindDispatchesOptions): Promise<PagedResult<DispatchEntity>>;

  /**
   * Persists a new dispatch record.
   *
   * @param data - Fields required to create the dispatch.
   * @returns The newly created dispatch entity.
   */
  create(data: CreateDispatchData): Promise<DispatchEntity>;

  /**
   * Updates the processing status of a dispatch.
   *
   * @param id - Dispatch UUID.
   * @param status - New status value.
   */
  updateStatus(id: string, status: DispatchStatus): Promise<void>;

  /**
   * Adds an anonymous target to an existing dispatch.
   *
   * @param dispatchId - UUID of the parent dispatch.
   * @param data - Contact and variable data for the anonymous target.
   * @returns The created anonymous target entity.
   */
  createAnonymousTarget(
    dispatchId: string,
    data: CreateAnonymousTargetData,
  ): Promise<AnonymousTargetEntity>;

  /**
   * Stores per-recipient or global variable values for a dispatch.
   *
   * @param dispatchId - UUID of the parent dispatch.
   * @param data - Variable set data (global or per-recipient).
   * @returns The created variable set entity.
   */
  createVariableSet(
    dispatchId: string,
    data: CreateVariableSetData,
  ): Promise<DispatchVariableSetEntity>;

  /**
   * Returns all anonymous targets for a dispatch.
   *
   * @param dispatchId - Dispatch UUID.
   */
  findAnonymousTargets(dispatchId: string): Promise<AnonymousTargetEntity[]>;

  /**
   * Returns all variable sets for a dispatch.
   *
   * @param dispatchId - Dispatch UUID.
   */
  findVariableSets(dispatchId: string): Promise<DispatchVariableSetEntity[]>;
}
