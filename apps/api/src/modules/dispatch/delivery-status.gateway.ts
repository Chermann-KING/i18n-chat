import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { MessageStatus } from '@i18n-chat/domain';

/**
 * WebSocket gateway that pushes real-time message delivery status updates
 * to connected staff clients.
 *
 * Clients subscribe to a specific message UUID using the `subscribe` event.
 * The gateway then emits `message:status` events to that message's room.
 *
 * Namespace: `/delivery`
 */
@WebSocketGateway({ namespace: '/delivery', cors: true })
export class DeliveryStatusGateway {
  /** socket.io server instance injected by NestJS. */
  @WebSocketServer()
  private readonly server!: Server;

  /**
   * Broadcasts a delivery status change to all clients subscribed to the message.
   *
   * Called by queue workers after each send attempt.
   *
   * @param messageId - UUID of the message whose status changed.
   * @param status - The new delivery status.
   */
  emitStatusUpdate(messageId: string, status: MessageStatus): void {
    this.server.to(messageId).emit('message:status', { messageId, status });
  }

  /**
   * Subscribes a client to status updates for a specific message.
   *
   * The client joins a socket.io room named after the message UUID.
   *
   * @param client - The connected socket instance.
   * @param messageId - UUID of the message to subscribe to.
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() messageId: string,
  ): Promise<void> {
    await client.join(messageId);
  }
}
