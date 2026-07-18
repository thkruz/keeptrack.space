import { orgDataService } from '@app/app/data/catalogs/org-data-service';
import { settingsManager } from '@app/settings/settings';
import { vi } from 'vitest';

/*
 * OrgDataService resolves organization codes to display names, falling back to
 * the bundled static map until the remote GCAT database loads. The singleton's
 * load state is global, so the not-loaded fallbacks are asserted first and the
 * loaded path (which flips the state permanently) runs last.
 */
describe('OrgDataService (before remote load)', () => {
  it('is not loaded by default', () => {
    expect(orgDataService.isLoaded).toBe(false);
  });

  it('resolveCode falls back to the provided static map', () => {
    expect(orgDataService.resolveCode('US', { US: 'United States' })).toBe('United States');
    expect(orgDataService.resolveCode('ZZ', { US: 'United States' })).toBeUndefined();
  });

  it('getOrg returns undefined before the database loads', () => {
    expect(orgDataService.getOrg('NASA')).toBeUndefined();
  });
});

describe('OrgDataService (after remote load)', () => {
  it('loads the database and resolves codes from it', async () => {
    // fetchOrgData_ reads window.settingsManager.dataSources.orgs outside its
    // try/catch; the global env setup is async, so wire it up explicitly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).settingsManager = settingsManager;
    settingsManager.dataSources.orgs = 'https://test.local/orgs.json';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          fetchedAt: '2026-01-01',
          source: 'test',
          count: 1,
          ownerCodeMap: { US: 'United States of America' },
          orgs: { NASA: { code: 'NASA', name: 'NASA', uName: 'NASA' } },
        }),
    } as Response);

    orgDataService.init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (orgDataService as any).loadPromise_;

    expect(orgDataService.isLoaded).toBe(true);
    // Loaded data takes precedence over the fallback map.
    expect(orgDataService.resolveCode('US', { US: 'IGNORED' })).toBe('United States of America');
    expect(orgDataService.getOrg('NASA')?.name).toBe('NASA');

    vi.restoreAllMocks();
  });

  it('init kicks off a fetch that falls back to bundled data on an HTTP error', async () => {
    // The singleton load-state is global; reset it so init() actually re-fetches here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, dot-notation
    (orgDataService as any).loadPromise_ = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, dot-notation
    (orgDataService as any).loaded_ = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).settingsManager = settingsManager;
    settingsManager.dataSources.orgs = 'https://test.local/orgs.json';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response);

    orgDataService.init();
    // A second init() short-circuits because a load is already in flight.
    orgDataService.init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, dot-notation
    await (orgDataService as any).loadPromise_;

    expect(orgDataService.isLoaded).toBe(false);

    vi.restoreAllMocks();
  });
});
