import { Injectable } from '@nestjs/common';
import {
  ANONYMOUS_TARGET_TTL_DAYS,
  DispatchStatus,
  MessageChannel,
  NotFoundException,
  RecipientMode,
} from '@i18n-chat/domain';
import type {
  AnonymousTargetEntity,
  DispatchEntity,
  FindDispatchesOptions,
  MessageEntity,
  PagedResult,
  RecipientChannelEntity,
  RecipientEntity,
} from '@i18n-chat/domain';
import type { TCreateDispatch, TDispatchResponse, TDispatchTarget } from '@i18n-chat/dto';
import { RecipientRepository } from '../recipient/recipient.repository';
import { TemplateRepository } from '../template/template.repository';
import { TranslationService } from '../template/translation.service';
import { LibreTranslateService } from '../translation/libre-translate.service';
import { DispatchRepository } from './dispatch.repository';
import { MessageRepository } from './message.repository';
import { DispatchProducer } from './dispatch.producer';
import type { DeliveryJobData } from './queue.constants';

/** A message entity paired with its delivery queue job payload. */
interface MessageQueueItem {
  readonly entity: MessageEntity;
  readonly jobData: DeliveryJobData;
}

/**
 * Orchestrates the full dispatch lifecycle:
 * 1. Persist the dispatch record and its messages.
 * 2. Mark the dispatch as `QUEUED`.
 * 3. Hand off each message to {@link DispatchProducer} for async delivery.
 */
@Injectable()
export class DispatchService {
  constructor(
    private readonly dispatchRepo: DispatchRepository,
    private readonly messageRepo: MessageRepository,
    private readonly recipientRepo: RecipientRepository,
    private readonly templateRepo: TemplateRepository,
    private readonly translationSvc: TranslationService,
    private readonly libretranslate: LibreTranslateService,
    private readonly producer: DispatchProducer,
  ) {}

  /**
   * Creates a dispatch, builds and persists all outbound messages,
   * then enqueues them for async delivery.
   *
   * @param dto - Validated creation payload from the controller.
   * @param userId - UUID of the staff member creating the dispatch.
   * @returns The created dispatch response with message count.
   */
  async createDispatch(dto: TCreateDispatch, userId: string): Promise<TDispatchResponse> {
    const dispatch = await this.dispatchRepo.create({
      createdById: userId,
      recipientMode: dto.recipientMode,
      templateId: dto.templateId,
      freeTextOriginal: dto.freeTextOriginal,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });

    const items =
      dto.recipientMode === RecipientMode.REGISTERED
        ? await this.buildRegisteredItems(dispatch, dto)
        : await this.buildAnonymousItems(dispatch, dto);

    await this.dispatchRepo.updateStatus(dispatch.id, DispatchStatus.QUEUED);
    await this.producer.enqueueAll(items);

    return this.toResponse(dispatch, items.length);
  }

  /**
   * Returns a paginated list of dispatches.
   *
   * @param options - Optional filters and pagination.
   */
  async findAll(options?: FindDispatchesOptions): Promise<PagedResult<TDispatchResponse>> {
    const result = await this.dispatchRepo.findAll(options);
    return { data: result.data.map((d) => this.toResponse(d)), total: result.total };
  }

  /**
   * Returns a single dispatch by UUID, including its message count.
   *
   * @param id - Dispatch UUID.
   * @throws {NotFoundException} When no dispatch with the given ID exists.
   */
  async findById(id: string): Promise<TDispatchResponse> {
    const dispatch = await this.dispatchRepo.findById(id);
    if (!dispatch) throw new NotFoundException('Dispatch', id);
    const messages = await this.messageRepo.findByDispatchId(id);
    return this.toResponse(dispatch, messages.length);
  }

  // ─── REGISTERED mode ─────────────────────────────────────────────────────────

  /** Builds queue items for all registered recipients. */
  private async buildRegisteredItems(
    dispatch: DispatchEntity,
    dto: TCreateDispatch,
  ): Promise<MessageQueueItem[]> {
    const ids = dto.recipientIds ?? [];
    const [recipients, channels] = await Promise.all([
      this.recipientRepo.findManyByIds(ids),
      this.recipientRepo.findChannelsBatch(ids),
    ]);

    const results = await Promise.all(
      recipients.map((r) => {
        const recipientChannels = channels.filter((c) => c.recipientId === r.id);
        const vars = this.mergeVars(
          dto.globalVariables ?? {},
          dto.recipientVariables?.[r.id] ?? {},
        );
        return this.buildItemsForRecipient(dispatch, r, recipientChannels, dto.channels, vars);
      }),
    );

    return results.flat();
  }

