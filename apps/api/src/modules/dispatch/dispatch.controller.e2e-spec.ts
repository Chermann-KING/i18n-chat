import { HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DispatchStatus, MessageChannel, MessageStatus, RecipientMode } from '@i18n-chat/domain';
import type { TDispatchResponse } from '@i18n-chat/dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DispatchController } from './dispatch.controller';
import { MessageController } from './message.controller';
import { DispatchService } from './dispatch.service';
import { MessageRepository } from './message.repository';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DISPATCH_ID = '00000000-0000-0000-0000-000000000001';
const TEMPLATE_ID = '00000000-0000-0000-0000-000000000002';
const RECIPIENT_ID = '00000000-0000-0000-0000-000000000003';
const MSG_ID = '00000000-0000-0000-0000-000000000004';
const USER_ID = '00000000-0000-0000-0000-000000000005';

const MOCK_USER = { id: USER_ID, email: 'staff@example.com', role: 'STAFF' };

const DISPATCH_RESPONSE: TDispatchResponse = {
  id: DISPATCH_ID,
  recipientMode: RecipientMode.REGISTERED,
  templateId: TEMPLATE_ID,
  freeTextOriginal: null,
  status: DispatchStatus.QUEUED,
  scheduledAt: null,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
  messageCount: 2,
};

const DISPATCH_SERVICE_MOCK = {
  createDispatch: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
};

const MESSAGE_REPO_MOCK = {
  findByDispatchId: jest.fn(),
};

// ─── Setup ───────────────────────────────────────────────────────────────────

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [DispatchController, MessageController],
    providers: [
      { provide: DispatchService, useValue: DISPATCH_SERVICE_MOCK },
      { provide: MessageRepository, useValue: MESSAGE_REPO_MOCK },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: (): boolean => true })
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: (): boolean => true })
    .compile();

  const app = module.createNestApplication();
  app.use((_req: unknown, _res: unknown, next: () => void) => {
    const req = _req as { user: typeof MOCK_USER };
    req.user = MOCK_USER;
    next();
  });
  return app.init();
}

// ─── POST /dispatches ────────────────────────────────────────────────────────

describe('POST /dispatches', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await buildApp();
    DISPATCH_SERVICE_MOCK.createDispatch.mockResolvedValue(DISPATCH_RESPONSE);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('returns 201 with the created dispatch', async () => {
    const res = await request(app.getHttpServer())
      .post('/dispatches')
      .send({
        recipientMode: RecipientMode.REGISTERED,
        channels: [MessageChannel.EMAIL],
        templateId: TEMPLATE_ID,
        recipientIds: [RECIPIENT_ID],
      });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body).toMatchObject({ id: DISPATCH_ID, status: DispatchStatus.QUEUED });
  });

  it('returns 400 when channels array is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/dispatches')
      .send({ recipientMode: RecipientMode.REGISTERED, templateId: 'tpl-uuid' });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('passes the authenticated user id to the service', async () => {
    await request(app.getHttpServer())
      .post('/dispatches')
      .send({
        recipientMode: RecipientMode.REGISTERED,
        channels: [MessageChannel.EMAIL],
        templateId: TEMPLATE_ID,
      });

    expect(DISPATCH_SERVICE_MOCK.createDispatch).toHaveBeenCalledWith(
      expect.anything(),
      MOCK_USER.id,
    );
  });
});

// ─── GET /dispatches ─────────────────────────────────────────────────────────

describe('GET /dispatches', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await buildApp();
    DISPATCH_SERVICE_MOCK.findAll.mockResolvedValue({ data: [DISPATCH_RESPONSE], total: 1 });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('returns 200 with paged dispatch list', async () => {
    const res = await request(app.getHttpServer()).get('/dispatches');

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({ data: [{ id: DISPATCH_ID }], total: 1 });
  });
});

// ─── GET /dispatches/:id ──────────────────────────────────────────────────────

describe('GET /dispatches/:id', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('returns 200 with the dispatch', async () => {
    DISPATCH_SERVICE_MOCK.findById.mockResolvedValue(DISPATCH_RESPONSE);

    const res = await request(app.getHttpServer()).get(`/dispatches/${DISPATCH_ID}`);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({ id: DISPATCH_ID, messageCount: 2 });
  });
});

// ─── GET /dispatches/:id/messages ─────────────────────────────────────────────

describe('GET /dispatches/:id/messages', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await buildApp();
    MESSAGE_REPO_MOCK.findByDispatchId.mockResolvedValue([
      {
        id: MSG_ID,
        dispatchId: DISPATCH_ID,
        recipientId: RECIPIENT_ID,
        anonymousTargetId: null,
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
      },
    ]);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('returns 200 with the message list', async () => {
    const res = await request(app.getHttpServer()).get(`/dispatches/${DISPATCH_ID}/messages`);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: MSG_ID, channel: MessageChannel.EMAIL });
  });
});
