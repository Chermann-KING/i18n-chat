import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@i18n-chat/domain';
import { WhatsAppChannel } from './whatsapp.channel';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONFIG_MAP: Record<string, string> = {
  WA_PHONE_NUMBER_ID: 'phone-123',
  WA_ACCESS_TOKEN: 'test-token',
};

const META_SUCCESS = { messages: [{ id: 'wa-msg-id' }] };
const META_ERROR = { error: { message: 'Invalid token', code: 190 } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildChannel(): Promise<WhatsAppChannel> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WhatsAppChannel,
      { provide: ConfigService, useValue: { getOrThrow: (k: string) => CONFIG_MAP[k] ?? 'x' } },
    ],
  }).compile();
  return module.get(WhatsAppChannel);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WhatsAppChannel — send()', () => {
  let channel: WhatsAppChannel;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: jest.fn().mockResolvedValue(META_SUCCESS),
    } as unknown as Response);
    channel = await buildChannel();
  });

  afterEach(() => fetchSpy.mockRestore());

  it('returns Meta message ID for a template message', async () => {
    const result = await channel.send({
      contact: '+32499000000',
      body: 'Rendered body',
      waTemplateName: 'appointment_reminder',
      waTemplateComponents: ['Amina', '01/04'],
      languageCode: 'fr',
    });

    expect(result).toBe('wa-msg-id');
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('phone-123');
  });

  it('sends type=text when waTemplateName is absent', async () => {
    await channel.send({ contact: '+32499000000', body: 'Free text' });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { type: string };
    expect(body.type).toBe('text');
  });

  it('uses "en" as fallback language when languageCode is omitted', async () => {
    await channel.send({ contact: '+32499000000', body: 'Hello', waTemplateName: 'tpl' });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { template: { language: { code: string } } };
    expect(body.template.language.code).toBe('en');
  });

  it('throws AppException when Meta returns an error', async () => {
    fetchSpy.mockResolvedValue({
      json: jest.fn().mockResolvedValue(META_ERROR),
    } as unknown as Response);

    await expect(channel.send({ contact: '+32499000000', body: 'Hi' })).rejects.toThrow(
      AppException,
    );
  });
});

describe('WhatsAppChannel — validateContact()', () => {
  let channel: WhatsAppChannel;

  beforeEach(async () => {
    channel = await buildChannel();
  });

  it.each([
    ['+32499123456', true],
    ['32499123456', false],
  ])('returns %s for "%s"', async (input, expected) => {
    expect(channel.validateContact(input)).toBe(expected);
  });
});
