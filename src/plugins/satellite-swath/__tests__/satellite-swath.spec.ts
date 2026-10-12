import { expect, test } from '@test/e2e/coverage';
import { fixedSceneMasks, loadFixedIssScene, lookAtLatLon, selectFixedIss } from '@test/e2e/fixed-scene';
import { expectCleanBoot } from '@test/e2e/keeptrack-fixtures';

/*
 * Visual baseline for plan 01 T3: the ground swath of the pinned ISS with the mr-eo preset
 * (120 km nadir, 20 deg field of regard, Sun >= 10 deg). Local-only (screenshots depend on this GPU).
 *
 * At 2008-09-20 12:30 UTC the Sun is over the Atlantic, so a camera over the eastern Pacific
 * sees both lit and dark stretches of the next orbit's ground track. "Daylight only" then hides
 * the dark stretches, so the second capture must differ from the first.
 */
type SwathWindow = {
  keepTrack: {
    api: {
      getScene(): { swathFactory: { rebuildCount: number; meshes: { vertexCount: number }[]; targetId: number } };
      getPluginByName(n: string): { closeSettingsMenu(): void; openSettingsMenu(): void };
    };
  };
  settingsManager: { isDrawSwath: boolean };
};

test.describe('Satellite swath @local', () => {
  test('ISS ground swath, then daylight only @local', async ({ page }) => {
    await loadFixedIssScene(page, { date: new Date('2008-09-20T12:30:00.000Z'), plugins: { SatelliteSwath: { enabled: true } } });
    await selectFixedIss(page);

    const icon = page.locator('#SatelliteSwath-utility-icon');

    await expect(icon).toBeVisible();
    await icon.dispatchEvent('click');
    await expect(icon).toHaveClass(/bmenu-item-selected/u);
    await expect(page.locator('#satellite-swath-menu')).toBeVisible({ timeout: 5_000 });

    // The ribbon builds once the orbit cruncher answers for the ISS.
    await page.waitForFunction(
      () => {
        const f = (window as unknown as SwathWindow).keepTrack.api.getScene().swathFactory;

        return f.rebuildCount > 0 && (f.meshes[0]?.vertexCount ?? 0) > 0;
      },
      undefined,
      { timeout: 15_000 }
    );
    expect(await page.evaluate(() => (window as unknown as SwathWindow).settingsManager.isDrawSwath)).toBe(true);

    // Close the menu so the globe is unobstructed, then capture the dimmed-night ribbon.
    await page.evaluate(() => (window as unknown as SwathWindow).keepTrack.api.getPluginByName('SatelliteSwath').closeSettingsMenu());
    await lookAtLatLon(page, 10, -135, 0.3);
    const dimmed = await page.screenshot({ mask: fixedSceneMasks(page) });

    await expect(page).toHaveScreenshot('iss-swath.png', { maxDiffPixelRatio: 0.02, mask: fixedSceneMasks(page) });

    // Daylight only, through the menu switch.
    await page.evaluate(() => (window as unknown as SwathWindow).keepTrack.api.getPluginByName('SatelliteSwath').openSettingsMenu());
    await page.waitForTimeout(500);
    await page.locator('label[for="swath-daylight-only"]').click();
    await page.evaluate(() => (window as unknown as SwathWindow).keepTrack.api.getPluginByName('SatelliteSwath').closeSettingsMenu());
    await page.waitForTimeout(1_000);
    const daylightOnly = await page.screenshot({ mask: fixedSceneMasks(page) });

    await expect(page).toHaveScreenshot('iss-swath-daylight-only.png', { maxDiffPixelRatio: 0.02, mask: fixedSceneMasks(page) });
    expect(daylightOnly.equals(dimmed)).toBe(false);

    expectCleanBoot(page);
  });
});
