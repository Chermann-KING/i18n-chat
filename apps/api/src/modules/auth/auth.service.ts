import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@i18n-chat/domain';
import type { TAuthTokens } from '@i18n-chat/dto';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser, JwtAccessPayload } from './interfaces/jwt-payload.interface';

/** Access token lifetime in seconds (4 hours). */
const ACCESS_TOKEN_EXPIRES_IN = '4h';
/** Access token lifetime as a number for the response (14400 seconds). */
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 14400;
/** Refresh token lifetime (7 days). */
const REFRESH_TOKEN_EXPIRES_IN = '7d';
/** Refresh token TTL in days — used to compute `expiresAt` stored in DB. */
const REFRESH_TOKEN_TTL_DAYS = 7;

/**
 * Handles authentication operations: login, token rotation, and logout.
 *
 * Tokens:
 * - **Access token** — short-lived JWT (15 min), verified by {@link JwtStrategy}.
 * - **Refresh token** — longer-lived JWT (7 days), SHA-256 hashed before storage
 *   in `refresh_tokens`, enabling O(1) revocation checks without argon2 overhead.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Validates credentials and issues a token pair.
   *
   * @param email - Staff member email address.
   * @param password - Plain-text password to verify against the stored hash.
   * @returns A new access + refresh token pair.
   * @throws {UnauthorizedException} For invalid credentials or inactive accounts.
   */
  async login(email: string, password: string): Promise<TAuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role as unknown as AuthenticatedUser['role'],
      isActive: user.isActive,
    });

    await this.audit.log({
      userId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
    });

    return tokens;
  }

  /**
   * Rotates a refresh token: revokes the old one and issues a new pair.
   *
   * The JWT signature is already verified by {@link JwtRefreshStrategy} before
   * this method is called. This method performs the additional database checks
   * (not revoked, not expired) and executes the rotation.
   *
   * @param rawRefreshToken - The raw refresh token JWT from the client.
   * @returns A fresh access + refresh token pair.
   * @throws {UnauthorizedException} When the token is revoked, expired or tampered.
   */
  async refreshTokens(rawRefreshToken: string): Promise<TAuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid, expired, or revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role as unknown as AuthenticatedUser['role'],
      isActive: user.isActive,
    });
  }

  /**
   * Revokes all active refresh tokens for the given user.
   *
   * Called on explicit logout. The client must discard its local tokens.
   *
   * @param userId - UUID of the user logging out.
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({
      userId,
      action: 'auth.logout',
      entityType: 'User',
      entityId: userId,
    });
  }

  /**
   * Generates a signed access + refresh token pair and persists the refresh
   * token hash in the database.
   *
   * @param user - Authenticated user whose claims are embedded in the tokens.
   */
  private async generateTokenPair(user: AuthenticatedUser): Promise<TAuthTokens> {
    const accessPayload: Omit<JwtAccessPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: this.hashToken(refreshToken), expiresAt },
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS };
  }

  /**
   * Computes a deterministic SHA-256 hex digest of a token string.
   *
   * Used for O(1) database lookups without exposing the raw token at rest.
   *
   * @param token - Raw token value.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
