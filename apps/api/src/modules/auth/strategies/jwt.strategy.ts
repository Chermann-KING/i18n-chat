import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { AuthenticatedUser, JwtAccessPayload } from '../interfaces/jwt-payload.interface';

/**
 * Passport strategy for validating JWT **access** tokens.
 *
 * Extracts the bearer token from the `Authorization` header, verifies the
 * signature, then confirms the subject user still exists and is active.
 *
 * Registers under the name `'jwt'`, used by {@link JwtAuthGuard}.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Called by Passport after the JWT signature is verified.
   *
   * Loads the full user from the database to ensure the account is still active.
   *
   * @param payload - Decoded JWT access payload.
   * @returns The authenticated user attached to `request.user`.
   * @throws {UnauthorizedException} When the user no longer exists or is inactive.
   */
  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return { id: user.id, email: user.email, role: user.role, isActive: user.isActive };
  }
}
