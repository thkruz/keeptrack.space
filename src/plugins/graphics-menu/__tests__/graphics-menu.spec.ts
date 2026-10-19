import { expect, test } from '@test/e2e/coverage';
import { loadFixedIssScene } from '@test/e2e/fixed-scene';
import { expectCleanBoot } from '@test/e2e/keeptrack-fixtures';

/*
 * Visual baseline for plan 05 T2: the OSS Graphics menu shows the overall
 * quality selector above the Display and Orbits cards. Local-only. The Pro build
 * appends its own sections (covered by the Pro spec), so this one skips there.
 */
test.describe('Graphics menu (OSS) @local', () => {
  test('quality selector and OSS cards @local', async ({ page }) => {
    await loadFixedIssScene(page, { date: new Date('2008-09-20T12:30:00.000Z') });

    await page.evaluate(() => {
      const api = (window as unknown as { keepTrack: { api: { getPluginByName(n: string): { bottomMenuClicked(): void } } } }).keepTrack.api;

      api.getPluginByName('GraphicsMenuPlugin').bottomMenuClicked();
    });

    const menu = page.locator('#graphics-menu');

    await expect(menu).toBeVisible({ timeout: 5_000 });
    test.skip((await page.locator('#settings-section-graphics-sun').count()) > 0, 'Pro build: the Pro spec owns this baseline');

    await expect(page.locator('#gm-quality-section')).toBeVisible();
    await expect(page.locator('#settings-section-graphics-display')).toBeVisible();
    await expect(page.locator('#settings-section-graphics-orbits')).toBeVisible();

    // Default OSS settings satisfy every level's rules, so the highest level is lit.
    await expect(page.locator('#gm-quality-ultra')).toHaveClass(/gm-preset-active/u);

    // Let the side-menu slide-in finish before capturing.
    await page.waitForTimeout(1_000);
    await expect(menu).toHaveScreenshot('graphics-menu-oss.png', { maxDiffPixelRatio: 0.02 });

    expectCleanBoot(page);
  });
});
