import { expect, test } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('EditSat', () => {
  test('disabled when no satellite is selected', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { EditSat: { enabled: true } },
    });

    // 1. Bottom icon should exist but be disabled (requires satellite selection)
    const bottomIcon = page.locator('#edit-satellite-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // 2. Side menu should exist in DOM but be hidden
    const sideMenu = page.locator('#editSat-menu');

    await expect(sideMenu).toBeAttached();

    // 3. Open drawer and find plugin in CREATE group
    await page.locator('#drawer-hamburger').click();

    const group = page.locator('.drawer-group[data-group-key="mode-3"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="edit-satellite-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // 4. Clicking disabled drawer item should NOT open the side menu
    await drawerItem.click({ force: true });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 2_000 });

    // 5. Verify form elements exist in DOM even though menu is hidden
    await expect(page.locator('form#editSat-menu-form')).toBeAttached();
    await expect(page.locator('#es-scc')).toBeAttached();
    await expect(page.locator('#es-country')).toBeAttached();
    await expect(page.locator('#es-year')).toBeAttached();
    await expect(page.locator('#es-day')).toBeAttached();
    await expect(page.locator('#es-inc')).toBeAttached();
    await expect(page.locator('#es-rasc')).toBeAttached();
    await expect(page.locator('#es-ecen')).toBeAttached();
    await expect(page.locator('#es-argPe')).toBeAttached();
    await expect(page.locator('#es-meana')).toBeAttached();
    await expect(page.locator('#es-meanmo')).toBeAttached();
    await expect(page.locator('#es-per')).toBeAttached();

    // 6. Verify action buttons exist
    await expect(page.locator('#editSat-submit')).toBeAttached();
    await expect(page.locator('#editSat-newTLE')).toBeAttached();
    await expect(page.locator('#editSat-save')).toBeAttached();
    await expect(page.locator('#editSat-open')).toBeAttached();
    await expect(page.locator('#editSat-file')).toBeAttached();

    // 7. Verify SCC input is disabled (read-only) and accepts 9-digit width
    await expect(page.locator('#es-scc')).toBeDisabled();
    await expect(page.locator('#es-scc')).toHaveAttribute('maxlength', '9');
  });
});
