import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChannelModule } from '../channel/channel.module';
import { DeliveryStatusGateway } from './delivery-status.gateway';
import { DispatchProducer } from './dispatch.producer';
import { FailureNotificationService } from './failure-notification.service';
import { MessageRepository } from './message.repository';
import { QUEUE_EMAIL, QUEUE_SMS, QUEUE_WHATSAPP } from './queue.constants';
import { EmailWorker } from './workers/email.worker';
import { SmsWorker } from './workers/sms.worker';
import { WhatsAppWorker } from './workers/whatsapp.worker';

/**
 * Configures BullMQ queues, queue workers, the delivery gateway,
 * and the dispatch producer.
 *
 * Imports {@link ChannelModule} so workers can resolve channel adapters.
 * Registers three queues: `email-messages`, `sms-messages`, `whatsapp-messages`.
 * Provides {@link FailureNotificationService} to notify dispatch owners on total failure.
 */
@Module({
  imports: [
    ChannelModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_EMAIL }, { name: QUEUE_SMS }, { name: QUEUE_WHATSAPP }),
  ],
  providers: [
    MessageRepository,
    DispatchProducer,
    DeliveryStatusGateway,
    FailureNotificationService,
    EmailWorker,
    SmsWorker,
    WhatsAppWorker,
  ],
  exports: [DispatchProducer, MessageRepository, DeliveryStatusGateway],
})
export class QueueModule {}
