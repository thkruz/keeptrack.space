import { expect, test } from '@test/e2e/coverage';
import { loadFixedIssScene, selectFixedIss } from '@test/e2e/fixed-scene';
import { expectCleanBoot, isProBuild, OSS_BASELINE_SKIP } from '@test/e2e/keeptrack-fixtures';

/*
 * Visual baseline for plan 02 T2: eclipse bands on the time slider with the pinned
 * ISS selected. The ISS (91.6 min period) crosses Earth's shadow about 15 times in
 * the UTC day, so the track should carry ~15 evenly spaced bands. Local-only.
 */
test.describe('Time slider eclipse bands @local', () => {
  test('ISS selected paints eclipse bands on the slider @local', async ({ page }) => {
    await loadFixedIssScene(page, { date: new Date('2008-09-20T12:30:00.000Z') });
    test.skip(await isProBuild(page), OSS_BASELINE_SKIP);
    await selectFixedIss(page);

    const layer = page.locator('#time-slider-bands');

    await expect(layer).toHaveAttribute('style', /linear-gradient/u);

    await expect(page.locator('#time-slider-container')).toHaveScreenshot('iss-slider-bands.png', {
      maxDiffPixelRatio: 0.02,
      // The handle sits at the (fixed) sim time, so nothing on the bar moves between runs.
    });

    expectCleanBoot(page);
  });
});
