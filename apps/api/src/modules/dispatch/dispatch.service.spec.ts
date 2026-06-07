import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  DispatchStatus,
  MessageChannel,
  MessageStatus,
  NotFoundException,
  RecipientMode,
  TRANSLATION_PROVIDER,
} from '@i18n-chat/domain';
import type { DispatchEntity, MessageEntity } from '@i18n-chat/domain';
import { DispatchService } from './dispatch.service';
import { DispatchRepository } from './dispatch.repository';
import { MessageRepository } from './message.repository';
import { RecipientRepository } from '../recipient/recipient.repository';
import { TemplateRepository } from '../template/template.repository';
import { TranslationService } from '../template/translation.service';
import { DispatchProducer } from './dispatch.producer';
import { AuditService } from '../audit/audit.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DISPATCH_ID = 'dispatch-uuid';
const USER_ID = 'user-uuid';
const RECIPIENT_ID = 'recipient-uuid';
const MSG_ID = 'msg-uuid';

const DISPATCH_ENTITY: DispatchEntity = {
  id: DISPATCH_ID,
  createdById: USER_ID,
  recipientMode: RecipientMode.REGISTERED,
  templateId: 'tpl-uuid',
  freeTextOriginal: null,
  status: DispatchStatus.DRAFT,
  scheduledAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const MESSAGE_ENTITY: MessageEntity = {
  id: MSG_ID,
  dispatchId: DISPATCH_ID,
  recipientId: RECIPIENT_ID,
  recipientName: 'Chermann KING',
  anonymousTargetId: null,
  anonymousContact: null,
  channel: MessageChannel.EMAIL,
  languageCode: 'fr',
  translatedBody: 'Bonjour',
  status: MessageStatus.PENDING,
  providerMessageId: null,
  errorDetails: null,
  sentAt: null,
  deliveredAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ─── Mock factories ───────────────────────────────────────────────────────────

function buildDispatchRepoMock(): jest.Mocked<DispatchRepository> {
  return {
    findById: jest.fn().mockResolvedValue(DISPATCH_ENTITY),
    findAll: jest.fn().mockResolvedValue({ data: [DISPATCH_ENTITY], total: 1 }),
    create: jest.fn().mockResolvedValue(DISPATCH_ENTITY),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    createAnonymousTarget: jest.fn().mockResolvedValue({
      id: 'anon-uuid',
      dispatchId: DISPATCH_ID,
      channel: MessageChannel.SMS,
      contact: '+32499000000',
      languageCode: 'nl',
      variables: {},
      purgeAt: new Date(),
      createdAt: new Date(),
    }),
    createVariableSet: jest.fn(),
    findAnonymousTargets: jest.fn().mockResolvedValue([]),
    findVariableSets: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<DispatchRepository>;
}

function buildMessageRepoMock(): jest.Mocked<MessageRepository> {
  return {
    create: jest.fn().mockResolvedValue(MESSAGE_ENTITY),
    findByDispatchId: jest.fn().mockResolvedValue([MESSAGE_ENTITY]),
    findById: jest.fn().mockResolvedValue(MESSAGE_ENTITY),
    updateStatus: jest.fn().mockResolvedValue(MESSAGE_ENTITY),
    countByDispatchIds: jest.fn().mockResolvedValue(new Map([[DISPATCH_ID, 1]])),
    finalizeDispatchIfComplete: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<MessageRepository>;
}

function buildRecipientRepoMock(): jest.Mocked<RecipientRepository> {
  return {
    findManyByIds: jest.fn().mockResolvedValue([
      {
        id: RECIPIENT_ID,
        firstName: 'Chermann',
        lastName: 'KING',
        preferredLanguageCode: 'fr',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    findChannelsBatch: jest.fn().mockResolvedValue([
      {
        id: 'ch-uuid',
        recipientId: RECIPIENT_ID,
        channel: MessageChannel.EMAIL,
        contact: 'chermann@example.com',
        isActive: true,
        createdAt: new Date(),
      },
    ]),
  } as unknown as jest.Mocked<RecipientRepository>;
}

function buildTemplateRepoMock(): jest.Mocked<TemplateRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findTranslation: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<TemplateRepository>;
}

type MockDeps = {
  dispatchRepo: jest.Mocked<DispatchRepository>;
  messageRepo: jest.Mocked<MessageRepository>;
  recipientRepo: jest.Mocked<RecipientRepository>;
  templateRepo: jest.Mocked<TemplateRepository>;
  translationSvc: { resolveBody: jest.Mock; resolveTranslation: jest.Mock };
  translationProvider: { translate: jest.Mock };
  producer: { enqueueAll: jest.Mock };
};

function collectMocks(deps: MockDeps): MockDeps {
  return deps;
}

async function buildService(
  overrides: {
    dispatchRepo?: Partial<jest.Mocked<DispatchRepository>>;
    messageRepo?: Partial<jest.Mocked<MessageRepository>>;
  } = {},
): Promise<{ service: DispatchService; mocks: MockDeps }> {
  const dispatchRepo = {
    ...buildDispatchRepoMock(),
    ...overrides.dispatchRepo,
  } as unknown as jest.Mocked<DispatchRepository>;
  const messageRepo = {
    ...buildMessageRepoMock(),
    ...overrides.messageRepo,
  } as unknown as jest.Mocked<MessageRepository>;
  const recipientRepo = buildRecipientRepoMock();
  const templateRepo = buildTemplateRepoMock();
  const translationSvc = {
    resolveBody: jest.fn().mockResolvedValue('Bonjour'),
    resolveTranslation: jest.fn().mockResolvedValue({ body: 'Bonjour' }),
  };
  const translationProvider = { translate: jest.fn().mockResolvedValue('Vertaald tekst') };
  const producer = { enqueueAll: jest.fn().mockResolvedValue(undefined) };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DispatchService,
      { provide: DispatchRepository, useValue: dispatchRepo },
      { provide: MessageRepository, useValue: messageRepo },
      { provide: RecipientRepository, useValue: recipientRepo },
      { provide: TemplateRepository, useValue: templateRepo },
      { provide: TranslationService, useValue: translationSvc },
      { provide: TRANSLATION_PROVIDER, useValue: translationProvider },
      { provide: DispatchProducer, useValue: producer },
      { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
    ],
  }).compile();

  const mocks = collectMocks({
    dispatchRepo,
    messageRepo,
    recipientRepo,
    templateRepo,
    translationSvc,
    translationProvider,
    producer,
  });
  return { service: module.get(DispatchService), mocks };
}

// ─── createDispatch — REGISTERED ─────────────────────────────────────────────

describe('DispatchService — createDispatch (REGISTERED)', () => {
  it('creates dispatch, messages, and enqueues them', async () => {
    const { service, mocks } = await buildService();

    const result = await service.createDispatch(
      {
        recipientMode: RecipientMode.REGISTERED,
        channels: [MessageChannel.EMAIL],
        templateId: 'tpl-uuid',
        recipientIds: [RECIPIENT_ID],
      },
      USER_ID,
    );

    expect(mocks.dispatchRepo.create).toHaveBeenCalledTimes(1);
    expect(mocks.messageRepo.create).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchRepo.updateStatus).toHaveBeenCalledWith(
      DISPATCH_ID,
      DispatchStatus.QUEUED,
    );
    expect(mocks.producer.enqueueAll).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(DISPATCH_ID);
    expect(result.messageCount).toBe(1);
  });

  it('merges globalVariables and recipientVariables before resolving body', async () => {
    const { service, mocks } = await buildService();

    await service.createDispatch(
      {
        recipientMode: RecipientMode.REGISTERED,
        channels: [MessageChannel.EMAIL],
        templateId: 'tpl-uuid',
        recipientIds: [RECIPIENT_ID],
        globalVariables: { date: '01/04' },
        recipientVariables: { [RECIPIENT_ID]: { prenom: 'Chermann' } },
      },
      USER_ID,
    );

    expect(mocks.translationSvc.resolveTranslation).toHaveBeenCalledWith(
      'tpl-uuid',
      'fr',
      expect.objectContaining({ date: '01/04', prenom: 'Chermann' }),
      expect.any(Array),
    );
  });

  it('skips channels the recipient has no contact for', async () => {
    const { service, mocks } = await buildService();

    await service.createDispatch(
      {
        recipientMode: RecipientMode.REGISTERED,
        channels: [MessageChannel.SMS], // recipient only has EMAIL
        templateId: 'tpl-uuid',
        recipientIds: [RECIPIENT_ID],
      },
      USER_ID,
    );

    expect(mocks.messageRepo.create).not.toHaveBeenCalled();
  });
});

// ─── createDispatch — ANONYMOUS ───────────────────────────────────────────────

describe('DispatchService — createDispatch (ANONYMOUS)', () => {
  it('creates anonymous target and message for each target', async () => {
    const anonDispatch = {
      ...DISPATCH_ENTITY,
      recipientMode: RecipientMode.ANONYMOUS,
      templateId: null,
      freeTextOriginal: 'Hello',
    };
    const { service, mocks } = await buildService({
      dispatchRepo: { create: jest.fn().mockResolvedValue(anonDispatch) },
    });

    await service.createDispatch(
      {
        recipientMode: RecipientMode.ANONYMOUS,
        channels: [MessageChannel.SMS],
        freeTextOriginal: 'Hello',
        targets: [
          {
            channel: MessageChannel.SMS,
            contact: '+32499000000',
            languageCode: 'nl',
            variables: {},
          },
        ],
      },
      USER_ID,
    );

    expect(mocks.dispatchRepo.createAnonymousTarget).toHaveBeenCalledTimes(1);
    expect(mocks.messageRepo.create).toHaveBeenCalledTimes(1);
    expect(mocks.translationProvider.translate).toHaveBeenCalledWith('Hello', 'nl');
  });
});

// ─── findById ─────────────────────────────────────────────────────────────────

describe('DispatchService — findById()', () => {
  it('returns dispatch with message count', async () => {
    const { service } = await buildService();
    const result = await service.findById(DISPATCH_ID);
    expect(result.id).toBe(DISPATCH_ID);
    expect(result.messageCount).toBe(1);
  });

  it('throws NotFoundException when dispatch not found', async () => {
    const { service } = await buildService({
      dispatchRepo: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.findById('missing-id')).rejects.toThrow(NotFoundException);
  });
});

// ─── findAll ──────────────────────────────────────────────────────────────────

describe('DispatchService — findAll()', () => {
  it('returns paged response', async () => {
    const { service } = await buildService();
    const result = await service.findAll();
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe(DISPATCH_ID);
  });
});
