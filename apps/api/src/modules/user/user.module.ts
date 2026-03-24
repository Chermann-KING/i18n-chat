import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

/**
 * Provides staff user account management (admin-only CRUD).
 *
 * `UserService` is exported so other modules can perform user lookups
 * without duplicating the persistence logic.
 */
@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
