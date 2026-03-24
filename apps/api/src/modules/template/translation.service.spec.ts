import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  TemplateTranslationNotFoundException,
  WaTemplateStatus,
  type TemplateTranslationEntity,
} from '@i18n-chat/domain';
import { TemplateRepository } from './template.repository';
import { TranslationService } from './translation.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTranslation(languageCode: string, body: string): TemplateTranslationEntity {
  return {
    id: `trans-${languageCode}`,
    templateId: 'tpl-uuid',
    languageCode,
    subject: null,
    body,
    waTemplateName: null,
    waTemplateStatus: WaTemplateStatus.NOT_SUBMITTED,
    waTemplateCategory: null,
    waTemplateMetaId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

const frTranslation = makeTranslation('fr', 'Bonjour {{prenom}}, votre RDV est le {{date}}.');
const enTranslation = makeTranslation('en', 'Hello {{prenom}}, your appointment is on {{date}}.');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TranslationService', () => {
  let service: TranslationService;
  let repository: jest.Mocked<TemplateRepository>;

  beforeEach(async () => {
    const repoMock: jest.Mocked<TemplateRepository> = {
      findTranslation: jest.fn(),
    } as unknown as jest.Mocked<TemplateRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [TranslationService, { provide: TemplateRepository, useValue: repoMock }],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
    repository = module.get(TemplateRepository);
  });

  // ── resolveBody() ─────────────────────────────────────────────────────────

  describe('resolveBody()', () => {
    it('resolves the exact language translation and renders variables', async () => {
      jest.spyOn(repository, 'findTranslation').mockResolvedValue(frTranslation);

      const result = await service.resolveBody('tpl-uuid', 'fr', {
        prenom: 'Amina',
        date: '01/04/2026',
      });

      expect(result).toBe('Bonjour Amina, votre RDV est le 01/04/2026.');
    });

    it('falls back to English when the requested language has no translation', async () => {
      jest
        .spyOn(repository, 'findTranslation')
        .mockResolvedValueOnce(null) // nl not found
        .mockResolvedValueOnce(enTranslation); // en fallback

      const result = await service.resolveBody('tpl-uuid', 'nl', {
        prenom: 'Jan',
        date: '02/04/2026',
      });

      expect(result).toBe('Hello Jan, your appointment is on 02/04/2026.');
    });

    it('throws TemplateTranslationNotFoundException when neither language nor en exists', async () => {
      jest.spyOn(repository, 'findTranslation').mockResolvedValue(null);

      await expect(service.resolveBody('tpl-uuid', 'ar', {})).rejects.toThrow(
        TemplateTranslationNotFoundException,
      );
    });

    it('does not perform a second lookup when the requested language is already en', async () => {
      jest.spyOn(repository, 'findTranslation').mockResolvedValue(null);

      await expect(service.resolveBody('tpl-uuid', 'en', {})).rejects.toThrow(
        TemplateTranslationNotFoundException,
      );
      expect(repository.findTranslation).toHaveBeenCalledTimes(1);
    });
  });

  // ── renderBody() ──────────────────────────────────────────────────────────

  describe('renderBody()', () => {
    it('substitutes all variables in the Handlebars body', () => {
      const result = service.renderBody('Dear {{name}}, your code is {{code}}.', {
        name: 'Amina',
        code: 'ABC123',
      });

      expect(result).toBe('Dear Amina, your code is ABC123.');
    });

    it('leaves missing variables as empty strings', () => {
      const result = service.renderBody('Hello {{prenom}}!', {});
      expect(result).toBe('Hello !');
    });
  });
});
