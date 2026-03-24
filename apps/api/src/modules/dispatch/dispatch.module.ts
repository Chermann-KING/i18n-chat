import { Module } from '@nestjs/common';
import { PurgeAnonymousTargetsJob } from './purge-anonymous-targets.job';

/**
 * Dispatch module.
 *
 * Currently exposes the GDPR purge scheduled job.
 * The full dispatch service, controller, and queue workers
 * will be added in Phase 6.
 */
@Module({
  providers: [PurgeAnonymousTargetsJob],
})
export class DispatchModule {}
