import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException, WaTemplateStatus } from '@i18n-chat/domain';
import type { WaTemplateCategory } from '@i18n-chat/domain';
import type { WaTemplateStatus as PrismaWaStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** Response from the Meta Graph API when creating a message template. */
interface MetaTemplateResponse {
  id?: string;
  status?: string;
  error?: { message: string; code: number };
}

/**
 * Payload for submitting a template translation to Meta for HSM approval.
 */
export interface SubmitTemplatePayload {
  /** Internal UUID of the template (used to identify the DB record to update). */
  readonly templateId: string;
  /** ISO 639-1 language code of the translation. */
  readonly languageCode: string;
  /** The unique template name registered in the WhatsApp Business Account. */
  readonly waTemplateName: string;
  /** Template body text (Handlebars variables will be converted to Meta placeholders). */
  readonly body: string;
  /** Meta template category (`UTILITY`, `MARKETING`, or `AUTHENTICATION`). */
  readonly category: WaTemplateCategory;
}

/**
 * Manages WhatsApp HSM template submission and approval-status synchronisation.
 *
 * Workflow:
 * 1. Staff submits a translation via {@link submitTemplate} → status becomes `PENDING`.
 * 2. Meta sends a webhook callback to `POST /webhooks/whatsapp`.
 * 3. {@link WhatsAppWebhookController} calls {@link syncApprovalStatus} to persist the result.
 */
@Injectable()
export class WhatsAppTemplateService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Submits a template translation to Meta for HSM approval and sets its
   * local `waTemplateStatus` to `PENDING` (or `APPROVED` for instant approvals).
   *
   * @param payload - Template metadata and content for Meta.
   * @throws {AppException} When Meta rejects the submission.
   */
  async submitTemplate(payload: SubmitTemplatePayload): Promise<void> {
    const response = await this.postTemplateToMeta(payload);
    this.assertNoError(response);
    const status = this.resolveInitialStatus(response.status);
    await this.persistStatus(payload.templateId, payload.languageCode, status, response.id);
  }

  /**
   * Updates the local `waTemplateStatus` for a translation identified by
   * its Meta template name and language code.
   *
   * Called by {@link WhatsAppWebhookController} on template status callbacks.
   *
   * @param waTemplateName - The Meta template name.
   * @param languageCode - ISO 639-1 language code.
   * @param status - The new approval status from Meta.
   * @param metaId - Optional Meta template ID to persist alongside the status.
   */
  async syncApprovalStatus(
    waTemplateName: string,
    languageCode: string,
    status: WaTemplateStatus,
    metaId?: string,
  ): Promise<void> {
    const translation = await this.prisma.templateTranslation.findFirst({
      where: { waTemplateName, languageCode },
    });
    if (!translation) return;
    await this.persistStatus(translation.templateId, languageCode, status, metaId);
  }

  /** POSTs the template definition to the Meta Graph API. */
  private async postTemplateToMeta(payload: SubmitTemplatePayload): Promise<MetaTemplateResponse> {
    const businessId = this.config.getOrThrow<string>('WA_BUSINESS_ACCOUNT_ID');
    const token = this.config.getOrThrow<string>('WA_ACCESS_TOKEN');
    const url = `https://graph.facebook.com/v18.0/${businessId}/message_templates`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: payload.waTemplateName,
        language: payload.languageCode,
        category: payload.category,
        components: [{ type: 'BODY', text: payload.body }],
      }),
    });

    return res.json() as Promise<MetaTemplateResponse>;
  }

  /** Throws {@link AppException} if the Meta response contains an error. */
  private assertNoError(response: MetaTemplateResponse): void {
    if (response.error) {
      throw new AppException(
        `WhatsApp template submission failed: ${response.error.message}`,
        'WA_TEMPLATE_SUBMIT_FAILED',
        { code: response.error.code },
      );
    }
  }

  /** Maps the Meta `status` string to a domain {@link WaTemplateStatus}. */
  private resolveInitialStatus(metaStatus?: string): WaTemplateStatus {
    return metaStatus === 'APPROVED' ? WaTemplateStatus.APPROVED : WaTemplateStatus.PENDING;
  }

  /** Persists a new `waTemplateStatus` (and optional Meta ID) to the database. */
  private async persistStatus(
    templateId: string,
    languageCode: string,
    status: WaTemplateStatus,
    metaId?: string,
  ): Promise<void> {
    await this.prisma.templateTranslation.update({
      where: { templateId_languageCode: { templateId, languageCode } },
      data: {
        waTemplateStatus: status as unknown as PrismaWaStatus,
        ...(metaId !== undefined && { waTemplateMetaId: metaId }),
      },
    });
  }
}
