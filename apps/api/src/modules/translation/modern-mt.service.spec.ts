import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@i18n-chat/domain';
import { ModernMtService } from './modern-mt.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const API_KEY = 'test-api-key';
const CONFIG_STUB = { getOrThrow: jest.fn().mockReturnValue(API_KEY) };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildService(): Promise<ModernMtService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [ModernMtService, { provide: ConfigService, useValue: CONFIG_STUB }],
  }).compile();
  return module.get(ModernMtService);
}

function mockFetch(payload: unknown, ok = true): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as Response);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ModernMtService — translate()', () => {
  let service: ModernMtService;
  let fetchSpy: jest.SpyInstance;

  afterEach(() => fetchSpy.mockRestore());

  it('returns the translated text on success', async () => {
    fetchSpy = mockFetch({ status: 200, data: { translation: 'Hallo' } });
    service = await buildService();

    const result = await service.translate('Bonjour', 'nl', 'fr');

    expect(result).toBe('Hallo');
  });

  it('sends the MMT-ApiKey header', async () => {
    fetchSpy = mockFetch({ status: 200, data: { translation: 'Hallo' } });
    service = await buildService();

    await service.translate('Bonjour', 'nl', 'fr');

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['MMT-ApiKey']).toBe(API_KEY);
  });

  it('includes source language in the URL when provided', async () => {
    fetchSpy = mockFetch({ status: 200, data: { translation: 'Hallo' } });
    service = await buildService();

    await service.translate('Bonjour', 'nl', 'fr');

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('source=fr');
    expect(url).toContain('target=nl');
  });

  it('omits source language from the URL when not provided', async () => {
    fetchSpy = mockFetch({ status: 200, data: { translation: 'Hello' } });
    service = await buildService();

    await service.translate('Bonjour', 'en');

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).not.toContain('source=');
  });

  it('throws AppException when HTTP response is not ok', async () => {
    fetchSpy = mockFetch({}, false);
    service = await buildService();

    await expect(service.translate('Hello', 'nl')).rejects.toThrow(AppException);
  });

  it('throws AppException when ModernMT returns an error body', async () => {
    fetchSpy = mockFetch({
      status: 200,
      error: { type: 'LanguagePairNotSupported', message: 'Language pair not supported' },
    });
    service = await buildService();

    await expect(service.translate('Hello', 'xx')).rejects.toThrow(AppException);
  });
});
