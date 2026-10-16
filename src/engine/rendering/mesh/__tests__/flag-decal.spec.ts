import type { Page } from '@playwright/test';
import { expect, test } from '@test/e2e/coverage';
import { fixedSceneMasks, loadFixedIssScene } from '@test/e2e/fixed-scene';
import { expectCleanBoot } from '@test/e2e/keeptrack-fixtures';

/*
 * Visual baselines for plan 04 T3: the owner country's flag projected onto the selected
 * satellite's model, on the camera-facing side. Local-only (screenshots depend on this GPU).
 *
 * The fixed scene serves TLEs only, so each object's catalog metadata is set in the page before
 * selection: type PAYLOAD (so the purpose-built model resolves) and its country (ISS -> the ISS
 * cell, US -> the US flag). The Starlink element set is synthetic (STARLINK-1007's catalog
 * number on a 53 deg shell) because the fixed date predates Starlink.
 */
const STARLINK_TLE = [
  'STARLINK-1007',
  '1 44713U 19074A   08264.51782528  .00001000  00000-0  70000-4 0  9990',
  '2 44713  53.0540 120.0000 0001400  90.0000 270.0000 15.06400000    11',
].join('\n');

type FlagWindow = {
  settingsManager: { isDrawFlagDecals: boolean };
  keepTrack: {
    api: {
      getCatalogManager(): { sccNum2Id(s: string): number | null; getObject(id: number): { type: number; country: string } };
      getPluginByName(n: string): { selectSat(id: number): void };
      getMainCamera(): { state: { camDistBuffer: number } };
      getMeshManager(): {
        currentMeshObject: { model?: { name: string; buffers?: unknown; bounds?: { radius: number } }; flag?: { enabled: boolean }; inSun: number };
        flagAtlasState_: string;
      };
    };
  };
};

/*
 * Times probed on this machine for a sunlit object whose camera-facing side is lit: Starlink's
 * array faces the camera at 12:25, the ISS modules at 13:25.
 */
const STARLINK_DATE = new Date('2008-09-20T12:25:00.000Z');
const ISS_DATE = new Date('2008-09-20T13:25:00.000Z');

async function boot(page: Page, date: Date): Promise<void> {
  await loadFixedIssScene(page, { date, extraTle: STARLINK_TLE, settings: { isFocusOnSatelliteWhenSelected: true, isFlagDecalsFeatureEnabled: true } });
  await page.waitForFunction(() => (window as unknown as FlagWindow).keepTrack.api.getCatalogManager().sccNum2Id('44713') !== null, undefined, { timeout: 30_000 });
}

async function closeUp(page: Page, sccNum: string, country: string, model: string, distKm: number): Promise<void> {
  await page.evaluate(
    ([scc, c]) => {
      const api = (window as unknown as FlagWindow).keepTrack.api;
      const id = api.getCatalogManager().sccNum2Id(scc)!;
      const obj = api.getCatalogManager().getObject(id);

      obj.type = 1; // SpaceObjectType.PAYLOAD
      obj.country = c;
      api.getPluginByName('SelectSatManager').selectSat(id);
    },
    [sccNum, country] as const
  );
  await page.waitForTimeout(2_000);
  await page.evaluate((d) => {
    (window as unknown as FlagWindow).keepTrack.api.getMainCamera().state.camDistBuffer = d;
  }, distKm);
  await page.waitForFunction(
    (name) => {
      const mm = (window as unknown as FlagWindow).keepTrack.api.getMeshManager();

      return mm.currentMeshObject.model?.name === name && Boolean(mm.currentMeshObject.model.buffers) && mm.flagAtlasState_ === 'ready';
    },
    model,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(2_000);
  const st = await page.evaluate(() => {
    const mo = (window as unknown as FlagWindow).keepTrack.api.getMeshManager().currentMeshObject;

    return { model: mo.model?.name, radius: mo.model?.bounds?.radius, flag: mo.flag?.enabled, inSun: mo.inSun };
  });

  console.log(`FLAG ${sccNum} ${JSON.stringify(st)}`);
}

test.describe('Flag decal @local', () => {
  test.setTimeout(150_000);

  test('Starlink close-up with the US flag, then the setting off @local', async ({ page }) => {
    await boot(page, STARLINK_DATE);
    await closeUp(page, '44713', 'US', 'starlink', 0.03);
    const withFlag = await page.screenshot({ mask: fixedSceneMasks(page) });

    await expect(page).toHaveScreenshot('flag-decal-starlink.png', { maxDiffPixelRatio: 0.02, mask: fixedSceneMasks(page) });

    await page.evaluate(() => {
      (window as unknown as FlagWindow).settingsManager.isDrawFlagDecals = false;
    });
    await page.waitForTimeout(1_000);
    const withoutFlag = await page.screenshot({ mask: fixedSceneMasks(page) });

    await expect(page).toHaveScreenshot('flag-decal-starlink-off.png', { maxDiffPixelRatio: 0.02, mask: fixedSceneMasks(page) });
    expect(withoutFlag.equals(withFlag)).toBe(false);

    expectCleanBoot(page);
  });

  test('ISS close-up with the ISS cell @local', async ({ page }) => {
    await boot(page, ISS_DATE);
    await closeUp(page, '25544', 'ISS', 'iss', 0.2);
    await expect(page).toHaveScreenshot('flag-decal-iss.png', { maxDiffPixelRatio: 0.02, mask: fixedSceneMasks(page) });

    expectCleanBoot(page);
  });
});
