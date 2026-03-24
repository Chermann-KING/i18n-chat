import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException, MessageChannel } from '@i18n-chat/domain';
import type { IMessageChannel, SendMessagePayload } from '@i18n-chat/domain';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Email delivery channel using Nodemailer over SMTP (Brevo).
 *
 * Implements {@link IMessageChannel} for the EMAIL channel.
 * Reads SMTP credentials from `ConfigService` at construction time.
 */
@Injectable()
export class EmailChannel implements IMessageChannel {
  /** @inheritdoc */
  readonly channel = MessageChannel.EMAIL;

  private readonly transporter: Transporter;

  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress = this.config.getOrThrow<string>('SMTP_FROM');
    this.transporter = this.buildTransporter();
  }

  /**
   * Sends a single email message.
   *
   * @param payload - The message payload (contact = recipient email address).
   * @returns The SMTP message ID assigned by the server.
   * @throws {AppException} When the SMTP transport fails.
   */
  async send(payload: SendMessagePayload): Promise<string> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: payload.contact,
        subject: payload.subject ?? '(no subject)',
        text: payload.body,
      });
      return info.messageId as string;
    } catch (err) {
      throw new AppException(`Email send failed: ${(err as Error).message}`, 'EMAIL_SEND_FAILED', {
        contact: payload.contact,
      });
    }
  }

  /**
   * Validates that a contact string is a well-formed email address.
   *
   * @param contact - The value to validate.
   */
  validateContact(contact: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  }

  /** Constructs the Nodemailer SMTP transporter from environment config. */
  private buildTransporter(): Transporter {
    return nodemailer.createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: Number(this.config.getOrThrow<string>('SMTP_PORT')),
      secure: false,
      auth: {
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.config.getOrThrow<string>('SMTP_PASS'),
      },
    });
  }
}
