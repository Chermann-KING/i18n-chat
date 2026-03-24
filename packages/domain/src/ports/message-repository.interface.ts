import type { MessageChannel } from '../enums/message-channel.enum';
import type { MessageStatus } from '../enums/message-status.enum';

// ─── Entity Shapes ────────────────────────────────────────────────────────────

/** Domain view of a single outbound message. */
export interface MessageEntity {
  readonly id: string;
  readonly dispatchId: string;
  readonly recipientId: string | null;
  readonly anonymousTargetId: string | null;
  readonly channel: MessageChannel;
  readonly languageCode: string;
  readonly translatedBody: string;
  readonly status: MessageStatus;
  readonly providerMessageId: string | null;
  readonly errorDetails: Record<string, unknown> | null;
  readonly sentAt: Date | null;
  readonly deliveredAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ─── Input Types ──────────────────────────────────────────────────────────────

/** Data required to create a new outbound message record. */
export interface CreateMessageData {
  readonly dispatchId: string;
  readonly recipientId?: string;
  readonly anonymousTargetId?: string;
  readonly channel: MessageChannel;
  readonly languageCode: string;
  readonly translatedBody: string;
}

/** Data for updating a message's delivery state after a send attempt. */
export interface UpdateMessageStatusData {
  readonly status: MessageStatus;
  readonly providerMessageId?: string;
  readonly errorDetails?: Record<string, unknown>;
  readonly sentAt?: Date;
  readonly deliveredAt?: Date;
}

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * Port interface for outbound message persistence operations.
 *
 * Implementations live in `apps/api` and use Prisma.
 * Services depend on this interface — never on the concrete class.
 */
export interface IMessageRepository {
  /**
   * Persists a new outbound message record.
   *
   * @param data - Fields required to create the message.
   * @returns The newly created message entity.
   */
  create(data: CreateMessageData): Promise<MessageEntity>;

  /**
   * Returns all messages belonging to a dispatch.
   *
   * @param dispatchId - UUID of the parent dispatch.
   */
  findByDispatchId(dispatchId: string): Promise<MessageEntity[]>;

  /**
   * Finds a single message by its UUID.
   *
   * @param id - Message UUID.
   * @returns The message entity, or `null` if not found.
   */
  findById(id: string): Promise<MessageEntity | null>;

  /**
   * Updates the delivery status of a message after a send attempt.
   *
   * Called by queue workers after each delivery attempt (success or failure).
   *
   * @param id - Message UUID.
   * @param data - New status and optional provider details.
   * @returns The updated message entity.
   */
  updateStatus(id: string, data: UpdateMessageStatusData): Promise<MessageEntity>;
}
