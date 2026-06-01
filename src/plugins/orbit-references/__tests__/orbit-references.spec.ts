import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('OrbitReferences Plugin', () => {
  test('loads without errors as a background plugin with no UI', async ({ page }) => {
    const pageErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));

    await waitForAppReady(page, {
      plugins: { OrbitReferences: { enabled: true } },
    });

    // OrbitReferences has no bottom icon, no side menu, and no drawer entry.
    // It injects a link into the sat-info-box actions section only when a satellite is selected.
    // Without a selected satellite, there is no visible UI to test.

    // Verify the app loaded without plugin-related errors
    const pluginErrors = pageErrors.filter((e) => (/orbit.?ref/iu).test(e));

    expect(pluginErrors).toHaveLength(0);

    // The orbit-references-link should NOT exist until a satellite is selected
    await expect(page.locator('#orbit-references-link')).not.toBeAttached({ timeout: 2_000 });
  });
});
