import { Injectable } from '@nestjs/common';
import {
  ANONYMOUS_TARGET_TTL_DAYS,
  AppException,
  DispatchStatus,
  MessageChannel,
  NotFoundException,
  RecipientMode,
  VariableSource,
} from '@i18n-chat/domain';
import type {
  AnonymousTargetEntity,
  DispatchEntity,
  FindDispatchesOptions,
  MessageEntity,
  PagedResult,
  RecipientChannelEntity,
  RecipientEntity,
  TemplateVariableEntity,
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
import { AuditService } from '../audit/audit.service';

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
    private readonly audit: AuditService,
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

    await this.audit.log({
      userId,
      action: 'dispatch.created',
      entityType: 'Dispatch',
      entityId: dispatch.id,
      metadata: { recipientMode: dispatch.recipientMode, messageCount: items.length },
    });

    return this.toResponse(dispatch, items.length);
  }

  /**
   * Returns a paginated list of dispatches.
   *
   * @param options - Optional filters and pagination.
   */
  async findAll(options?: FindDispatchesOptions): Promise<PagedResult<TDispatchResponse>> {
    const result = await this.dispatchRepo.findAll(options);
    const ids = result.data.map((d) => d.id);
    const countMap =
      ids.length > 0 ? await this.messageRepo.countByDispatchIds(ids) : new Map<string, number>();
    return {
      data: result.data.map((d) => this.toResponse(d, countMap.get(d.id))),
      total: result.total,
    };
  }

  /**
   * Exports dispatches as a RFC 4180-compliant CSV string.
   *
   * @param options - Optional status filter.
   * @returns UTF-8 CSV with BOM for Excel compatibility.
   */
  async exportCsv(options?: { status?: DispatchStatus }): Promise<string> {
    const result = await this.dispatchRepo.findAll({ status: options?.status, limit: 10_000 });

    const ids = result.data.map((d) => d.id);
    const countMap = await this.messageRepo.countByDispatchIds(ids);

    const escape = (v: string): string => `"${v.replace(/"/g, '""')}"`;
    const header = ['ID', 'Template', 'Status', 'Recipients', 'Created At'].join(',');
    const rows = result.data.map((d) =>
      [
        escape(d.id),
        escape(d.templateName ?? d.freeTextOriginal?.slice(0, 60) ?? ''),
        escape(d.status),
        escape(String(countMap.get(d.id) ?? 0)),
        escape(new Date(d.createdAt).toISOString()),
      ].join(','),
    );

    // UTF-8 BOM ensures Excel opens the file with correct encoding.
    return `\uFEFF${[header, ...rows].join('\r\n')}`;
  }

  /**
   * Cancels a dispatch that is still in DRAFT or QUEUED status.
   *
   * @param id - Dispatch UUID.
   * @param userId - UUID of the staff member requesting the cancellation.
   * @throws {NotFoundException} When no dispatch with the given ID exists.
   * @throws {AppException} When the dispatch is already in a terminal state.
   */
  async cancelDispatch(id: string, userId: string): Promise<TDispatchResponse> {
    const dispatch = await this.dispatchRepo.findById(id);
    if (!dispatch) throw new NotFoundException('Dispatch', id);

    const cancellableStatuses: string[] = [DispatchStatus.DRAFT, DispatchStatus.QUEUED];
    if (!cancellableStatuses.includes(dispatch.status)) {
      throw new AppException(
        `Dispatch cannot be cancelled in status "${dispatch.status}".`,
        'DISPATCH_NOT_CANCELLABLE',
        { id, status: dispatch.status },
      );
    }

    await this.dispatchRepo.updateStatus(id, DispatchStatus.CANCELLED);

    await this.audit.log({
      userId,
      action: 'dispatch.cancelled',
      entityType: 'Dispatch',
      entityId: id,
      metadata: { previousStatus: dispatch.status },
    });

    return this.toResponse({ ...dispatch, status: DispatchStatus.CANCELLED });
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

    let templateVars: TemplateVariableEntity[] = [];
    if (dispatch.templateId) {
      const tpl = await this.templateRepo.findById(dispatch.templateId, { includeVariables: true });
      templateVars = tpl?.variables ?? [];
    }

    const results = await Promise.all(
      recipients.map((r) => {
        const recipientChannels = channels.filter((c) => c.recipientId === r.id);
        const autoVars = this.buildAutoVars(templateVars, r);
        const vars = this.mergeVars(
          dto.globalVariables ?? {},
          autoVars,
          dto.recipientVariables?.[r.id] ?? {},
        );
        return this.buildItemsForRecipient(
          dispatch,
          r,
          recipientChannels,
          dto.channels,
          vars,
          templateVars,
        );
      }),
    );

    return results.flat();
  }

  /**
   * Builds the auto-injected variable map for a recipient based on RECIPIENT_FIELD variables.
   *
   * @param templateVars - All variable definitions for the template.
   * @param recipient - The recipient whose profile fields are injected.
   */
  private buildAutoVars(
    templateVars: TemplateVariableEntity[],
    recipient: RecipientEntity,
  ): Record<string, string> {
    return templateVars
      .filter((v) => v.source === VariableSource.RECIPIENT_FIELD && !!v.recipientField)
      .reduce<Record<string, string>>((acc, v) => {
        const value = recipient[v.recipientField as keyof RecipientEntity];
        if (typeof value === 'string') acc[v.key] = value;
        return acc;
      }, {});
  }

  /** Builds queue items for a single registered recipient across all requested channels. */
  private async buildItemsForRecipient(
    dispatch: DispatchEntity,
    recipient: RecipientEntity,
    recipientChannels: RecipientChannelEntity[],
    requestedChannels: MessageChannel[],
    variables: Record<string, string>,
    variableDefs: TemplateVariableEntity[] = [],
  ): Promise<MessageQueueItem[]> {
    const lang = recipient.preferredLanguageCode;
    const matched = recipientChannels.filter((c) => requestedChannels.includes(c.channel));

    return Promise.all(
      matched.map(async (ch) => {
        const { body, subject } = await this.resolveContent(
          dispatch,
          lang,
          variables,
          variableDefs,
        );
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
            dispatchId: dispatch.id,
            contact: ch.contact,
            body,
            subject,
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
    let templateVars: TemplateVariableEntity[] = [];
    if (dispatch.templateId) {
      const tpl = await this.templateRepo.findById(dispatch.templateId, { includeVariables: true });
      templateVars = tpl?.variables ?? [];
    }
    return Promise.all(
      (dto.targets ?? []).map((t) => this.buildItemForTarget(dispatch, t, templateVars)),
    );
  }

  /** Builds a queue item for a single anonymous target. */
  private async buildItemForTarget(
    dispatch: DispatchEntity,
    target: TDispatchTarget,
    variableDefs: TemplateVariableEntity[] = [],
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

    const { body, subject } = await this.resolveContent(
      dispatch,
      target.languageCode,
      target.variables,
      variableDefs,
    );
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
        dispatchId: dispatch.id,
        contact: target.contact,
        body,
        subject,
        languageCode: target.languageCode,
        ...waInfo,
      },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Resolves the final message body and optional subject via template rendering or LibreTranslate. */
  private async resolveContent(
    dispatch: DispatchEntity,
    languageCode: string,
    variables: Record<string, string>,
    variableDefs: TemplateVariableEntity[] = [],
  ): Promise<{ body: string; subject?: string }> {
    if (dispatch.templateId) {
      return this.translationSvc.resolveTranslation(
        dispatch.templateId,
        languageCode,
        variables,
        variableDefs,
      );
    }
    return {
      body: await this.libretranslate.translate(dispatch.freeTextOriginal ?? '', languageCode),
    };
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
   * @example extractHbsValues('Hello {{name}}!', { name: 'Chermann' }) // → ['Chermann']
   */
  private extractHbsValues(body: string, variables: Record<string, string>): string[] {
    const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
    return matches.map((m) => variables[m.slice(2, -2)] ?? '');
  }

  /** Merges global, auto-injected, and per-recipient variable maps (priority: perRecipient > auto > global). */
  private mergeVars(
    global: Record<string, string>,
    auto: Record<string, string>,
    perRecipient: Record<string, string>,
  ): Record<string, string> {
    return { ...global, ...auto, ...perRecipient };
  }

  /** Maps a {@link DispatchEntity} to the API response shape. */
  private toResponse(dispatch: DispatchEntity, messageCount?: number): TDispatchResponse {
    return {
      id: dispatch.id,
      recipientMode: dispatch.recipientMode,
      templateId: dispatch.templateId ?? null,
      templateName: dispatch.templateName ?? null,
      freeTextOriginal: dispatch.freeTextOriginal ?? null,
      status: dispatch.status,
      scheduledAt: dispatch.scheduledAt?.toISOString() ?? null,
      createdAt: dispatch.createdAt.toISOString(),
      updatedAt: dispatch.updatedAt.toISOString(),
      messageCount,
    };
  }
}
