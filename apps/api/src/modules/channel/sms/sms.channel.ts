import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException, MessageChannel } from '@i18n-chat/domain';
import type { IMessageChannel, SendMessagePayload } from '@i18n-chat/domain';

/** Shape of a single message result in the Vonage SMS API response. */
interface VonageMessageResult {
  status: string;
  'message-id': string;
  'error-text'?: string;
}

/** Top-level response from the Vonage SMS REST API. */
interface VonageSmsResponse {
  messages: VonageMessageResult[];
}

/**
 * SMS delivery channel using the Vonage-compatible REST API.
 *
 * Implements {@link IMessageChannel} for the SMS channel.
 * Requires `SMS_API_URL`, `SMS_PROVIDER_API_KEY`, `SMS_PROVIDER_API_SECRET`,
 * and `SMS_FROM` environment variables.
 */
@Injectable()
export class SmsChannel implements IMessageChannel {
  /** @inheritdoc */
  readonly channel = MessageChannel.SMS;

  constructor(private readonly config: ConfigService) {}

  /**
   * Sends an SMS message via the configured provider.
   *
   * @param payload - The message payload (contact = E.164 phone number).
   * @returns The provider-assigned message ID.
   * @throws {AppException} When the HTTP request fails or the provider returns an error status.
   */
  async send(payload: SendMessagePayload): Promise<string> {
    const response = await this.postToProvider(payload.contact, payload.body);
    return this.extractMessageId(response);
  }

  /**
   * Validates that a contact string is a well-formed E.164 phone number.
   *
   * @param contact - The value to validate.
   */
  validateContact(contact: string): boolean {
    return /^\+[1-9]\d{7,14}$/.test(contact);
  }

  /** POSTs the SMS request to the provider endpoint. */
  private async postToProvider(to: string, text: string): Promise<VonageSmsResponse> {
    const url = this.config.getOrThrow<string>('SMS_API_URL');
    const requestBody = {
      api_key: this.config.getOrThrow<string>('SMS_PROVIDER_API_KEY'),
      api_secret: this.config.getOrThrow<string>('SMS_PROVIDER_API_SECRET'),
      from: this.config.getOrThrow<string>('SMS_FROM'),
      to,
      text,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      throw new AppException(`SMS provider HTTP error: ${res.status}`, 'SMS_PROVIDER_ERROR', {
        to,
      });
    }

    return res.json() as Promise<VonageSmsResponse>;
  }

  /** Extracts the message ID from the provider response, or throws on error status. */
  private extractMessageId(response: VonageSmsResponse): string {
    const msg = response.messages[0];
    if (!msg || msg.status !== '0') {
      throw new AppException(
        `SMS send failed: ${msg?.['error-text'] ?? 'unknown error'}`,
        'SMS_SEND_FAILED',
        {},
      );
    }
    return msg['message-id'];
  }
}
