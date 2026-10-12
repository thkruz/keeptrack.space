import { type Page } from '@playwright/test';
import { type AppReadyOptions, waitForAppReady } from './keeptrack-fixtures';

/**
 * Deterministic scenes for `@local` screenshot specs.
 *
 * The live catalog changes daily, so a baseline built on it drifts. This helper
 * boots with a pinned ISS element set served from a routed URL (`tle=` URL
 * param + `external-only`), a fixed sim time (`date=` URL param, confirmed in
 * url-manager.ts handleDateParam_) and time frozen (`rate=0`).
 */

/** Canonical Vallado SGP4 ISS test TLE, epoch 2008-09-20 12:25:40 UTC (day 264.51782528). */
export const FIXED_ISS_TLE = [
  'ISS (ZARYA)',
  '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
  '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
].join('\n');

/** Element epoch of {@link FIXED_ISS_TLE} in ms (2008 day 264.51782528). */
export const FIXED_ISS_EPOCH_MS = Date.UTC(2008, 0, 1) + (264.51782528 - 1) * 86400e3;

const FIXED_TLE_URL = 'http://localhost:5544/e2e-fixed/iss.txt';

export interface FixedSceneOptions extends AppReadyOptions {
  /** Sim time to boot at. */
  date: Date;
  /** More three-line element sets served after the ISS (name, line 1, line 2 joined by newlines). */
  extraTle?: string;
}

/** Boot the app on the pinned ISS-only catalog at a fixed, frozen sim time. */
export async function loadFixedIssScene(page: Page, options: FixedSceneOptions): Promise<void> {
  await page.route('**/e2e-fixed/iss.txt', (route) => route.fulfill({ contentType: 'text/plain', body: `${FIXED_ISS_TLE}\n${options.extraTle ? `${options.extraTle}\n` : ''}` }));
  // The supplement fetch only adds metadata; keep the spec offline and deterministic.
  await page.route('**/v4/sats/**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));

  const query = [`date=${options.date.toISOString()}`, 'rate=0', 'external-only', `tle=${encodeURIComponent(FIXED_TLE_URL)}`].join('&');

  const { extraTle: _extraTle, ...appOptions } = options;

  await waitForAppReady(page, {
    ...appOptions,
    query,
    // Keep the default whole-Earth camera when selecting so the full orbit is in frame.
    settings: {
      noCatalogOnLoad: false,
      isDisableLoginGate: true,
      isFocusOnSatelliteWhenSelected: false,
      // The JSC Vimpel catalog is fetched live and would add thousands of dots.
      isEnableJscCatalog: false, ...(options.settings ?? {}) },
  });

  await page.waitForFunction(
    () => (window as unknown as { keepTrack: { api: { getCatalogManager(): { sccNum2Id(s: string): number | null } } } }).keepTrack.api.getCatalogManager().sccNum2Id('25544') !== null,
    undefined,
    { timeout: 30_000 }
  );
}

/** Readouts that change between runs or carry no signal for the scene; mask them in screenshots. */
export const fixedSceneMasks = (page: Page) => [page.locator('#datetime-text'), page.locator('#sat-infobox')];

/** Select the pinned ISS through SelectSatManager and give the orbit cruncher time to answer. */
export async function selectFixedIss(page: Page): Promise<void> {
  await page.evaluate(() => {
    const api = (
      window as unknown as {
        keepTrack: { api: { getCatalogManager(): { sccNum2Id(s: string): number | null }; getPluginByName(n: string): { selectSat(id: number): void } } };
      }
    ).keepTrack.api;
    const id = api.getCatalogManager().sccNum2Id('25544');

    if (id !== null) {
      api.getPluginByName('SelectSatManager').selectSat(id);
    }
  });
  await page.waitForTimeout(3_000);
}

/** Point the camera at a lat/lon (deg) with a 0..1 zoom and let it settle. */
export async function lookAtLatLon(page: Page, lat: number, lon: number, zoom: number): Promise<void> {
  await page.evaluate(
    ([la, lo, z]) => {
      const api = (window as unknown as { keepTrack: { api: { getMainCamera(): { autoRotate(b: boolean): void; lookAtLatLon(a: number, b: number, c: number): void } } } })
        .keepTrack.api;
      const cam = api.getMainCamera();

      cam.autoRotate(false);
      cam.lookAtLatLon(la, lo, z);
    },
    [lat, lon, zoom] as const
  );
  await page.waitForTimeout(2_000);
}
