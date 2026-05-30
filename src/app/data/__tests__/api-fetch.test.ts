import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { settingsManager } from '@app/settings/settings';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, resetApiKeyWarning } from '@app/app/data/api-fetch';

describe('apiFetch', () => {
  const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    settingsManager.apiKey = '';
    resetApiKeyWarning();
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({ status: 200, ok: true } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('header injection', () => {
    it('should add x-api-key header when apiKey is set and URL is api.keeptrack.space', async () => {
      settingsManager.apiKey = 'test-key-123';

      await apiFetch('https://api.keeptrack.space/v4/sats/brief');

      const [, init] = mockFetch.mock.calls[0];

      expect(init.headers.get('x-api-key')).toBe('test-key-123');
    });

    it('should not add header when apiKey is empty', async () => {
      settingsManager.apiKey = '';

      await apiFetch('https://api.keeptrack.space/v4/sats/brief');

      const [, init] = mockFetch.mock.calls[0];

      expect(init).toBeUndefined();
    });

    it('should not add header for non-api.keeptrack.space URLs', async () => {
      settingsManager.apiKey = 'test-key-123';

      await apiFetch('https://celestrak.org/NORAD/elements/gp.php');

      const [, init] = mockFetch.mock.calls[0];

      expect(init).toBeUndefined();
    });

    it('should preserve existing headers from init', async () => {
      settingsManager.apiKey = 'test-key-123';

      await apiFetch('https://api.keeptrack.space/v4/sats/brief', {
        headers: { 'Content-Type': 'application/json' },
      });

      const [, init] = mockFetch.mock.calls[0];

      expect(init.headers.get('x-api-key')).toBe('test-key-123');
      expect(init.headers.get('Content-Type')).toBe('application/json');
    });

    it('should work with URL object input', async () => {
      settingsManager.apiKey = 'test-key-123';

      await apiFetch(new URL('https://api.keeptrack.space/v4/sats/brief'));

      const [, init] = mockFetch.mock.calls[0];

      expect(init.headers.get('x-api-key')).toBe('test-key-123');
    });

    it('should work with Request object input', async () => {
      settingsManager.apiKey = 'test-key-123';

      await apiFetch(new Request('https://api.keeptrack.space/v4/sats/brief'));

      const [, init] = mockFetch.mock.calls[0];

      expect(init.headers.get('x-api-key')).toBe('test-key-123');
    });
  });

  describe('401 warning toast', () => {
    beforeEach(() => {
      vi.spyOn(errorManagerInstance, 'warnToast').mockImplementation(() => {});
    });

    it('should show warnToast on first 401 from api.keeptrack.space', async () => {
      mockFetch.mockResolvedValueOnce({ status: 401, ok: false } as Response);

      await apiFetch('https://api.keeptrack.space/v4/sats/brief');

      expect(errorManagerInstance.warnToast).toHaveBeenCalledWith(
        'API key required. Get a free key at keeptrack.space and add it to settings/data-settings.ts',
      );
    });

    it('should not show toast on second 401', async () => {
      mockFetch.mockResolvedValue({ status: 401, ok: false } as Response);

      await apiFetch('https://api.keeptrack.space/v4/sats/brief');
      await apiFetch('https://api.keeptrack.space/v4/sats/brief');

      expect(errorManagerInstance.warnToast).toHaveBeenCalledTimes(1);
    });

    it('should not show toast for 401 from other domains', async () => {
      mockFetch.mockResolvedValueOnce({ status: 401, ok: false } as Response);

      await apiFetch('https://other-api.com/foo');

      expect(errorManagerInstance.warnToast).not.toHaveBeenCalled();
    });

    it('should not show toast for non-401 errors', async () => {
      mockFetch.mockResolvedValueOnce({ status: 403, ok: false } as Response);

      await apiFetch('https://api.keeptrack.space/v4/sats/brief');

      expect(errorManagerInstance.warnToast).not.toHaveBeenCalled();
    });

    it('should still return the 401 response to callers', async () => {
      mockFetch.mockResolvedValueOnce({ status: 401, ok: false } as Response);

      const response = await apiFetch('https://api.keeptrack.space/v4/sats/brief');

      expect(response.status).toBe(401);
    });
  });
});
