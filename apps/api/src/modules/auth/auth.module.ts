import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Encapsulates all authentication concerns: JWT strategies, guards,
 * and the login / refresh / logout endpoints.
 *
 * {@link PrismaModule} is global, so `PrismaService` is available here
 * without an explicit import.
 */
@Module({
  imports: [
    PassportModule,
    // JwtModule registered without a default secret — each sign/verify call
    // explicitly provides the correct secret via ConfigService.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
