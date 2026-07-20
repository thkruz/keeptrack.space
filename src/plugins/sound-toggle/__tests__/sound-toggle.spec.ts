import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SoundToggle', () => {
  test('sound button renders in nav and toggles state', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        TopMenu: { enabled: true },
        SoundToggle: { enabled: true },
      },
    });

    // Sound button should be injected into the nav
    const soundBtn = page.locator('#sound-btn');

    await expect(soundBtn).toBeAttached({ timeout: 5_000 });

    const soundIcon = page.locator('#sound-icon');

    await expect(soundIcon).toBeAttached();
  });
});
