import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WaTemplateStatus } from '@i18n-chat/domain';
import { Public } from '../../../common/decorators/public.decorator';
import { WhatsAppTemplateService } from './whatsapp-template.service';

/** Query parameters sent by Meta during webhook verification. */
interface HubQuery {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}

/** Shape of a single change value in the Meta webhook payload. */
interface MetaChangeValue {
  event?: string;
  message_template_id?: string;
  message_template_name?: string;
  message_template_language?: string;
}

/** Shape of a single change entry. */
interface MetaChange {
  field?: string;
  value?: MetaChangeValue;
}

/** Shape of a single entry in the Meta webhook payload. */
interface MetaEntry {
  changes?: MetaChange[];
}

/** Top-level shape of a Meta webhook POST body. */
interface MetaWebhookBody {
  entry?: MetaEntry[];
}

/**
 * Handles incoming webhooks from the Meta Cloud API.
 *
 * All endpoints are `@Public()` because Meta does not send JWT tokens.
 * Security is enforced via the `hub.verify_token` challenge on the GET endpoint.
 *
 * Routes:
 * - `GET  /webhooks/whatsapp` — Meta verification challenge.
 * - `POST /webhooks/whatsapp` — Delivery + template-approval status callbacks.
 */
@ApiTags('webhooks')
@Controller('webhooks/whatsapp')
@Public()
export class WhatsAppWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly waTemplateService: WhatsAppTemplateService,
  ) {}

  /**
   * Responds to the Meta webhook verification challenge.
   *
   * Meta sends this once when you register the webhook URL. The endpoint
   * must return the `hub.challenge` value verbatim if the `hub.verify_token`
   * matches the configured secret.
   *
   * @param query - Meta hub query parameters.
   * @returns The `hub.challenge` string echoed back to Meta.
   * @throws {ForbiddenException} When the verify token does not match.
   */
  @Get()
  @ApiOperation({ summary: 'Meta webhook verification challenge' })
  verify(@Query() query: HubQuery): string {
    const expected = this.config.getOrThrow<string>('WA_WEBHOOK_VERIFY_TOKEN');
    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === expected) {
      return query['hub.challenge'];
    }
    throw new ForbiddenException('Invalid webhook verify token');
  }

  /**
   * Processes incoming Meta event callbacks.
   *
   * Handles `message_template_status_update` events to sync HSM approval
   * status into the local database. Delivery-status callbacks will be handled
   * in the Dispatch module (Phase 6).
   *
   * @param body - The Meta webhook payload.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta delivery and template-status callbacks' })
  async handleCallback(@Body() body: MetaWebhookBody): Promise<void> {
    const changes = (body.entry ?? []).flatMap((e) => e.changes ?? []);
    await Promise.all(changes.map((c) => this.processChange(c)));
  }

  /** Processes a single change entry, updating template status when applicable. */
  private async processChange(change: MetaChange): Promise<void> {
    const { value } = change;
    if (
      change.field !== 'message_template_status_update' ||
      !value?.event ||
      !value.message_template_name ||
      !value.message_template_language
    ) {
      return;
    }
    const status = this.mapEventToStatus(value.event);
    if (!status) return;
    await this.waTemplateService.syncApprovalStatus(
      value.message_template_name,
      value.message_template_language,
      status,
      value.message_template_id,
    );
  }

  /** Maps a Meta event string to the corresponding domain {@link WaTemplateStatus}. */
  private mapEventToStatus(event: string): WaTemplateStatus | null {
    if (event === 'APPROVED') return WaTemplateStatus.APPROVED;
    if (event === 'REJECTED') return WaTemplateStatus.REJECTED;
    return null;
  }
}
