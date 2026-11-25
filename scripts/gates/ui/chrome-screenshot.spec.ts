import { expect, test } from '@playwright/test';
import { fixedSceneMasks, loadFixedIssScene } from '../../../test/e2e/fixed-scene';
import { VIEWPORTS, viewportUse, type ViewportName } from '../../../test/e2e/viewports';

/**
 * H. toHaveScreenshot on DOM chrome. Canvas is masked, the scene is the pinned ISS TLE at a fixed, frozen sim time, and
 * the clock-driven readouts are masked too. Chrome is captured at three viewports; every menu at desktop only.
 */
const FIXED_DATE = new Date('2008-09-20T12:25:40Z');
const MENU_LIMIT = Number(process.env.GATE_MENU_LIMIT ?? 0);

for (const name of ['desktop', 'laptop', 'phone'] as ViewportName[]) {
  test.describe(name, () => {
    test.use(viewportUse(name));

    test(`chrome ${name}`, async ({ page }) => {
      await loadFixedIssScene(page, { date: FIXED_DATE, settings: { isDisableOnboarding: true, isDisablePerformanceDowngrade: true } });
      await page.waitForTimeout(1500);
      await expect(page).toHaveScreenshot(`chrome-${name}.png`, { mask: [page.locator('canvas'), ...fixedSceneMasks(page)], timeout: 20_000 });
    });
  });
}

test.describe('menus desktop', () => {
  test.use(viewportUse('desktop'));

  test('every menu', async ({ page }) => {
    await loadFixedIssScene(page, { date: FIXED_DATE, settings: { isDisableOnboarding: true, isDisablePerformanceDowngrade: true } });
    await page.waitForTimeout(1500);
    const menus = await page.evaluate<{ root: string; pluginId: string | null }[]>(`(() => {
      const api = window.keepTrack.api;
      const byRoot = {};
      for (const p of (api.getPluginList?.() ?? [])) { if (p && p.sideMenuElementName) { byRoot[p.sideMenuElementName] = p.id; } }
      return Array.from(document.querySelectorAll('.side-menu-parent')).map((r) => ({ root: r.id, pluginId: byRoot[r.id] || null })).filter((m) => m.root && !m.root.endsWith('-secondary'));
    })()`);
    const list = MENU_LIMIT ? menus.slice(0, MENU_LIMIT) : menus;
    const failures: string[] = [];

    for (const m of list) {
      await page.evaluate(`(() => { const api = window.keepTrack.api; const p = ${JSON.stringify(m.pluginId)} ? api.getPluginByName(${JSON.stringify(m.pluginId)}) : null; if (p && p.openSideMenu) { p.openSideMenu(); } else { document.getElementById(${JSON.stringify(m.root)})?.classList.remove('start-hidden'); } })()`);
      await page.waitForTimeout(700);
      const loc = page.locator(`#${m.root}`);

      if (await loc.isVisible()) {
        try {
          await expect(loc).toHaveScreenshot(`menu-${m.root}.png`, { mask: [page.locator('canvas')], timeout: 8_000 });
        } catch (e) {
          failures.push(`${m.root}: ${String((e as Error).message).split('\n')[0]}`);
        }
      }
      await page.evaluate(`(() => { const api = window.keepTrack.api; const p = ${JSON.stringify(m.pluginId)} ? api.getPluginByName(${JSON.stringify(m.pluginId)}) : null; if (p && p.closeSideMenu) { try { p.closeSideMenu(); } catch (e) {} } document.getElementById(${JSON.stringify(m.root)})?.classList.add('start-hidden'); })()`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

void VIEWPORTS;
