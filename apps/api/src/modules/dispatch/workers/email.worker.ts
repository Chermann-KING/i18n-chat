import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { MessageStatus } from '@i18n-chat/domain';
import { EmailChannel } from '../../channel/email/email.channel';
import { DeliveryStatusGateway } from '../delivery-status.gateway';
import { FailureNotificationService } from '../failure-notification.service';
import { MessageRepository } from '../message.repository';
import { QUEUE_EMAIL } from '../queue.constants';
import type { DeliveryJobData } from '../queue.constants';

/**
 * BullMQ worker that processes email delivery jobs from the `email-messages` queue.
 *
 * On success: updates the message status to `SENT` and emits a WebSocket event.
 * On failure: updates the status to `FAILED`, emits the event, then re-throws
 * so BullMQ can apply the configured retry back-off.
 * After every job: notifies the dispatch owner if all messages failed and
 * the owner has `notifyOnFailure = true`.
 */
@Processor(QUEUE_EMAIL)
export class EmailWorker extends WorkerHost {
  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly messageRepo: MessageRepository,
    private readonly gateway: DeliveryStatusGateway,
    private readonly failureNotification: FailureNotificationService,
  ) {
    super();
  }

  /**
   * Delivers a single email message and persists the outcome.
   *
   * @param job - BullMQ job carrying a {@link DeliveryJobData} payload.
   */
  async process(job: Job<DeliveryJobData>): Promise<void> {
    const { messageId, dispatchId, contact, body, subject } = job.data;

    try {
      const providerMessageId = await this.emailChannel.send({ contact, body, subject });
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
    } finally {
      await this.messageRepo.finalizeDispatchIfComplete(dispatchId);
      await this.failureNotification.notifyOwnerIfNeeded(dispatchId);
    }
  }
}
