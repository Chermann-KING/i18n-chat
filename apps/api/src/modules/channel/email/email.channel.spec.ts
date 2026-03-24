import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@i18n-chat/domain';
import * as nodemailer from 'nodemailer';
import { EmailChannel } from './email.channel';

// Jest hoists jest.mock() calls automatically — placing after imports is safe.
jest.mock('nodemailer');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONFIG_STUB = { getOrThrow: jest.fn((key: string) => `stub-${key}`) };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildChannel(sendMailMock: jest.Mock): Promise<EmailChannel> {
  jest.mocked(nodemailer.createTransport).mockReturnValue({
    sendMail: sendMailMock,
  } as unknown as nodemailer.Transporter);

  const module: TestingModule = await Test.createTestingModule({
    providers: [EmailChannel, { provide: ConfigService, useValue: CONFIG_STUB }],
  }).compile();

  return module.get(EmailChannel);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EmailChannel — send()', () => {
  let channel: EmailChannel;
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'smtp-id' });
    channel = await buildChannel(sendMailMock);
  });

  it('calls sendMail with correct fields and returns messageId', async () => {
    const result = await channel.send({
      contact: 'user@example.com',
      body: 'Hello World',
      subject: 'Test subject',
    });

    expect(result).toBe('smtp-id');
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com', text: 'Hello World' }),
    );
  });

  it('defaults subject to "(no subject)" when omitted', async () => {
    await channel.send({ contact: 'u@e.com', body: 'body' });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ subject: '(no subject)' }));
  });

  it('throws AppException when SMTP transport fails', async () => {
    sendMailMock.mockRejectedValue(new Error('Connection refused'));
    await expect(channel.send({ contact: 'u@e.com', body: 'body' })).rejects.toThrow(AppException);
  });
});

describe('EmailChannel — validateContact()', () => {
  let channel: EmailChannel;

  beforeEach(async () => {
    channel = await buildChannel(jest.fn());
  });

  it.each([
    ['user@example.com', true],
    ['not-an-email', false],
    ['', false],
  ])('returns %s for "%s"', async (input, expected) => {
    expect(channel.validateContact(input)).toBe(expected);
  });
});
