import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { Mock, vi } from 'vitest';
import {
  buildKtocNoticesUrl,
  escapeKtocHtml,
  fetchKtocNotices,
  formatKtocUtc,
  isKtocCanceled,
  isKtocFetchError,
  isSafeNoticeUrl,
  ktocEventLabel,
  ktocEventTypeLabel,
  ktocStatusLabel,
  normalizeKtocCode,
} from '../ktoc-notices-api';
import { jsonResponse, NOTICE_CANCELED, NOTICE_IN_CATALOG, NOTICE_RELOCATION, responseBody } from './ktoc-notices-fixtures';

describe('ktoc-notices-api', () => {
  let fetchMock: Mock;
  /** The test env makes unrelated background fetches; only look at the notices request. */
  const noticeCall = () => fetchMock.mock.calls.find(([url]) => String(url).includes('/v4/notices')) as [string, RequestInit];

  beforeEach(() => {
    setupStandardEnvironment();
    settingsManager.apiServer = 'https://api.keeptrack.space';
    settingsManager.apiKey = 'kt_00112233445566778899aabbccddeeff';
    fetchMock = vi.fn(() => Promise.resolve(jsonResponse(responseBody([NOTICE_RELOCATION]))));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildKtocNoticesUrl', () => {
    it('builds the feed URL from settingsManager.apiServer', () => {
      expect(buildKtocNoticesUrl()).toBe('https://api.keeptrack.space/v4/notices?limit=100');
    });

    it('appends norad and activeOnly after limit', () => {
      expect(buildKtocNoticesUrl({ norad: 25544, activeOnly: true })).toBe('https://api.keeptrack.space/v4/notices?limit=100&norad=25544&activeOnly=true');
    });

    it('follows a custom API server without doubling slashes', () => {
      settingsManager.apiServer = 'http://localhost:8787/';

      expect(buildKtocNoticesUrl({ limit: 25 })).toBe('http://localhost:8787/v4/notices?limit=25');
    });
  });

  describe('fetchKtocNotices', () => {
    it('GETs the feed with the X-API-Key header', async () => {
      const result = await fetchKtocNotices();

      const [url, init] = noticeCall();

      expect(url).toBe('https://api.keeptrack.space/v4/notices?limit=100');
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>)['X-API-Key']).toBe('kt_00112233445566778899aabbccddeeff');
      expect(result).toEqual({ ok: true, notices: [NOTICE_RELOCATION] });
    });

    it('omits the header when no key is configured and still sends the request', async () => {
      settingsManager.apiKey = '';

      await fetchKtocNotices({ norad: 28158 });

      const [url, init] = noticeCall();

      expect(url).toContain('norad=28158');
      expect((init.headers as Record<string, string>)['X-API-Key']).toBeUndefined();
    });

    it.each([401, 403])('reports HTTP %i as an auth failure', async (status) => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'API key required', message: 'Get a free API key at https://keeptrack.space' }, status));

      const result = await fetchKtocNotices();

      expect(result).toEqual({ ok: false, failure: 'auth', status });
      expect(isKtocFetchError(result)).toBe(true);
    });

    it('reports other HTTP errors with their status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));

      expect(await fetchKtocNotices()).toEqual({ ok: false, failure: 'http', status: 500 });
    });

    it('reports a rejected fetch as a network failure', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      expect(await fetchKtocNotices()).toEqual({ ok: false, failure: 'network' });
    });

    it('reports a body without a notices array as a parse failure', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0 }));

      expect(await fetchKtocNotices()).toEqual({ ok: false, failure: 'parse', status: 200 });
    });

    it('returns an empty list for an empty feed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(responseBody([])));

      expect(await fetchKtocNotices()).toEqual({ ok: true, notices: [] });
    });

    it('sorts newest event first', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(responseBody([NOTICE_RELOCATION, NOTICE_IN_CATALOG, NOTICE_CANCELED])));

      const result = await fetchKtocNotices();

      expect(isKtocFetchError(result)).toBe(false);
      expect((result as { notices: { notice_id: string }[] }).notices.map((n) => n.notice_id)).toEqual([
        NOTICE_IN_CATALOG.notice_id,
        NOTICE_CANCELED.notice_id,
        NOTICE_RELOCATION.notice_id,
      ]);
    });
  });

  describe('labels', () => {
    it('spells out known event types', () => {
      expect(ktocEventTypeLabel('RELOCATION')).toBe('Relocation');
      expect(ktocEventTypeLabel('DEPARTURE')).toBe('Departure');
      expect(ktocEventTypeLabel('FRAGMENTATION')).toBe('Fragmentation');
      expect(ktocEventTypeLabel('debris-shed')).toBe('Debris Shed');
    });

    it('humanizes unknown event types and falls back for an empty one', () => {
      expect(ktocEventTypeLabel('ORBIT_RAISE')).toBe('Orbit Raise');
      expect(ktocEventTypeLabel('')).toBe('Other event');
    });

    it('spells out statuses', () => {
      expect(ktocStatusLabel('CONFIRMED')).toBe('Confirmed');
      expect(ktocStatusLabel('POTENTIAL')).toBe('Potential');
      expect(ktocStatusLabel('CANCELED')).toBe('Canceled');
      expect(ktocStatusLabel('SUPERSEDED')).toBe('Superseded');
    });

    it('detects canceled notices, including the British spelling', () => {
      expect(isKtocCanceled(NOTICE_CANCELED)).toBe(true);
      expect(isKtocCanceled({ ...NOTICE_CANCELED, status: 'CANCELLED' })).toBe(true);
      expect(isKtocCanceled(NOTICE_RELOCATION)).toBe(false);
    });

    it('shows event numbers as "Event 47"', () => {
      expect(ktocEventLabel(47)).toBe('Event 47');
      expect(ktocEventLabel(null)).toBe('Unnumbered');
    });

    it('normalizes codes for explicit filter ids', () => {
      expect(normalizeKtocCode(' debris shed ')).toBe('DEBRIS_SHED');
    });
  });

  describe('formatKtocUtc', () => {
    it('formats in UTC regardless of the browser zone', () => {
      expect(formatKtocUtc(Date.UTC(2026, 5, 24, 23, 45, 59))).toBe('2026-06-24 23:45 UTC');
      expect(formatKtocUtc(NOTICE_RELOCATION.event_date_ms)).toBe('2026-06-24 23:45 UTC');
    });

    it('handles a non-finite value', () => {
      expect(formatKtocUtc(Number.NaN)).toBe('Unknown date');
    });
  });

  describe('safety helpers', () => {
    it('accepts only http(s) notice links', () => {
      expect(isSafeNoticeUrl(NOTICE_RELOCATION.url)).toBe(true);
      expect(isSafeNoticeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeNoticeUrl('not a url')).toBe(false);
    });

    it('escapes tooltip text', () => {
      expect(escapeKtocHtml('<b>"x"</b> & \'y\'')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; &#39;y&#39;');
    });
  });
});
