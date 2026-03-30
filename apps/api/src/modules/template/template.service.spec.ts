import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  WaTemplateStatus,
  type TemplateEntity,
  type TemplateTranslationEntity,
} from '@i18n-chat/domain';
import { TemplateRepository } from './template.repository';
import { AuditService } from '../audit/audit.service';
import { TemplateService } from './template.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockTranslation: TemplateTranslationEntity = {
  id: 'trans-uuid',
  templateId: 'tpl-uuid',
  languageCode: 'fr',
  name: null,
  subject: 'Objet test',
  body: 'Bonjour {{prenom}}',
  variableLabels: null,
  waTemplateName: null,
  waTemplateStatus: WaTemplateStatus.NOT_SUBMITTED,
  waTemplateCategory: null,
  waTemplateMetaId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockTemplate: TemplateEntity = {
  id: 'tpl-uuid',
  name: 'Test Template',
  slug: 'test_template',
  category: 'administrative',
  fallbackLanguageCode: 'en',
  createdById: 'user-uuid',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  variables: [],
  translations: [mockTranslation],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TemplateService', () => {
  let service: TemplateService;
  let repository: jest.Mocked<TemplateRepository>;

  beforeEach(async () => {
    const repoMock: jest.Mocked<TemplateRepository> = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findTranslation: jest.fn(),
      upsertTranslation: jest.fn(),
      updateWaTemplateStatus: jest.fn(),
      deleteTranslation: jest.fn(),
    } as unknown as jest.Mocked<TemplateRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: TemplateRepository, useValue: repoMock },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    repository = module.get(TemplateRepository);
  });

  // ── findById() ────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns a template response with translations', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTemplate);

      const result = await service.findById('tpl-uuid');

      expect(result.id).toBe('tpl-uuid');
      expect(result.translations).toHaveLength(1);
    });

    it('throws NotFoundException for unknown ID', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a template and returns the response', async () => {
      jest.spyOn(repository, 'create').mockResolvedValue(mockTemplate);

      const result = await service.create(
        { name: 'Test Template', slug: 'test_template', category: 'administrative', fallbackLanguageCode: 'en' },
        'user-uuid',
      );

      expect(result.slug).toBe('test_template');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'test_template', createdById: 'user-uuid' }),
      );
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates a template and returns the response', async () => {
      const updated: TemplateEntity = { ...mockTemplate, category: 'medical' };
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTemplate);
      jest.spyOn(repository, 'update').mockResolvedValue(updated);

      const result = await service.update('tpl-uuid', { category: 'medical' }, 'actor-uuid');

      expect(result.category).toBe('medical');
    });

    it('throws NotFoundException for unknown ID', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.update('unknown', { category: 'x' }, 'actor-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── delete() ──────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('soft-deletes a template', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTemplate);
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);

      await service.delete('tpl-uuid', 'actor-uuid');

      expect(repository.delete).toHaveBeenCalledWith('tpl-uuid');
    });

    it('throws NotFoundException for unknown ID', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.delete('unknown', 'actor-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // ── upsertTranslation() ───────────────────────────────────────────────────

  describe('upsertTranslation()', () => {
    it('upserts a translation and returns it', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTemplate);
      jest.spyOn(repository, 'upsertTranslation').mockResolvedValue(mockTranslation);

      const result = await service.upsertTranslation(
        'tpl-uuid',
        {
          languageCode: 'fr',
          body: 'Bonjour {{prenom}}',
        },
        'actor-uuid',
      );

      expect(result.languageCode).toBe('fr');
    });
  });

  // ── deleteTranslation() ───────────────────────────────────────────────────

  describe('deleteTranslation()', () => {
    it('deletes an existing translation', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTemplate);
      jest.spyOn(repository, 'findTranslation').mockResolvedValue(mockTranslation);
      jest.spyOn(repository, 'deleteTranslation').mockResolvedValue(undefined);

      await service.deleteTranslation('tpl-uuid', 'fr', 'actor-uuid');

      expect(repository.deleteTranslation).toHaveBeenCalledWith('tpl-uuid', 'fr');
    });

    it('throws NotFoundException when translation does not exist', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockTemplate);
      jest.spyOn(repository, 'findTranslation').mockResolvedValue(null);

      await expect(service.deleteTranslation('tpl-uuid', 'de', 'actor-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
