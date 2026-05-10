import { expect, test } from '@playwright/test';
import { expectCleanBoot, waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('App smoke tests', () => {
  test('app loads and becomes ready', async ({ page }) => {
    await waitForAppReady(page);

    // Loading screen should be gone
    await expect(page.locator('#loading-screen')).toBeHidden();

    // keepTrack.isReady should be true (already checked by waitForAppReady,
    // but verify it's still true)
    const isReady = await page.evaluate(() => (window as any).keepTrack?.isReady);

    expect(isReady).toBe(true);

    // Catches console.warn / console.error / pageerror against the
    // allowlist in test/e2e/console-listener.ts.
    expectCleanBoot(page);
  });

  test('app boots without console warnings or errors', async ({ page }) => {
    await waitForAppReady(page);
    expectCleanBoot(page);
  });

  test('canvas exists with non-zero dimensions', async ({ page }) => {
    await waitForAppReady(page);

    const canvas = page.locator('#keeptrack-canvas');

    await expect(canvas).toBeAttached();

    const box = await canvas.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('bottom menu renders with icons', async ({ page }) => {
    await waitForAppReady(page);

    const bottomMenu = page.locator('#bottom-icons');

    await expect(bottomMenu).toBeAttached();

    // Should have at least a few bottom icons rendered
    const iconCount = await bottomMenu.locator('.bmenu-item').count();

    expect(iconCount).toBeGreaterThanOrEqual(3);
  });

  test('drawer opens and shows plugin groups', async ({ page }) => {
    await waitForAppReady(page);

    const hamburger = page.locator('#drawer-hamburger');

    await expect(hamburger).toBeAttached();

    await hamburger.click();

    // Drawer should now be visible with at least one group
    const drawerGroups = page.locator('.drawer-group');

    await expect(drawerGroups.first()).toBeVisible({ timeout: 3_000 });

    const groupCount = await drawerGroups.count();

    expect(groupCount).toBeGreaterThanOrEqual(1);
  });

  test('clicking a bottom icon toggles side menu', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { FilterMenuPlugin: { enabled: true } },
    });

    const icon = page.locator('#filter-menu-icon');

    await expect(icon).toBeAttached({ timeout: 5_000 });

    // Click to open
    await icon.click();
    await expect(icon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });

    const sideMenu = page.locator('#filter-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Click again to close
    await icon.click();
    await expect(icon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });

  test('time display is visible', async ({ page }) => {
    await waitForAppReady(page);

    // The datetime display should exist and show a date-like string
    const timeDisplay = page.locator('#datetime-text');

    await expect(timeDisplay).toBeAttached();

    const text = await timeDisplay.textContent();

    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(5);
  });
});
