import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@i18n-chat/domain';
import { UserRole } from '@prisma/client';
import type { User, RefreshToken } from '@prisma/client';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';

// Jest hoists jest.mock() calls automatically — placing after imports is safe.
jest.mock('argon2');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const FIXED_ACCESS_TOKEN = 'access.token.mock';
const FIXED_REFRESH_TOKEN = 'refresh.token.mock';

const mockUser: User = {
  id: 'user-uuid',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  role: UserRole.SENDER,
  preferredLanguageCode: 'fr',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRefreshToken: RefreshToken = {
  id: 'token-uuid',
  userId: mockUser.id,
  tokenHash: hashToken(FIXED_REFRESH_TOKEN),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  revokedAt: null,
  createdAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<Pick<PrismaService, 'user' | 'refreshToken'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;

  beforeEach(async () => {
    const prismaUserMock = {
      findUnique: jest.fn(),
    };
    const prismaRefreshTokenMock = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: prismaUserMock,
            refreshToken: prismaRefreshTokenMock,
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue(FIXED_ACCESS_TOKEN),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-secret') },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  // ── login() ───────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns a token pair for valid credentials', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.mocked(argon2.verify).mockResolvedValue(true);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue(mockRefreshToken);

      const result = await service.login(mockUser.email, 'correct-password');

      expect(result).toMatchObject({ accessToken: expect.any(String), expiresIn: 900 });
    });

    it('throws UnauthorizedException when user is not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.login('unknown@example.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login(mockUser.email, 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.mocked(argon2.verify).mockResolvedValue(false);

      await expect(service.login(mockUser.email, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── refreshTokens() ───────────────────────────────────────────────────────

  describe('refreshTokens()', () => {
    it('rotates tokens for a valid non-revoked refresh token', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(mockRefreshToken);
      jest
        .spyOn(prisma.refreshToken, 'update')
        .mockResolvedValue({ ...mockRefreshToken, revokedAt: new Date() });
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue(mockRefreshToken);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(FIXED_ACCESS_TOKEN)
        .mockReturnValueOnce(FIXED_REFRESH_TOKEN);

      const result = await service.refreshTokens(FIXED_REFRESH_TOKEN);

      expect(result).toMatchObject({ accessToken: FIXED_ACCESS_TOKEN, expiresIn: 900 });
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
      );
    });

    it('throws UnauthorizedException when token is not found', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(null);

      await expect(service.refreshTokens('unknown-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is already revoked', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
        ...mockRefreshToken,
        revokedAt: new Date(),
      });

      await expect(service.refreshTokens(FIXED_REFRESH_TOKEN)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token is expired', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refreshTokens(FIXED_REFRESH_TOKEN)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── logout() ──────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('revokes all active refresh tokens for the user', async () => {
      jest.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 2 });

      await service.logout(mockUser.id);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
