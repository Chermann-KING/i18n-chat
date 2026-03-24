import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { MessageChannel } from '@i18n-chat/domain';
import { DISPATCH_JOB_OPTIONS, QUEUE_EMAIL, QUEUE_SMS, QUEUE_WHATSAPP } from './queue.constants';
import type { DeliveryJobData } from './queue.constants';

/** An entity stub carrying only the fields needed for queue routing. */
interface RoutableMessage {
  readonly id: string;
  readonly channel: MessageChannel;
}

/**
 * Enqueues outbound messages to the appropriate BullMQ delivery queue.
 *
 * Each message is routed to one of: `email-messages`, `sms-messages`,
 * or `whatsapp-messages` based on its channel.
 */
@Injectable()
export class DispatchProducer {
  constructor(
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_WHATSAPP) private readonly waQueue: Queue,
  ) {}

  /**
   * Enqueues all delivery jobs in parallel.
   *
   * @param items - Each item pairs a routable message with its job payload.
   */
  async enqueueAll(items: { entity: RoutableMessage; jobData: DeliveryJobData }[]): Promise<void> {
    await Promise.all(items.map((item) => this.enqueueOne(item.entity, item.jobData)));
  }

  /** Routes a single message to the correct queue. */
  private async enqueueOne(message: RoutableMessage, jobData: DeliveryJobData): Promise<void> {
    const queue = this.resolveQueue(message.channel);
    await queue.add(message.id, jobData, DISPATCH_JOB_OPTIONS);
  }

  /** Returns the BullMQ queue for the given channel. */
  private resolveQueue(channel: MessageChannel): Queue {
    if (channel === MessageChannel.SMS) return this.smsQueue;
    if (channel === MessageChannel.WHATSAPP) return this.waQueue;
    return this.emailQueue;
  }
}
