import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

interface EvalWindow {
  keepTrack: {
    api: {
      getCatalogManager: () => { objectCache: unknown[] };
      getGroupsManager: () => { groupList: Record<string, { ids: number[] } | undefined> };
    };
  };
}

/*
 * Every entry in the Constellations menu must select at least one object from a real catalog.
 * Boots with ?offline so the catalog is the bundled public/tle/tle.json: the result does not
 * depend on the live API, and a snapshot refresh that empties an entry fails here.
 */
test.describe('SatConstellations against the bundled catalog', () => {
  test('every menu entry selects at least one catalogued object', async ({ page }) => {
    test.setTimeout(180_000);

    await waitForAppReady(page, {
      query: 'offline',
      plugins: { SatConstellations: { enabled: true } },
      settings: { noCatalogOnLoad: false, isDisableLoginGate: true },
    });
    await page.waitForFunction(() => (window as unknown as EvalWindow).keepTrack.api.getCatalogManager().objectCache.length > 1000, { timeout: 60_000 });

    // Desktop layout: the drawer rail shows the plugin icon directly (no hamburger).
    await page.locator('.drawer-item[data-plugin-id="menu-constellations"]').click();
    await expect(page.locator('#constellations-menu')).toBeVisible({ timeout: 5_000 });

    const slugs = await page.locator('#sc-constellation-list li.menu-selectable').evaluateAll((lis) => lis.map((li) => (li as HTMLElement).dataset.group ?? ''));

    expect(slugs.length).toBeGreaterThanOrEqual(15);

    const counts: Record<string, number> = {};

    for (const slug of slugs) {
      // biome-ignore lint/performance/noAwaitInLoops: each entry must be selected before reading its group
      await page.locator(`#sc-constellation-list li[data-group="${slug}"]`).click();
      counts[slug] = await page.evaluate((s) => (window as unknown as EvalWindow).keepTrack.api.getGroupsManager().groupList[s]?.ids.length ?? 0, slug);
    }

    const empty = Object.entries(counts)
      .filter(([, n]) => n === 0)
      .map(([slug]) => slug);

    expect(empty, `empty constellations: ${empty.join(', ')} (counts ${JSON.stringify(counts)})`).toEqual([]);
    // Patterns fixed on 2026-10-29: they matched nothing before.
    expect(counts['ast-spaceobile']).toBeGreaterThanOrEqual(10);
    expect(counts.guanwang).toBeGreaterThanOrEqual(100);
  });
});
