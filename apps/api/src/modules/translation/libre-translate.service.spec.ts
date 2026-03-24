import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@i18n-chat/domain';
import { LibreTranslateService } from './libre-translate.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONFIG_STUB = { getOrThrow: jest.fn().mockReturnValue('http://libre.local:5000') };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildService(): Promise<LibreTranslateService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [LibreTranslateService, { provide: ConfigService, useValue: CONFIG_STUB }],
  }).compile();
  return module.get(LibreTranslateService);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LibreTranslateService — translate()', () => {
  let service: LibreTranslateService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ translatedText: 'Hallo' }),
    } as unknown as Response);
    service = await buildService();
  });

  afterEach(() => fetchSpy.mockRestore());

  it('returns the translated text on success', async () => {
    const result = await service.translate('Bonjour', 'nl', 'fr');
    expect(result).toBe('Hallo');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://libre.local:5000/translate',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses "auto" as source language by default', async () => {
    await service.translate('Hello', 'fr');
    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { source: string };
    expect(body.source).toBe('auto');
  });

  it('throws AppException when HTTP response is not ok', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 503 } as unknown as Response);
    await expect(service.translate('Hello', 'nl')).rejects.toThrow(AppException);
  });

  it('throws AppException when LibreTranslate returns an error body', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ error: 'Language pair not supported' }),
    } as unknown as Response);
    await expect(service.translate('Hello', 'xx')).rejects.toThrow(AppException);
  });
});