  /** Builds queue items for a single registered recipient across all requested channels. */
  private async buildItemsForRecipient(
    dispatch: DispatchEntity,
    recipient: RecipientEntity,
    recipientChannels: RecipientChannelEntity[],
    requestedChannels: MessageChannel[],
    variables: Record<string, string>,
  ): Promise<MessageQueueItem[]> {
    const lang = recipient.preferredLanguageCode;
    const matched = recipientChannels.filter((c) => requestedChannels.includes(c.channel));

    return Promise.all(
      matched.map(async (ch) => {
        const body = await this.resolveBody(dispatch, lang, variables);
        const waInfo = await this.resolveWaInfo(dispatch, ch.channel, lang, variables);
        const entity = await this.messageRepo.create({
          dispatchId: dispatch.id,
          recipientId: recipient.id,
          channel: ch.channel,
          languageCode: lang,
          translatedBody: body,
        });
        return {
          entity,
          jobData: {
            messageId: entity.id,
            contact: ch.contact,
            body,
            languageCode: lang,
            ...waInfo,
          },
        };
      }),
    );
  }

  // ─── ANONYMOUS mode ───────────────────────────────────────────────────────────

  /** Builds queue items for all anonymous targets. */
  private async buildAnonymousItems(
    dispatch: DispatchEntity,
    dto: TCreateDispatch,
  ): Promise<MessageQueueItem[]> {
    return Promise.all((dto.targets ?? []).map((t) => this.buildItemForTarget(dispatch, t)));
  }

  /** Builds a queue item for a single anonymous target. */
  private async buildItemForTarget(
    dispatch: DispatchEntity,
    target: TDispatchTarget,
  ): Promise<MessageQueueItem> {
    const purgeAt = new Date();
    purgeAt.setDate(purgeAt.getDate() + ANONYMOUS_TARGET_TTL_DAYS);

    const anon: AnonymousTargetEntity = await this.dispatchRepo.createAnonymousTarget(dispatch.id, {
      channel: target.channel,
      contact: target.contact,
      languageCode: target.languageCode,
      variables: target.variables,
      purgeAt,
    });

    const body = await this.resolveBody(dispatch, target.languageCode, target.variables);
    const waInfo = await this.resolveWaInfo(
      dispatch,
      target.channel,
      target.languageCode,
      target.variables,
    );

    const entity = await this.messageRepo.create({
      dispatchId: dispatch.id,
      anonymousTargetId: anon.id,
      channel: target.channel,
      languageCode: target.languageCode,
      translatedBody: body,
    });

    return {
      entity,
      jobData: {
        messageId: entity.id,
        contact: target.contact,
        body,
        languageCode: target.languageCode,
        ...waInfo,
      },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Resolves the final message body via template rendering or LibreTranslate. */
  private async resolveBody(
    dispatch: DispatchEntity,
    languageCode: string,
    variables: Record<string, string>,
  ): Promise<string> {
    if (dispatch.templateId) {
      return this.translationSvc.resolveBody(dispatch.templateId, languageCode, variables);
    }
    return this.libretranslate.translate(dispatch.freeTextOriginal ?? '', languageCode);
  }

  /**
   * Resolves WhatsApp-specific job data fields when the channel is WHATSAPP
   * and the dispatch uses a template.
   */
  private async resolveWaInfo(
    dispatch: DispatchEntity,
    channel: MessageChannel,
    languageCode: string,
    variables: Record<string, string>,
  ): Promise<Pick<DeliveryJobData, 'waTemplateName' | 'waTemplateComponents'>> {
    if (channel !== MessageChannel.WHATSAPP || !dispatch.templateId) return {};
    const translation = await this.templateRepo.findTranslation(dispatch.templateId, languageCode);
    if (!translation?.waTemplateName) return {};
    return {
      waTemplateName: translation.waTemplateName,
      waTemplateComponents: this.extractHbsValues(translation.body, variables),
    };
  }

  /**
   * Extracts Handlebars variable values in the order they appear in the template body.
   *
   * @example extractHbsValues('Hello {{name}}!', { name: 'Alice' }) // → ['Alice']
   */
  private extractHbsValues(body: string, variables: Record<string, string>): string[] {
    const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
    return matches.map((m) => variables[m.slice(2, -2)] ?? '');
  }

  /** Merges global and per-recipient variable maps (per-recipient takes precedence). */
  private mergeVars(
    global: Record<string, string>,
    perRecipient: Record<string, string>,
  ): Record<string, string> {
    return { ...global, ...perRecipient };
  }

  /** Maps a {@link DispatchEntity} to the API response shape. */
  private toResponse(dispatch: DispatchEntity, messageCount?: number): TDispatchResponse {
    return {
      id: dispatch.id,
      recipientMode: dispatch.recipientMode,
      templateId: dispatch.templateId ?? null,
      freeTextOriginal: dispatch.freeTextOriginal ?? null,
      status: dispatch.status,
      scheduledAt: dispatch.scheduledAt?.toISOString() ?? null,
      createdAt: dispatch.createdAt.toISOString(),
      updatedAt: dispatch.updatedAt.toISOString(),
      messageCount,
    };
  }
}
