import { Module } from '@nestjs/common';
import { EmailChannel } from './email/email.channel';
import { SmsChannel } from './sms/sms.channel';
import { WhatsAppChannel } from './whatsapp/whatsapp.channel';
import { WhatsAppTemplateService } from './whatsapp/whatsapp-template.service';
import { WhatsAppWebhookController } from './whatsapp/whatsapp-webhook.controller';

/**
 * Provides and exports all message delivery channel adapters.
 *
 * Registered channels:
 * - {@link EmailChannel} — SMTP via Nodemailer (Brevo)
 * - {@link SmsChannel} — Vonage-compatible REST API
 * - {@link WhatsAppChannel} — Meta Cloud API (Graph API v18)
 *
 * Also exposes {@link WhatsAppTemplateService} for HSM template management
 * and registers {@link WhatsAppWebhookController} for Meta callbacks.
 *
 * `PrismaService` is injected globally via `PrismaModule` and requires
 * no explicit import here.
 */
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [EmailChannel, SmsChannel, WhatsAppChannel, WhatsAppTemplateService],
  exports: [EmailChannel, SmsChannel, WhatsAppChannel, WhatsAppTemplateService],
})
export class ChannelModule {}
