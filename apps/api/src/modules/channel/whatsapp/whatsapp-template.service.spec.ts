import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppException, WaTemplateCategory, WaTemplateStatus } from '@i18n-chat/domain';
import type { TemplateTranslation } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import type { SubmitTemplatePayload } from './whatsapp-template.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONFIG_MAP: Record<string, string> = {
  WA_BUSINESS_ACCOUNT_ID: 'biz-123',
  WA_ACCESS_TOKEN: 'test-token',
};

const SUBMIT_PAYLOAD: SubmitTemplatePayload = {
  templateId: 'tpl-uuid',
  languageCode: 'fr',
  waTemplateName: 'appointment_reminder',
  body: 'Bonjour {{prenom}}, votre RDV est le {{date}}.',
  category: WaTemplateCategory.UTILITY,
};

const MOCK_TRANSLATION = {
  id: 'trans-uuid',
  templateId: 'tpl-uuid',
  languageCode: 'fr',
  waTemplateName: 'appointment_reminder',
} as unknown as TemplateTranslation;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPrismaMock(): { templateTranslation: { findFirst: jest.Mock; update: jest.Mock } } {
  return {
    templateTranslation: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue(MOCK_TRANSLATION),
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WhatsAppTemplateService — submitTemplate()', () => {
  let service: WhatsAppTemplateService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: jest.fn().mockResolvedValue({ id: 'meta-456', status: 'PENDING' }),
    } as unknown as Response);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppTemplateService,
        { provide: ConfigService, useValue: { getOrThrow: (k: string) => CONFIG_MAP[k] ?? 'x' } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WhatsAppTemplateService);
  });

  afterEach(() => fetchSpy.mockRestore());

  it('posts to Meta and sets status to PENDING', async () => {
    await service.submitTemplate(SUBMIT_PAYLOAD);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('biz-123/message_templates'),
      expect.any(Object),
    );
    expect(prisma.templateTranslation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ waTemplateStatus: WaTemplateStatus.PENDING }),
      }),
    );
  });

  it('sets status to APPROVED when Meta responds with APPROVED immediately', async () => {
    fetchSpy.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ id: 'meta-789', status: 'APPROVED' }),
    } as unknown as Response);

    await service.submitTemplate(SUBMIT_PAYLOAD);

    expect(prisma.templateTranslation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ waTemplateStatus: WaTemplateStatus.APPROVED }),
      }),
    );
  });

  it('throws AppException when Meta returns an error', async () => {
    fetchSpy.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ error: { message: 'Duplicate name', code: 100 } }),
    } as unknown as Response);

    await expect(service.submitTemplate(SUBMIT_PAYLOAD)).rejects.toThrow(AppException);
  });
});

describe('WhatsAppTemplateService — syncApprovalStatus()', () => {
  let service: WhatsAppTemplateService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppTemplateService,
        { provide: ConfigService, useValue: { getOrThrow: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WhatsAppTemplateService);
  });

  it('updates status when the translation is found', async () => {
    prisma.templateTranslation.findFirst.mockResolvedValue(MOCK_TRANSLATION);

    await service.syncApprovalStatus('appointment_reminder', 'fr', WaTemplateStatus.APPROVED);

    expect(prisma.templateTranslation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ waTemplateStatus: WaTemplateStatus.APPROVED }),
      }),
    );
  });

  it('does nothing when no translation is found', async () => {
    prisma.templateTranslation.findFirst.mockResolvedValue(null);

    await service.syncApprovalStatus('unknown_tpl', 'fr', WaTemplateStatus.REJECTED);

    expect(prisma.templateTranslation.update).not.toHaveBeenCalled();
  });
});
