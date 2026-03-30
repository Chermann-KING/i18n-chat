import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { MeController } from './me.controller';
import { UserService } from './user.service';

/**
 * Provides staff user account management.
 *
 * - {@link UserController} — admin-only CRUD for all users.
 * - {@link MeController} — self-service routes for the authenticated user.
 * - `UserService` is exported so other modules can perform user lookups.
 */
@Module({
  controllers: [MeController, UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
