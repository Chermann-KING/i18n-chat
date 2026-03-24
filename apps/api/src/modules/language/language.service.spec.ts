import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@i18n-chat/domain';
import type { Language } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LanguageService } from './language.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockFr: Language = { code: 'fr', label: 'Français', isActive: true };
const mockNl: Language = { code: 'nl', label: 'Nederlands', isActive: true };
const mockInactive: Language = { code: 'ar', label: 'العربية', isActive: false };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LanguageService', () => {
  let service: LanguageService;
  let prisma: jest.Mocked<Pick<PrismaService, 'language'>>;

  beforeEach(async () => {
    const languageMock = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
        { provide: PrismaService, useValue: { language: languageMock } },
      ],
    }).compile();

    service = module.get<LanguageService>(LanguageService);
    prisma = module.get(PrismaService);
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns only active languages by default', async () => {
      jest.spyOn(prisma.language, 'findMany').mockResolvedValue([mockFr, mockNl]);

      const result = await service.findAll();

      expect(result).toEqual([mockFr, mockNl]);
      expect(prisma.language.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('returns all languages when includeInactive is true', async () => {
      jest.spyOn(prisma.language, 'findMany').mockResolvedValue([mockFr, mockNl, mockInactive]);

      const result = await service.findAll(true);

      expect(result).toHaveLength(3);
      expect(prisma.language.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  // ── findByCode() ──────────────────────────────────────────────────────────

  describe('findByCode()', () => {
    it('returns the language for a known code', async () => {
      jest.spyOn(prisma.language, 'findUnique').mockResolvedValue(mockFr);

      const result = await service.findByCode('fr');

      expect(result).toEqual(mockFr);
    });

    it('throws NotFoundException for an unknown code', async () => {
      jest.spyOn(prisma.language, 'findUnique').mockResolvedValue(null);

      await expect(service.findByCode('xx')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates and returns a new language', async () => {
      jest.spyOn(prisma.language, 'create').mockResolvedValue(mockFr);

      const result = await service.create({ code: 'fr', label: 'Français' });

      expect(result).toEqual(mockFr);
      expect(prisma.language.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { code: 'fr', label: 'Français' } }),
      );
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates and returns the language', async () => {
      const updated: Language = { ...mockFr, label: 'Français (mis à jour)' };
      jest.spyOn(prisma.language, 'findUnique').mockResolvedValue(mockFr);
      jest.spyOn(prisma.language, 'update').mockResolvedValue(updated);

      const result = await service.update('fr', { label: 'Français (mis à jour)' });

      expect(result.label).toBe('Français (mis à jour)');
    });

    it('throws NotFoundException when the language does not exist', async () => {
      jest.spyOn(prisma.language, 'findUnique').mockResolvedValue(null);

      await expect(service.update('xx', { label: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── delete() ──────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('deletes the language successfully', async () => {
      jest.spyOn(prisma.language, 'findUnique').mockResolvedValue(mockFr);
      jest.spyOn(prisma.language, 'delete').mockResolvedValue(mockFr);

      await service.delete('fr');

      expect(prisma.language.delete).toHaveBeenCalledWith({ where: { code: 'fr' } });
    });

    it('throws NotFoundException when the language does not exist', async () => {
      jest.spyOn(prisma.language, 'findUnique').mockResolvedValue(null);

      await expect(service.delete('xx')).rejects.toThrow(NotFoundException);
    });
  });
});
