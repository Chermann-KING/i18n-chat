import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { MessageStatus } from '@i18n-chat/domain';
import { WhatsAppChannel } from '../../channel/whatsapp/whatsapp.channel';
import { DeliveryStatusGateway } from '../delivery-status.gateway';
import { MessageRepository } from '../message.repository';
import { QUEUE_WHATSAPP } from '../queue.constants';
import type { DeliveryJobData } from '../queue.constants';

/**
 * BullMQ worker that processes WhatsApp delivery jobs from the `whatsapp-messages` queue.
 *
 * Supports both HSM template messages (when `waTemplateName` is present in the job data)
 * and free-text messages.
 *
 * On success: updates the message status to `SENT` and emits a WebSocket event.
 * On failure: updates the status to `FAILED`, emits the event, then re-throws
 * so BullMQ can apply the configured retry back-off.
 */
@Processor(QUEUE_WHATSAPP)
export class WhatsAppWorker extends WorkerHost {
  constructor(
    private readonly waChannel: WhatsAppChannel,
    private readonly messageRepo: MessageRepository,
    private readonly gateway: DeliveryStatusGateway,
  ) {
    super();
  }

  /**
   * Delivers a single WhatsApp message and persists the outcome.
   *
   * @param job - BullMQ job carrying a {@link DeliveryJobData} payload.
   */
  async process(job: Job<DeliveryJobData>): Promise<void> {
    const { messageId, contact, body, languageCode, waTemplateName, waTemplateComponents } =
      job.data;

    try {
      const providerMessageId = await this.waChannel.send({
        contact,
        body,
        languageCode,
        waTemplateName,
        waTemplateComponents,
      });
      await this.messageRepo.updateStatus(messageId, {
        status: MessageStatus.SENT,
        providerMessageId,
        sentAt: new Date(),
      });
      this.gateway.emitStatusUpdate(messageId, MessageStatus.SENT);
    } catch (error) {
      await this.messageRepo.updateStatus(messageId, {
        status: MessageStatus.FAILED,
        errorDetails: { error: String(error) },
      });
      this.gateway.emitStatusUpdate(messageId, MessageStatus.FAILED);
      throw error;
    }
  }
}
