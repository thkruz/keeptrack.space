import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/**
 * Power Tour v2 hub flow: standalone hub opening (never shows the account
 * card), completing the Time & Scenarios chapter (catalog-free, deterministic
 * events), and the hub -> chapter -> hub loop with persisted progress.
 */
test.describe('Onboarding Power Tour Hub', () => {
  test('hub opens standalone, Time & Scenarios completes, progress persists', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { OnboardingPlugin: { enabled: true } },
    });

    // ?tour=power is the standalone hub entry point (bridge-free, no account
    // stage). The settingsOverride route from waitForAppReady stays active.
    await page.goto('/?tour=power');
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 45_000 });
    await page.waitForFunction(
      () => (globalThis as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
      { timeout: 15_000 },
    );

    // The hub auto-opens shortly after the splash screen clears
    const popover = page.locator('.kt-tour-popover');

    await expect(popover).toBeVisible({ timeout: 15_000 });
    await expect(popover.locator('.kt-hub-rows')).toBeVisible();
    await expect(popover.locator('.kt-hub-progress')).toContainText('0 of');
    expect(await popover.locator('[data-chapter-id]').count()).toBeGreaterThanOrEqual(4);

    // Start the Time & Scenarios chapter (no catalog needed)
    await popover.locator('[data-chapter-id="time"]').click();
    await expect(popover.locator('.kt-tour-popover-title')).toHaveText('Speed up time');

    // Task verification: really speeding up time advances the step. Clicking
    // the VCR fast-forward button also regression-tests that coachmark shades
    // are click-through: the button sits OUTSIDE the datetime spotlight hole,
    // under the dim, and must still be clickable (menus/pickers/dropdowns
    // needed by task steps render outside the hole).
    await page.locator('#vcr-fast-forward-btn').click();

    // The task done: the tour dwells first (done note up, dim lifted) so the
    // user can see the result of what they pressed before it moves on
    await expect(popover.locator('.kt-tour-done-note')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('#kt-tour-root')).toHaveClass(/kt-tour-dwell/u);
    await expect(popover.locator('.kt-tour-popover-title')).toHaveText('Speed up time');

    // ...then advances on its own after the dwell
    await expect(popover.locator('.kt-tour-popover-title')).not.toHaveText('Speed up time', { timeout: 5_000 });

    // Walk the remaining steps with Next until the chapter hands back to the hub
    /* eslint-disable no-await-in-loop -- steps must be clicked strictly in sequence */
    for (let i = 0; i < 10; i++) {
      const nextBtn = popover.locator('[data-tour-action="next"]');

      if ((await popover.locator('.kt-hub-rows').count()) > 0) {
        break;
      }
      if ((await nextBtn.count()) > 0) {
        await nextBtn.click();
      }
      await page.waitForTimeout(400);
    }
    /* eslint-enable no-await-in-loop */

    // Back on the hub: the chapter is done and overall progress moved
    await expect(popover.locator('.kt-hub-rows')).toBeVisible();
    await expect(popover.locator('[data-chapter-id="time"] .kt-hub-status-done')).toBeVisible();
    await expect(popover.locator('.kt-hub-progress')).toContainText('1 of');

    // Chapter progress persisted (schema v2, chapter done, mission checked)
    const stored = await page.evaluate(() => localStorage.getItem('v2-keepTrack-onboardingState') ?? '');

    expect(stored).toContain('"schemaVersion":2');
    expect(JSON.parse(stored).powerChapters.time.status).toBe('done');
    expect(JSON.parse(stored).checklist.powerTour).toBe(true);

    // Standalone hub close never shows the account card
    await popover.locator('[data-tour-button="close"]').click();
    await expect(page.locator('#kt-tour-root')).toHaveCount(0);
    await expect(page.locator('[data-tour-button="create"]')).toHaveCount(0);
  });
});
