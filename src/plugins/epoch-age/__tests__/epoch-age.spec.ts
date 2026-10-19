import { expect, test } from '@test/e2e/coverage';
import { FIXED_ISS_EPOCH_MS, fixedSceneMasks, loadFixedIssScene, selectFixedIss } from '@test/e2e/fixed-scene';
import { expectCleanBoot, isProBuild, OSS_BASELINE_SKIP } from '@test/e2e/keeptrack-fixtures';

/*
 * Visual baseline for plan 02 T3: with the pinned ISS selected 10 days after its
 * element epoch, the Epoch Age badge reads "low, +10.0 d" and the slider track
 * carries the trust tint. Local-only.
 */
test.describe('Epoch age badge @local', () => {
  test('badge shows low at epoch + 10 d @local', async ({ page }) => {
    await loadFixedIssScene(page, { date: new Date(FIXED_ISS_EPOCH_MS + 10 * 86400e3) });
    test.skip(await isProBuild(page), OSS_BASELINE_SKIP);
    await selectFixedIss(page);

    const badge = page.locator('#epoch-age-badge');

    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-level', 'low');
    await expect(badge).toContainText('+10.0 d');

    await expect(page).toHaveScreenshot('epoch-age-badge-low.png', {
      maxDiffPixelRatio: 0.02,
      clip: { x: 0, y: 0, width: 1280, height: 120 },
      mask: fixedSceneMasks(page),
    });

    expectCleanBoot(page);
  });
});
