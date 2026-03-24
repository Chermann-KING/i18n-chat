import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';

/**
 * Scheduled job that permanently deletes expired anonymous targets.
 *
 * **GDPR compliance**: anonymous recipient data must not be kept beyond
 * {@link ANONYMOUS_TARGET_TTL_DAYS} days after the dispatch was created.
 * This job runs every night at 02:00 UTC and removes all rows whose
 * `purgeAt` timestamp is in the past.
 *
 * The job is registered in `DispatchModule` and requires `@nestjs/schedule`
 * to be initialised in the root `AppModule`.
 */
@Injectable()
export class PurgeAnonymousTargetsJob {
  private readonly logger = new Logger(PurgeAnonymousTargetsJob.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Deletes all {@link AnonymousTarget} rows whose `purgeAt` date has passed.
   * Cascades to related {@link Message} and {@link DispatchVariableSet} rows.
   *
   * Runs every day at 02:00 UTC.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeExpiredTargets(): Promise<void> {
    this.logger.log('Starting GDPR purge of expired anonymous targets…');

    const result = await this.prisma.anonymousTarget.deleteMany({
      where: { purgeAt: { lte: new Date() } },
    });

    this.logger.log(`Purge complete — ${result.count} anonymous target(s) deleted.`);
  }
}
