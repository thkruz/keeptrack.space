import { CATALOG_STALE_AFTER_MS, formatCatalogAge, OfflineBanner } from '@app/app/ui/offline-banner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@app/locales/keys', () => ({
  t7e: (key: string, opts?: { age?: string }) => (opts?.age ? `${key}:${opts.age}` : key),
}));

const setOnline = (v: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(v);
const banner = () => document.getElementById('kt-offline-banner') as HTMLDivElement | null;

describe('OfflineBanner', () => {
  let b: OfflineBanner;

  beforeEach(() => {
    document.body.innerHTML = '';
    b = new OfflineBanner();
  });
  afterEach(() => {
    b.destroy();
    vi.restoreAllMocks();
  });

  it('creates nothing while online', () => {
    setOnline(true);
    b.init();
    expect(banner()).toBeNull();
  });

  it('shows to a user with no account state at all once offline, hides on reconnect', () => {
    setOnline(true);
    b.init();
    setOnline(false);
    window.dispatchEvent(new Event('offline'));
    expect(banner()?.hidden).toBe(false);
    expect(banner()?.textContent).toContain('offlineBanner.message');
    setOnline(true);
    window.dispatchEvent(new Event('online'));
    expect(banner()?.hidden).toBe(true);
  });

  it('shows immediately when the page loads already offline', () => {
    setOnline(false);
    b.init();
    expect(banner()?.hidden).toBe(false);
  });

  it('states the catalog age when the service worker reports a cached catalog', () => {
    setOnline(false);
    b.init();
    const catalog = () => banner()?.querySelector('.kt-offline-banner-catalog') as HTMLElement;

    expect(catalog().hidden).toBe(true);
    const fresh = { data: { type: 'CATALOG_FROM_CACHE', cachedAt: Date.now() - 3_600_000 } };

    (b as unknown as { onMessage_: (e: unknown) => void }).onMessage_(fresh);
    expect(catalog().hidden).toBe(false);
    expect(catalog().textContent).toContain('offlineBanner.catalogAge');
    (b as unknown as { onMessage_: (e: unknown) => void }).onMessage_({ data: { type: 'CATALOG_FROM_CACHE', cachedAt: Date.now() - CATALOG_STALE_AFTER_MS - 1000 } });
    expect(catalog().textContent).toContain('offlineBanner.catalogStale');
  });

  it('ignores unrelated service worker messages', () => {
    setOnline(false);
    b.init();
    (b as unknown as { onMessage_: (e: unknown) => void }).onMessage_({ data: { type: 'OTHER' } });
    expect((banner()!.querySelector('.kt-offline-banner-catalog') as HTMLElement).hidden).toBe(true);
  });

  it('formats ages in days, hours and minutes', () => {
    const now = 1_000_000_000_000;

    expect(formatCatalogAge(now - 3 * 86_400_000, now, 'en')).toBe('3 days ago');
    expect(formatCatalogAge(now - 2 * 3_600_000, now, 'en')).toBe('2 hours ago');
    expect(formatCatalogAge(now - 5 * 60_000, now, 'en')).toBe('5 minutes ago');
  });
});
