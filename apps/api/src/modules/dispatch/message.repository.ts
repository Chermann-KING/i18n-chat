import { Injectable } from '@nestjs/common';
import { MessageChannel, MessageStatus } from '@i18n-chat/domain';
import type {
  CreateMessageData,
  IMessageRepository,
  MessageEntity,
  UpdateMessageStatusData,
} from '@i18n-chat/domain';
import type {
  MessageChannel as PrismaChannel,
  MessageStatus as PrismaStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';

/**
 * Prisma-backed implementation of {@link IMessageRepository}.
 *
 * Stores one outbound message record per (recipient × channel) combination
 * created during a dispatch.
 */
@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /** @inheritdoc */
  async create(data: CreateMessageData): Promise<MessageEntity> {
    const row = await this.prisma.message.create({
      data: {
        dispatchId: data.dispatchId,
        recipientId: data.recipientId,
        anonymousTargetId: data.anonymousTargetId,
        channel: data.channel as unknown as PrismaChannel,
        languageCode: data.languageCode,
        translatedBody: data.translatedBody,
      },
    });
    return this.toEntity(row);
  }

  /** @inheritdoc */
  async findByDispatchId(dispatchId: string): Promise<MessageEntity[]> {
    const rows = await this.prisma.message.findMany({
      where: { dispatchId },
      include: {
        recipient: { select: { firstName: true, lastName: true } },
        anonymousTarget: { select: { contact: true } },
      },
    });
    return rows.map((r) => this.toEntity(r));
  }

  /** @inheritdoc */
  async findById(id: string): Promise<MessageEntity | null> {
    const row = await this.prisma.message.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  async updateStatus(id: string, data: UpdateMessageStatusData): Promise<MessageEntity> {
    const row = await this.prisma.message.update({
      where: { id },
      data: {
        status: data.status as unknown as PrismaStatus,
        providerMessageId: data.providerMessageId,
        errorDetails: (data.errorDetails as object) ?? undefined,
        sentAt: data.sentAt,
        deliveredAt: data.deliveredAt,
      },
    });
    return this.toEntity(row);
  }

  /**
   * Returns a map of dispatchId → message count for the given dispatch IDs.
   * Uses a single GROUP BY query — O(1) regardless of the number of dispatches.
   *
   * @param dispatchIds - UUIDs of the dispatches to count messages for.
   */
  async countByDispatchIds(dispatchIds: string[]): Promise<Map<string, number>> {
    const groups = await this.prisma.message.groupBy({
      by: ['dispatchId'],
      where: { dispatchId: { in: dispatchIds } },
      _count: { id: true },
    });
    // eslint-disable-next-line no-underscore-dangle
    return new Map(groups.map((g) => [g.dispatchId, g._count.id]));
  }

  /**
   * Checks whether all messages for a dispatch have reached a terminal state
   * (SENT, DELIVERED, or FAILED) and updates the dispatch status accordingly.
   *
   * - All FAILED → `FAILED`
   * - Otherwise → `DONE`
   *
   * Does nothing if any message is still PENDING.
   *
   * @param dispatchId - UUID of the parent dispatch.
   */
  async finalizeDispatchIfComplete(dispatchId: string): Promise<void> {
    const messages = await this.prisma.message.findMany({
      where: { dispatchId },
      select: { status: true },
    });

    const terminal = new Set(['SENT', 'DELIVERED', 'FAILED']);
    const allTerminal = messages.length > 0 && messages.every((m) => terminal.has(m.status));
    if (!allTerminal) return;

    const allFailed = messages.every((m) => m.status === 'FAILED');
    await this.prisma.dispatch.update({
      where: { id: dispatchId },
      data: { status: allFailed ? 'FAILED' : 'DONE' },
    });
  }

  /** Maps a Prisma Message row (with optional includes) to a domain {@link MessageEntity}. */
  private toEntity(row: {
    id: string;
    dispatchId: string;
    recipientId: string | null;
    anonymousTargetId: string | null;
    channel: PrismaChannel;
    languageCode: string;
    translatedBody: string;
    status: PrismaStatus;
    providerMessageId: string | null;
    errorDetails: unknown;
    sentAt: Date | null;
    deliveredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    recipient?: { firstName: string; lastName: string } | null;
    anonymousTarget?: { contact: string } | null;
  }): MessageEntity {
    return {
      id: row.id,
      dispatchId: row.dispatchId,
      recipientId: row.recipientId,
      recipientName: row.recipient ? `${row.recipient.firstName} ${row.recipient.lastName}` : null,
      anonymousTargetId: row.anonymousTargetId,
      anonymousContact: row.anonymousTarget?.contact
        ? this.encryption.decrypt(row.anonymousTarget.contact)
        : null,
      channel: row.channel as unknown as MessageChannel,
      languageCode: row.languageCode,
      translatedBody: row.translatedBody,
      status: row.status as unknown as MessageStatus,
      providerMessageId: row.providerMessageId,
      errorDetails: row.errorDetails as Record<string, unknown> | null,
      sentAt: row.sentAt,
      deliveredAt: row.deliveredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
