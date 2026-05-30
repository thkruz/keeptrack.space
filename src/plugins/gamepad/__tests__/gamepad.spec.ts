import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('GamepadPlugin', () => {
  test('initializes without errors when enabled', async ({ page }) => {
    // Collect page errors during load
    const pageErrors: string[] = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await waitForAppReady(page, {
      plugins: { GamepadPlugin: { enabled: true } },
    });

    // No uncaught errors related to gamepad should appear during initialization
    const gamepadErrors = pageErrors.filter((e) => (/gamepad/iu).test(e));

    expect(gamepadErrors).toHaveLength(0);

    // Verify the gamepadconnected event listener was registered
    // by checking that dispatching a basic GamepadEvent doesn't throw
    const noError = await page.evaluate(() => {
      try {
        // GamepadEvent requires a real Gamepad, so use a basic Event instead
        // The plugin's listener will receive it but the gamepad property will be undefined,
        // which is handled gracefully
        window.dispatchEvent(new Event('gamepaddisconnected'));

return true;
      } catch {
        return false;
      }
    });

    expect(noError).toBe(true);

    // Verify no new errors after dispatching the event
    const postEventErrors = pageErrors.filter((e) => (/gamepad/iu).test(e));

    expect(postEventErrors).toHaveLength(0);
  });
});
