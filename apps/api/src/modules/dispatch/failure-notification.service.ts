import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailChannel } from '../channel/email/email.channel';

/**
 * Notifies the owner of a dispatch by email when all messages have failed.
 *
 * Checks the `notifyOnFailure` flag on the owning user before sending.
 * Errors during notification are swallowed and logged — a notification failure
 * must never prevent the worker from completing its own error handling.
 */
@Injectable()
export class FailureNotificationService {
  private readonly logger = new Logger(FailureNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailChannel: EmailChannel,
  ) {}

  /**
   * Sends a failure notification email to the dispatch owner if:
   * - The dispatch exists and all its messages have `FAILED` status.
   * - The owner has `notifyOnFailure = true`.
   *
   * @param dispatchId - UUID of the dispatch to evaluate.
   */
  async notifyOwnerIfNeeded(dispatchId: string): Promise<void> {
    try {
      await this.sendIfFailed(dispatchId);
    } catch (err) {
      this.logger.error(`Failure notification error for dispatch ${dispatchId}: ${String(err)}`);
    }
  }

  /** Performs the actual check and sends the email when conditions are met. */
  private async sendIfFailed(dispatchId: string): Promise<void> {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { status: true, createdById: true },
    });

    if (!dispatch || dispatch.status !== 'FAILED') return;

    const user = await this.prisma.user.findUnique({
      where: { id: dispatch.createdById },
      select: { email: true, notifyOnFailure: true },
    });

    if (!user?.notifyOnFailure) return;

    await this.emailChannel.send({
      contact: user.email,
      subject: 'i18n-chat — dispatch failed',
      body: `One of your dispatches (${dispatchId}) has failed. Please log in to review the details.`,
    });
  }
}
