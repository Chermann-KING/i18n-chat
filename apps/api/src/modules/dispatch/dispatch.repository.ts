import { Injectable } from '@nestjs/common';
import { DispatchStatus, MessageChannel, RecipientMode } from '@i18n-chat/domain';
import type {
  AnonymousTargetEntity,
  CreateAnonymousTargetData,
  CreateDispatchData,
  CreateVariableSetData,
  DispatchEntity,
  DispatchVariableSetEntity,
  FindDispatchesOptions,
  IDispatchRepository,
  PagedResult,
} from '@i18n-chat/domain';
import type {
  DispatchStatus as PrismaDispatchStatus,
  MessageChannel as PrismaChannel,
  RecipientMode as PrismaRecipientMode,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';

/** Default page number for paginated queries. */
const DEFAULT_PAGE = 1;
/** Default page size for paginated queries. */
const DEFAULT_LIMIT = 20;

/**
 * Prisma-backed implementation of {@link IDispatchRepository}.
 *
 * Anonymous target contacts are encrypted at rest using AES-256-GCM
 * via {@link EncryptionService} before being stored, and decrypted on read.
 */
@Injectable()
export class DispatchRepository implements IDispatchRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /** @inheritdoc */
  async findById(id: string): Promise<DispatchEntity | null> {
    const row = await this.prisma.dispatch.findUnique({
      where: { id },
      include: { template: { select: { name: true } } },
    });
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  async findAll(options: FindDispatchesOptions = {}): Promise<PagedResult<DispatchEntity>> {
    const page = options.page ?? DEFAULT_PAGE;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const where = {
      ...(options.createdById ? { createdById: options.createdById } : {}),
      ...(options.status ? { status: options.status as unknown as PrismaDispatchStatus } : {}),
      ...(options.recipientMode
        ? { recipientMode: options.recipientMode as unknown as PrismaRecipientMode }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.dispatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { template: { select: { name: true } } },
      }),
      this.prisma.dispatch.count({ where }),
    ]);

    return { data: rows.map((r) => this.toEntity(r)), total };
  }

  /** @inheritdoc */
  async create(data: CreateDispatchData): Promise<DispatchEntity> {
    const row = await this.prisma.dispatch.create({
      data: {
        createdById: data.createdById,
        recipientMode: data.recipientMode as unknown as PrismaRecipientMode,
        templateId: data.templateId,
        freeTextOriginal: data.freeTextOriginal,
        scheduledAt: data.scheduledAt,
      },
    });
    return this.toEntity(row);
  }

  /** @inheritdoc */
  async updateStatus(id: string, status: DispatchStatus): Promise<void> {
    await this.prisma.dispatch.update({
      where: { id },
      data: { status: status as unknown as PrismaDispatchStatus },
    });
  }

  /** @inheritdoc */
  async createAnonymousTarget(
    dispatchId: string,
    data: CreateAnonymousTargetData,
  ): Promise<AnonymousTargetEntity> {
    const row = await this.prisma.anonymousTarget.create({
      data: {
        dispatchId,
        channel: data.channel as unknown as PrismaChannel,
        contact: this.encryption.encrypt(data.contact),
        languageCode: data.languageCode,
        variables: data.variables,
        purgeAt: data.purgeAt,
      },
    });
    return this.toAnonymousTargetEntity(row);
  }

  /** @inheritdoc */
  async createVariableSet(
    dispatchId: string,
    data: CreateVariableSetData,
  ): Promise<DispatchVariableSetEntity> {
    const row = await this.prisma.dispatchVariableSet.create({
      data: {
        dispatchId,
        recipientId: data.recipientId,
        anonymousTargetId: data.anonymousTargetId,
        variables: data.variables,
      },
    });
    return this.toVariableSetEntity(row);
  }

  /** @inheritdoc */
  async findAnonymousTargets(dispatchId: string): Promise<AnonymousTargetEntity[]> {
    const rows = await this.prisma.anonymousTarget.findMany({ where: { dispatchId } });
    return rows.map((r) => this.toAnonymousTargetEntity(r));
  }

  /** @inheritdoc */
  async findVariableSets(dispatchId: string): Promise<DispatchVariableSetEntity[]> {
    const rows = await this.prisma.dispatchVariableSet.findMany({ where: { dispatchId } });
    return rows.map((r) => this.toVariableSetEntity(r));
  }

  /** Maps a Prisma Dispatch row to a {@link DispatchEntity}. */
  private toEntity(row: {
    id: string;
    createdById: string;
    recipientMode: PrismaRecipientMode;
    templateId: string | null;
    freeTextOriginal: string | null;
    status: PrismaDispatchStatus;
    scheduledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    template?: { name: string } | null;
  }): DispatchEntity {
    return {
      id: row.id,
      createdById: row.createdById,
      recipientMode: row.recipientMode as unknown as RecipientMode,
      templateId: row.templateId,
      templateName: row.template?.name ?? null,
      freeTextOriginal: row.freeTextOriginal,
      status: row.status as unknown as DispatchStatus,
      scheduledAt: row.scheduledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Maps a Prisma AnonymousTarget row to an {@link AnonymousTargetEntity}.
   *
   * The `contact` value is decrypted from AES-256-GCM ciphertext before being returned.
   */
  private toAnonymousTargetEntity(row: {
    id: string;
    dispatchId: string;
    channel: PrismaChannel;
    contact: string;
    languageCode: string;
    variables: unknown;
    purgeAt: Date;
    createdAt: Date;
  }): AnonymousTargetEntity {
    return {
      id: row.id,
      dispatchId: row.dispatchId,
      channel: row.channel as unknown as MessageChannel,
      contact: this.encryption.decrypt(row.contact),
      languageCode: row.languageCode,
      variables: row.variables as Record<string, string>,
      purgeAt: row.purgeAt,
      createdAt: row.createdAt,
    };
  }

  /** Maps a Prisma DispatchVariableSet row to a {@link DispatchVariableSetEntity}. */
  private toVariableSetEntity(row: {
    id: string;
    dispatchId: string;
    recipientId: string | null;
    anonymousTargetId: string | null;
    variables: unknown;
  }): DispatchVariableSetEntity {
    return {
      id: row.id,
      dispatchId: row.dispatchId,
      recipientId: row.recipientId,
      anonymousTargetId: row.anonymousTargetId,
      variables: row.variables as Record<string, string>,
    };
  }
}
