import { apiFetch } from '@app/app/data/api-fetch';
import { fetchJson, JsonFetchError } from '@app/app/data/fetch-json';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@app/app/data/api-fetch', () => ({ apiFetch: vi.fn() }));

const mockResponse = (body: string, init: { status?: number; contentType?: string | null } = {}): Response => {
  const status = init.status ?? 200;
  const headers = new Headers();

  if (init.contentType !== null) {
    headers.set('Content-Type', init.contentType ?? 'application/json');
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    text: () => Promise.resolve(body),
  } as unknown as Response;
};

describe('fetchJson', () => {
  const apiFetchMock = vi.mocked(apiFetch);

  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('parses a valid JSON body', async () => {
    apiFetchMock.mockResolvedValue(mockResponse('{"a":1,"b":[2,3]}'));

    await expect(fetchJson('data/x.json')).resolves.toStrictEqual({ a: 1, b: [2, 3] });
  });

  it('throws an actionable JsonFetchError when the SPA index.html is served (200 + HTML body)', async () => {
    apiFetchMock.mockResolvedValue(mockResponse('<!doctype html><html><head>', { status: 200, contentType: 'text/html' }));

    const err = await fetchJson('simulation/GlobalThermonuclearWar.json').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(JsonFetchError);
    expect((err as JsonFetchError).message).toContain('simulation/GlobalThermonuclearWar.json');
    expect((err as JsonFetchError).message).toContain('index.html');
    expect((err as JsonFetchError).status).toBe(200);
    // The opaque native message must NOT be what surfaces.
    expect((err as JsonFetchError).message).not.toContain('Unexpected token');
  });

  it('detects an HTML fallback even when the server mislabels the content-type', async () => {
    apiFetchMock.mockResolvedValue(mockResponse('  <!doctype html>...', { status: 200, contentType: 'application/json' }));

    await expect(fetchJson('data/x.json')).rejects.toBeInstanceOf(JsonFetchError);
  });

  it('throws on a non-OK status', async () => {
    apiFetchMock.mockResolvedValue(mockResponse('Not Found', { status: 404, contentType: 'text/plain' }));

    const err = await fetchJson('data/missing.json').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(JsonFetchError);
    expect((err as JsonFetchError).status).toBe(404);
  });

  it('throws JsonFetchError (not a bare SyntaxError) on malformed JSON', async () => {
    apiFetchMock.mockResolvedValue(mockResponse('{ not: valid, json', { status: 200 }));

    const err = await fetchJson('data/x.json').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(JsonFetchError);
    expect((err as JsonFetchError).message).toContain('data/x.json');
  });
});
