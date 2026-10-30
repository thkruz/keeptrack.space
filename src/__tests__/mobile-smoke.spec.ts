import { devices } from '@playwright/test';
import { expect, test } from '@test/e2e/coverage';
import { expectCleanBoot, waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/*
 * Phone-emulation smoke test: a Pixel 7 viewport with touch input. It cannot reproduce a real
 * device's GPU or the OS share sheet but it does exercise mobile mode, two-finger pinch
 * zoom and the drawer -> menu path a phone user takes.
 */
const { defaultBrowserType: _ignored, ...pixel7 } = devices['Pixel 7'];

test.use(pixel7);

/** Resolves once no CSS transition (menu slide in/out) is still running. */
const transitionsSettled = async (page: import('@playwright/test').Page) => {
  // Let the tap start its transition before checking that none are running.
  await page.waitForTimeout(150);
  await page.waitForFunction(() => document.getAnimations().every((a) => !(a instanceof CSSTransition) || a.playState !== 'running'), undefined, { timeout: 5_000 });
};

const zoomTarget = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { keepTrack: { api: { getMainCamera: () => { state: { zoomTarget: number } } } } }).keepTrack.api.getMainCamera().state.zoomTarget);

test.describe('Mobile smoke (Pixel 7 emulation)', () => {
  test('boots in mobile mode, pinch zooms both ways and opens a menu from the drawer', async ({ page, context }) => {
    await waitForAppReady(page, {
      settings: { isDisableLoginGate: true },
    });
    expect(await page.evaluate(() => (window as unknown as { settingsManager: { isMobileModeEnabled: boolean } }).settingsManager.isMobileModeEnabled)).toBe(true);
    expectCleanBoot(page);

    // Two-finger pinch about the canvas centre: fingers apart zooms in (zoomTarget falls), together zooms out.
    await page.evaluate(() =>
      (window as unknown as { keepTrack: { api: { getMainCamera: () => { autoRotate: (on: boolean) => void } } } }).keepTrack.api.getMainCamera().autoRotate(false)
    );
    const box = await page.locator('#keeptrack-canvas').boundingBox();

    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    const cdp = await context.newCDPSession(page);
    const fingers = (spread: number) => [
      { x: cx, y: cy - spread, id: 1 },
      { x: cx, y: cy + spread, id: 2 },
    ];
    const pinch = async (from: number, to: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(from) });
      const step = from < to ? 8 : -8;

      for (let s = from + step; step > 0 ? s <= to : s >= to; s += step) {
        // biome-ignore lint/performance/noAwaitInLoops: touch moves must arrive in order, one frame apart
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(s) });
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(600);
    };

    const z0 = await zoomTarget(page);

    await pinch(40, 220);
    const zIn = await zoomTarget(page);

    expect(zIn, 'spreading two fingers should zoom in').toBeLessThan(z0);

    await pinch(220, 40);
    expect(await zoomTarget(page), 'pinching two fingers together should zoom out').toBeGreaterThan(zIn);

    // Drawer -> a phone-enabled menu.
    await page.locator('#drawer-hamburger').tap();
    await page.locator('.drawer-item[data-plugin-id="share-menu-bottom-icon"]').tap();
    await expect(page.locator('#share-menu')).toBeVisible({ timeout: 5_000 });
  });

  test('every phone drawer menu fits the screen width', async ({ page }) => {
    test.setTimeout(300_000);
    await waitForAppReady(page, {
      settings: { isDisableLoginGate: true },
    });

    await page.locator('#drawer-hamburger').tap();
    const ids = await page.locator('.drawer-item[data-plugin-id]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.pluginId ?? ''));

    // The menus added to the phone allowlist on 2026-10-30 must be reachable from the drawer.
    for (const id of ['share-menu-bottom-icon', 'menu-constellations', 'menu-watchlist', 'ktoc-notices-icon', 'menu-color-scheme', 'find-satellite-bottom-icon']) {
      expect(ids, `drawer item ${id}`).toContain(id);
    }

    const overflowing: Record<string, string[]> = {};

    for (const id of ids) {
      // biome-ignore lint/performance/noAwaitInLoops: one menu open at a time
      if (!(await page.locator('#plugin-drawer.open').count())) {
        await page.locator('#drawer-hamburger').tap();
      }
      const item = page.locator(`.drawer-item[data-plugin-id="${id}"]`);

      await item.scrollIntoViewIfNeeded();
      await item.tap();
      await transitionsSettled(page);
      const offenders = await page.evaluate(() => {
        const vw = window.innerWidth;
        const out: string[] = [];
        const menus = [...document.querySelectorAll<HTMLElement>('[id$="-menu"]')].filter((m) => {
          const r = m.getBoundingClientRect();

          return r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw && getComputedStyle(m).visibility !== 'hidden';
        });

        for (const m of menus) {
          for (const el of m.querySelectorAll<HTMLElement>('*')) {
            const r = el.getBoundingClientRect();
            let scroller = el.parentElement;

            // Content inside a sideways-scrolling container (a wide table) is allowed past the edge.
            while (scroller && scroller !== m && getComputedStyle(scroller).overflowX !== 'auto') {
              scroller = scroller.parentElement;
            }
            if (scroller === m && r.width > 0 && (r.right > vw + 1 || r.left < -1) && getComputedStyle(el).visibility !== 'hidden') {
              out.push(`${m.id} > ${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
            }
          }
        }

        return out.slice(0, 5);
      });

      if (offenders.length > 0) {
        overflowing[id] = offenders;
      }
      await page.evaluate(() => (window as unknown as { keepTrack: { api: { getUiManager: () => { hideSideMenus: () => void } } } }).keepTrack.api.getUiManager().hideSideMenus());
      await transitionsSettled(page);
    }

    expect(overflowing).toEqual({});
  });
});
