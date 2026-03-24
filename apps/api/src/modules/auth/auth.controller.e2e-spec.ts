import { HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { TAuthTokens } from '@i18n-chat/dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-uuid', email: 'test@example.com', role: 'SENDER', isActive: true };

const TOKEN_PAIR: TAuthTokens = {
  accessToken: 'access.token',
  refreshToken: 'refresh.token',
  expiresIn: 900,
};

const AUTH_SERVICE_MOCK = {
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: AUTH_SERVICE_MOCK }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (): boolean => true })
      .overrideGuard(JwtRefreshGuard)
      .useValue({ canActivate: (): boolean => true })
      .compile();

    app = module.createNestApplication();
    // Inject a mock authenticated user so @CurrentUser() resolves in protected routes.
    app.use((_req: unknown, _res: unknown, next: () => void) => {
      const req = _req as { user: typeof MOCK_USER };
      req.user = MOCK_USER;
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  // ── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns 200 with token pair for valid credentials', async () => {
      AUTH_SERVICE_MOCK.login.mockResolvedValue(TOKEN_PAIR);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@i18n-chat.local', password: 'Admin1234!' });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toMatchObject({ accessToken: expect.any(String), expiresIn: 900 });
    });

    it('returns 400 when email is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'Admin1234!' });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@i18n-chat.local', password: 'short' });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  // ── POST /auth/refresh ────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns 200 with new token pair for valid refresh token', async () => {
      AUTH_SERVICE_MOCK.refreshTokens.mockResolvedValue(TOKEN_PAIR);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'some.refresh.token' });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toMatchObject({ accessToken: expect.any(String) });
    });

    it('returns 400 when refreshToken field is missing', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh').send({});

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  // ── POST /auth/logout ─────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('returns 204 and revokes tokens', async () => {
      AUTH_SERVICE_MOCK.logout.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer()).post('/auth/logout').send();

      expect(res.status).toBe(HttpStatus.NO_CONTENT);
      expect(AUTH_SERVICE_MOCK.logout).toHaveBeenCalledWith(MOCK_USER.id);
    });
  });
});
