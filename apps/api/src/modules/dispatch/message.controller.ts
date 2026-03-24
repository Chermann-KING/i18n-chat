import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { TMessageResponse } from '@i18n-chat/dto';
import { MessageRepository } from './message.repository';

/**
 * Exposes message records associated with a dispatch.
 *
 * All routes require a valid JWT (enforced globally by {@link JwtAuthGuard}).
 */
@ApiTags('dispatches')
@Controller('dispatches/:id/messages')
export class MessageController {
  constructor(private readonly messageRepo: MessageRepository) {}

  /**
   * Returns all messages for a given dispatch.
   *
   * @param id - UUID of the parent dispatch.
   */
  @Get()
  @ApiOperation({ summary: 'List messages for a dispatch' })
  @ApiResponse({ status: 200, description: 'Message list' })
  async findAll(@Param('id') id: string): Promise<TMessageResponse[]> {
    const messages = await this.messageRepo.findByDispatchId(id);

    return messages.map((m) => ({
      id: m.id,
      dispatchId: m.dispatchId,
      recipientId: m.recipientId,
      anonymousTargetId: m.anonymousTargetId,
      channel: m.channel,
      languageCode: m.languageCode,
      status: m.status,
      providerMessageId: m.providerMessageId,
      sentAt: m.sentAt?.toISOString() ?? null,
      deliveredAt: m.deliveredAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }
}
