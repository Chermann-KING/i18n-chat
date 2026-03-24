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

/**
 * Prisma-backed implementation of {@link IMessageRepository}.
 *
 * Stores one outbound message record per (recipient × channel) combination
 * created during a dispatch.
 */
@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const rows = await this.prisma.message.findMany({ where: { dispatchId } });
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

  /** Maps a Prisma Message row to a domain {@link MessageEntity}. */
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
  }): MessageEntity {
    return {
      id: row.id,
      dispatchId: row.dispatchId,
      recipientId: row.recipientId,
      anonymousTargetId: row.anonymousTargetId,
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
