import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@i18n-chat/domain';
import { SmsChannel } from './sms.channel';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONFIG_MAP: Record<string, string> = {
  SMS_API_URL: 'https://rest.test.local/sms/json',
  SMS_PROVIDER_API_KEY: 'test-key',
  SMS_PROVIDER_API_SECRET: 'test-secret',
  SMS_FROM: '+32000000000',
};

const SUCCESS_RESPONSE = { messages: [{ status: '0', 'message-id': 'sms-msg-id' }] };
const ERROR_RESPONSE = {
  messages: [{ status: '4', 'message-id': '', 'error-text': 'Unauthorized' }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildChannel(): Promise<SmsChannel> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SmsChannel,
      { provide: ConfigService, useValue: { getOrThrow: (k: string) => CONFIG_MAP[k] ?? 'x' } },
    ],
  }).compile();
  return module.get(SmsChannel);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SmsChannel — send()', () => {
  let channel: SmsChannel;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(SUCCESS_RESPONSE),
    } as unknown as Response);
    channel = await buildChannel();
  });

  afterEach(() => fetchSpy.mockRestore());

  it('returns the provider message ID on success', async () => {
    const result = await channel.send({ contact: '+32499000000', body: 'Hello' });
    expect(result).toBe('sms-msg-id');
  });

  it('throws AppException when HTTP response is not ok', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 } as unknown as Response);
    await expect(channel.send({ contact: '+32499000000', body: 'Hi' })).rejects.toThrow(
      AppException,
    );
  });

  it('throws AppException when provider returns non-zero status', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(ERROR_RESPONSE),
    } as unknown as Response);
    await expect(channel.send({ contact: '+32499000000', body: 'Hi' })).rejects.toThrow(
      AppException,
    );
  });
});

describe('SmsChannel — validateContact()', () => {
  let channel: SmsChannel;

  beforeEach(async () => {
    channel = await buildChannel();
  });

  it.each([
    ['+32499123456', true],
    ['32499123456', false],
    ['user@example.com', false],
  ])('returns %s for "%s"', async (input, expected) => {
    expect(channel.validateContact(input)).toBe(expected);
  });
});
