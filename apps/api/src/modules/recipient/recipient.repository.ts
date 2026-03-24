import { Injectable } from '@nestjs/common';
import type {
  AddChannelData,
  CreateRecipientData,
  FindRecipientsOptions,
  IRecipientRepository,
  MessageChannel as DomainMessageChannel,
  PagedResult,
  RecipientChannelEntity,
  RecipientEntity,
  UpdateRecipientData,
} from '@i18n-chat/domain';
import type { Recipient, RecipientChannel } from '@prisma/client';
import { MessageChannel } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Default page size for recipient list queries. */
const DEFAULT_PAGE = 1;
/** Default number of results per page. */
const DEFAULT_LIMIT = 20;

/**
 * Prisma-backed implementation of {@link IRecipientRepository}.
 *
 * Contact values (email / phone) are stored as plain text in this implementation.
 * pgcrypto-based encryption will be layered on top in a future migration phase.
 */
@Injectable()
export class RecipientRepository implements IRecipientRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  async findById(id: string): Promise<RecipientEntity | null> {
    const row = await this.prisma.recipient.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  async findAll(options: FindRecipientsOptions = {}): Promise<PagedResult<RecipientEntity>> {
    const page = options.page ?? DEFAULT_PAGE;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const where = {
      ...(options.preferredLanguageCode !== undefined
        ? { preferredLanguageCode: options.preferredLanguageCode }
        : {}),
      ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.recipient.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.recipient.count({ where }),
    ]);

    return { data: rows.map((r) => this.toEntity(r)), total };
  }

  /** @inheritdoc */
  async create(data: CreateRecipientData): Promise<RecipientEntity> {
    const row = await this.prisma.recipient.create({ data });
    return this.toEntity(row);
  }

  /** @inheritdoc */
  async update(id: string, data: UpdateRecipientData): Promise<RecipientEntity> {
    const row = await this.prisma.recipient.update({ where: { id }, data });
    return this.toEntity(row);
  }

  /** @inheritdoc */
  async delete(id: string): Promise<void> {
    await this.prisma.recipient.update({ where: { id }, data: { isActive: false } });
  }

  /** @inheritdoc */
  async addChannel(recipientId: string, data: AddChannelData): Promise<RecipientChannelEntity> {
    const row = await this.prisma.recipientChannel.create({
      data: {
        recipientId,
        channel: data.channel as unknown as MessageChannel,
        contact: data.contact,
      },
    });
    return this.toChannelEntity(row);
  }

  /** @inheritdoc */
  async removeChannel(recipientId: string, channel: DomainMessageChannel): Promise<void> {
    await this.prisma.recipientChannel.deleteMany({
      where: { recipientId, channel: channel as unknown as MessageChannel },
    });
  }

  /** @inheritdoc */
  async findChannels(recipientId: string): Promise<RecipientChannelEntity[]> {
    const rows = await this.prisma.recipientChannel.findMany({
      where: { recipientId, isActive: true },
    });
    return rows.map((r) => this.toChannelEntity(r));
  }

  /**
   * Maps a Prisma `Recipient` row to a domain {@link RecipientEntity}.
   */
  private toEntity(row: Recipient): RecipientEntity {
    return {
      id: row.id,
      fullName: row.fullName,
      preferredLanguageCode: row.preferredLanguageCode,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Maps a Prisma `RecipientChannel` row to a domain {@link RecipientChannelEntity}.
   *
   * The Prisma `MessageChannel` enum is cast to the domain equivalent — both
   * share identical string values at runtime.
   */
  private toChannelEntity(row: RecipientChannel): RecipientChannelEntity {
    return {
      id: row.id,
      recipientId: row.recipientId,
      channel: row.channel as unknown as DomainMessageChannel,
      contact: row.contact,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }
}
