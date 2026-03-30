import type { MessageChannel } from '../enums/message-channel.enum';
import type { PagedResult } from './paged-result.type';

// ─── Entity Shapes ────────────────────────────────────────────────────────────

/** Domain view of a recipient's contact channel. */
export interface RecipientChannelEntity {
  readonly id: string;
  readonly recipientId: string;
  readonly channel: MessageChannel;
  /** Decrypted by the repository before returning. */
  readonly contact: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

/** Domain view of a registered recipient profile. */
export interface RecipientEntity {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly preferredLanguageCode: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly channels?: RecipientChannelEntity[];
}

// ─── Input Types ──────────────────────────────────────────────────────────────

/** Data required to create a new recipient. */
export interface CreateRecipientData {
  readonly firstName: string;
  readonly lastName: string;
  readonly preferredLanguageCode: string;
}

/** Partial data allowed when updating an existing recipient. */
export interface UpdateRecipientData {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly preferredLanguageCode?: string;
  readonly isActive?: boolean;
}

/** Data required to register a contact channel for a recipient. */
export interface AddChannelData {
  readonly channel: MessageChannel;
  /** Plain-text contact value — encrypted by the repository before persistence. */
  readonly contact: string;
}

/** Filtering and pagination options for recipient list queries. */
export interface FindRecipientsOptions {
  readonly preferredLanguageCode?: string;
  readonly isActive?: boolean;
  readonly page?: number;
  readonly limit?: number;
}

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * Port interface for recipient persistence operations.
 *
 * Implementations (e.g. `RecipientRepository`) live in `apps/api` and use Prisma.
 * Services depend on this interface — never on the concrete class.
 */
export interface IRecipientRepository {
  /**
   * Finds a single recipient by its UUID.
   *
   * @param id - Recipient UUID.
   * @returns The recipient entity, or `null` if not found.
   */
  findById(id: string): Promise<RecipientEntity | null>;

  /**
   * Returns a paginated list of recipients matching the given filters.
   *
   * @param options - Optional filters and pagination parameters.
   */
  findAll(options?: FindRecipientsOptions): Promise<PagedResult<RecipientEntity>>;

  /**
   * Persists a new recipient profile.
   *
   * @param data - Fields required to create the recipient.
   * @returns The newly created recipient entity.
   */
  create(data: CreateRecipientData): Promise<RecipientEntity>;

  /**
   * Updates an existing recipient profile.
   *
   * @param id - UUID of the recipient to update.
   * @param data - Fields to update (partial).
   * @returns The updated recipient entity.
   */
  update(id: string, data: UpdateRecipientData): Promise<RecipientEntity>;

  /**
   * Soft-deletes a recipient (sets `isActive = false`).
   *
   * @param id - UUID of the recipient to deactivate.
   */
  delete(id: string): Promise<void>;

  /**
   * Registers a new contact channel for a recipient.
   *
   * @param recipientId - UUID of the owning recipient.
   * @param data - Channel type and contact value.
   * @returns The created channel entity.
   */
  addChannel(recipientId: string, data: AddChannelData): Promise<RecipientChannelEntity>;

  /**
   * Removes a contact channel from a recipient.
   *
   * @param recipientId - UUID of the owning recipient.
   * @param channel - The channel type to remove.
   */
  removeChannel(recipientId: string, channel: MessageChannel): Promise<void>;

  /**
   * Returns all active contact channels for a recipient.
   *
   * @param recipientId - UUID of the recipient.
   */
  findChannels(recipientId: string): Promise<RecipientChannelEntity[]>;
}
