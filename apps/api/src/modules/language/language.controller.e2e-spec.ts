import { HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { TLanguageResponse } from '@i18n-chat/dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LanguageController } from './language.controller';
import { LanguageService } from './language.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'admin-uuid', email: 'admin@example.com', role: 'ADMIN', isActive: true };

const FR: TLanguageResponse = { code: 'fr', label: 'Français', isActive: true };
const NL: TLanguageResponse = { code: 'nl', label: 'Nederlands', isActive: true };

const LANGUAGE_SERVICE_MOCK = {
  findAll: jest.fn(),
  findByCode: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LanguageController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanguageController],
      providers: [{ provide: LanguageService, useValue: LANGUAGE_SERVICE_MOCK }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (): boolean => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: (): boolean => true })
      .compile();

    app = module.createNestApplication();
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

  // ── GET /languages ────────────────────────────────────────────────────────

  describe('GET /languages', () => {
    it('returns 200 with active languages', async () => {
      LANGUAGE_SERVICE_MOCK.findAll.mockResolvedValue([FR, NL]);

      const res = await request(app.getHttpServer()).get('/languages');

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toHaveLength(2);
    });

    it('passes includeInactive=true to the service', async () => {
      LANGUAGE_SERVICE_MOCK.findAll.mockResolvedValue([FR, NL]);

      await request(app.getHttpServer()).get('/languages?includeInactive=true');

      expect(LANGUAGE_SERVICE_MOCK.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ── GET /languages/:code ──────────────────────────────────────────────────

  describe('GET /languages/:code', () => {
    it('returns 200 for a known code', async () => {
      LANGUAGE_SERVICE_MOCK.findByCode.mockResolvedValue(FR);

      const res = await request(app.getHttpServer()).get('/languages/fr');

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toMatchObject({ code: 'fr' });
    });
  });

  // ── POST /languages ───────────────────────────────────────────────────────

  describe('POST /languages', () => {
    it('returns 201 for a valid payload', async () => {
      LANGUAGE_SERVICE_MOCK.create.mockResolvedValue(FR);

      const res = await request(app.getHttpServer())
        .post('/languages')
        .send({ code: 'fr', label: 'Français' });

      expect(res.status).toBe(HttpStatus.CREATED);
    });

    it('returns 400 when code is missing', async () => {
      const res = await request(app.getHttpServer()).post('/languages').send({ label: 'Français' });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  // ── PATCH /languages/:code ────────────────────────────────────────────────

  describe('PATCH /languages/:code', () => {
    it('returns 200 with updated language', async () => {
      const updated: TLanguageResponse = { ...FR, label: 'Français (MAJ)' };
      LANGUAGE_SERVICE_MOCK.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch('/languages/fr')
        .send({ label: 'Français (MAJ)' });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toMatchObject({ label: 'Français (MAJ)' });
    });
  });

  // ── DELETE /languages/:code ───────────────────────────────────────────────

  describe('DELETE /languages/:code', () => {
    it('returns 204 on successful deletion', async () => {
      LANGUAGE_SERVICE_MOCK.delete.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer()).delete('/languages/fr');

      expect(res.status).toBe(HttpStatus.NO_CONTENT);
    });
  });
});
