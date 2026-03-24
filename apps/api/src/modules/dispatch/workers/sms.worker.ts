import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { MessageStatus } from '@i18n-chat/domain';
import { SmsChannel } from '../../channel/sms/sms.channel';
import { DeliveryStatusGateway } from '../delivery-status.gateway';
import { MessageRepository } from '../message.repository';
import { QUEUE_SMS } from '../queue.constants';
import type { DeliveryJobData } from '../queue.constants';

/**
 * BullMQ worker that processes SMS delivery jobs from the `sms-messages` queue.
 *
 * On success: updates the message status to `SENT` and emits a WebSocket event.
 * On failure: updates the status to `FAILED`, emits the event, then re-throws
 * so BullMQ can apply the configured retry back-off.
 */
@Processor(QUEUE_SMS)
export class SmsWorker extends WorkerHost {
  constructor(
    private readonly smsChannel: SmsChannel,
    private readonly messageRepo: MessageRepository,
    private readonly gateway: DeliveryStatusGateway,
  ) {
    super();
  }

  /**
   * Delivers a single SMS message and persists the outcome.
   *
   * @param job - BullMQ job carrying a {@link DeliveryJobData} payload.
   */
  async process(job: Job<DeliveryJobData>): Promise<void> {
    const { messageId, contact, body } = job.data;

    try {
      const providerMessageId = await this.smsChannel.send({ contact, body });
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
