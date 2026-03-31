import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { MeController } from './me.controller';
import { UserService } from './user.service';
import { ChannelModule } from '../channel/channel.module';

/**
 * Provides staff user account management.
 *
 * - {@link UserController} — admin-only CRUD for all users.
 * - {@link MeController} — self-service routes for the authenticated user.
 * - `UserService` is exported so other modules can perform user lookups.
 * - `ChannelModule` is imported to give `UserService` access to
 *   {@link EmailChannel} for welcome notifications on account creation.
 */
@Module({
  imports: [ChannelModule],
  controllers: [MeController, UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
