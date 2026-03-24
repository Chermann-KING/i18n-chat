import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException, MessageChannel } from '@i18n-chat/domain';
import type { IMessageChannel, SendMessagePayload } from '@i18n-chat/domain';

/** Shape of a successful Meta Cloud API send response. */
interface MetaSendResponse {
  messages?: [{ id: string }];
  error?: { message: string; code: number };
}

/** A single variable parameter for a WhatsApp template component. */
interface WaTemplateParameter {
  type: 'text';
  text: string;
}

/** A body component carrying the variable parameters. */
interface WaBodyComponent {
  type: 'body';
  parameters: WaTemplateParameter[];
}

/** Union of all supported WhatsApp message body shapes. */
type WaMessageBody =
  | {
      messaging_product: 'whatsapp';
      to: string;
      type: 'template';
      template: {
        name: string;
        language: { code: string };
        components?: WaBodyComponent[];
      };
    }
  | {
      messaging_product: 'whatsapp';
      to: string;
      type: 'text';
      text: { body: string };
    };

/**
 * WhatsApp delivery channel using the Meta Cloud API (Graph API v18).
 *
 * Implements {@link IMessageChannel} for the WHATSAPP channel.
 * Supports both pre-approved HSM template messages and free-text messages.
 *
 * Required environment variables: `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`.
 */
@Injectable()
export class WhatsAppChannel implements IMessageChannel {
  /** @inheritdoc */
  readonly channel = MessageChannel.WHATSAPP;

  constructor(private readonly config: ConfigService) {}

  /**
   * Sends a WhatsApp message via Meta Cloud API.
   *
   * Uses the HSM template format when `payload.waTemplateName` is set;
   * falls back to free-text otherwise.
   *
   * @param payload - The message payload (contact = E.164 phone number).
   * @returns The Meta-assigned message ID.
   * @throws {AppException} When Meta returns an error response.
   */
  async send(payload: SendMessagePayload): Promise<string> {
    const body = this.buildMessageBody(payload);
    const response = await this.postToMeta(body);
    return this.extractMessageId(response, payload.contact);
  }

  /**
   * Validates that a contact string is a well-formed E.164 phone number.
   *
   * @param contact - The value to validate.
   */
  validateContact(contact: string): boolean {
    return /^\+[1-9]\d{7,14}$/.test(contact);
  }

  /** Builds the appropriate Meta API request body depending on message type. */
  private buildMessageBody(payload: SendMessagePayload): WaMessageBody {
    if (payload.waTemplateName) {
      return this.buildTemplateMessage(payload);
    }
    return {
      messaging_product: 'whatsapp',
      to: payload.contact,
      type: 'text',
      text: { body: payload.body },
    };
  }

  /** Builds a template-based WhatsApp message body. */
  private buildTemplateMessage(payload: SendMessagePayload): WaMessageBody {
    const parameters: WaTemplateParameter[] =
      payload.waTemplateComponents?.map((text) => ({ type: 'text', text })) ?? [];

    return {
      messaging_product: 'whatsapp',
      to: payload.contact,
      type: 'template',
      template: {
        name: payload.waTemplateName as string,
        language: { code: payload.languageCode ?? 'en' },
        components: parameters.length ? [{ type: 'body', parameters }] : undefined,
      },
    };
  }

  /** POSTs the message to the Meta Cloud API. */
  private async postToMeta(body: WaMessageBody): Promise<MetaSendResponse> {
    const phoneId = this.config.getOrThrow<string>('WA_PHONE_NUMBER_ID');
    const token = this.config.getOrThrow<string>('WA_ACCESS_TOKEN');
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    return res.json() as Promise<MetaSendResponse>;
  }

  /** Extracts the message ID from the Meta response or throws on error. */
  private extractMessageId(response: MetaSendResponse, contact: string): string {
    if (response.error) {
      throw new AppException(
        `WhatsApp send failed: ${response.error.message}`,
        'WHATSAPP_SEND_FAILED',
        { contact, code: response.error.code },
      );
    }
    return response.messages?.[0]?.id ?? '';
  }
}
