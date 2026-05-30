import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ClassificationBar Plugin', () => {
  test('displays classification banner with correct text and styling', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ClassificationBar: { enabled: true } },
      settings: { classificationStr: 'Unclassified' },
    });

    // Classification container should be visible at the top of the page
    const container = page.locator('#classification-container');

    await expect(container).toBeVisible({ timeout: 5_000 });

    // Text should display the classification string
    const textSpan = page.locator('#classification-string');

    await expect(textSpan).toHaveText('Unclassified');

    // Unclassified uses green background (#007a33) and white text
    await expect(container).toHaveCSS('background-color', 'rgb(0, 122, 51)');
    await expect(container).toHaveCSS('color', 'rgb(255, 255, 255)');

    // Container should have the fixed 20px height
    await expect(container).toHaveCSS('height', '20px');
  });

  test('hides banner when classification string is empty', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ClassificationBar: { enabled: true } },
      settings: { classificationStr: '' },
    });

    // Container should either not exist or be hidden when string is empty
    const container = page.locator('#classification-container');

    // With empty string, the container is never created (uiManagerInit_ skips creation)
    await expect(container).not.toBeAttached({ timeout: 3_000 });
  });
});
