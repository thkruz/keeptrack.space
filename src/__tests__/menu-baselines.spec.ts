import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Locator, type Page } from '@playwright/test';
import { compareOrRecord } from '@test/e2e/baseline-store';
import { expect, test } from '@test/e2e/coverage';
import { fixedSceneMasks } from '@test/e2e/fixed-scene';
import { closeMenu, listMenus, loadSkipList, openMenu, proOnlyPluginIds, waitForTransitionsSettled } from '@test/e2e/menu-catalog';
import { MENU_LIMIT_MS, reloadScene, withLimit } from '@test/e2e/menu-loop';
import { bootMenuScene } from '@test/e2e/menu-scene';

/*
 * Screenshot baselines for every side menu and the core chrome (#613). Baselines are per machine and per project
 * (chromium = desktop 1920x1080, laptop, phone) and are NOT committed: see test/e2e/baseline-store.ts. The committed
 * manifest test/e2e/menu-baselines.json (Pro-only names: src/plugins-pro/e2e/menu-baselines.json) lists the shot
 * names expected per project; the test fails when the shots taken differ from it.
 *
 * Record or update baselines, one project at a time (the manifest is rewritten read-modify-write):
 *   KT_BASELINE_UPDATE=1 npx playwright test src/__tests__/menu-baselines.spec.ts --project=<chromium|laptop|phone>
 * Compare:
 *   npx playwright test src/__tests__/menu-baselines.spec.ts --project=<project>
 * Env: KT_BASELINE_DIR (baseline folder, default ~/.keeptrack-e2e-baselines), KT_BASELINE_STRICT=1 (a missing
 * baseline fails), KT_MENU_FILTER=PluginA,PluginB (only those menus; skips the manifest check and rewrite).
 * Failures are written to test-results/baseline-diffs/<project>/; `npm run pro e2e:baseline-sheet` builds an HTML sheet.
 */

/** Live content inside a menu that would differ between identical runs. One reason per entry. */
export const MENU_MASKS: { selector: string; reason: string }[] = [
  { selector: 'canvas', reason: 'WebGL canvases inside a menu (plots, previews) depend on the GPU frame' },
  { selector: '.sat-infobox-live, [data-live-value]', reason: 'live values updated every frame' },
];

/** The full-screen WebGL scene is hidden during the shot (screenshot `style` option; hiding it for good stalls menu closing), not masked (a mask covers the whole page box): scene baselines are #617. */
export const HIDDEN_SCENE_CSS = '#keeptrack-canvas { visibility: hidden !important; }';

/** Live content in the full-page and chrome shots. */
export const CHROME_MASKS: { selector: string; reason: string }[] = [
  { selector: '#datetime-text', reason: 'sim clock text' },
  { selector: '#sat-infobox', reason: 'live satellite values (the box itself has its own shot)' },
];

interface FlakyEntry {
  name: string;
  reason: string;
}
type Manifest = Record<string, { shots: string[]; flaky: FlakyEntry[] }>;

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OSS_MANIFEST = join(ROOT, 'test/e2e/menu-baselines.json');
const PRO_MANIFEST = join(ROOT, 'src/plugins-pro/e2e/menu-baselines.json');
const PRO_PRESENT = existsSync(join(ROOT, 'src/plugins-pro/pro-commands.json'));
const UPDATE = process.env.KT_BASELINE_UPDATE === '1';
const FILTER = (process.env.KT_MENU_FILTER ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const readManifest = (path: string): Manifest => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Manifest) : {});

function writeManifest(path: string, data: Manifest): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
}

/** Shot name for a menu plugin. Chrome shots are `chrome-*`. */
const menuShot = (plugin: string): string => `menu-${plugin}`;

const flakyFor = (project: string): Map<string, string> => {
  const list = [...(readManifest(OSS_MANIFEST)[project]?.flaky ?? []), ...(readManifest(PRO_MANIFEST)[project]?.flaky ?? [])];

  return new Map(list.map((f) => [f.name, f.reason]));
};

const expectedShots = (project: string): Set<string> => new Set([...(readManifest(OSS_MANIFEST)[project]?.shots ?? []), ...(readManifest(PRO_MANIFEST)[project]?.shots ?? [])]);

/** Replaces this project's shots with the given prefix in the manifest files, keeping the flaky list. */
function updateManifest(project: string, prefix: string, taken: string[]): void {
  const proIds = proOnlyPluginIds();
  const isProShot = (name: string): boolean => name.startsWith('menu-') && proIds.has(name.slice('menu-'.length));
  const files: [string, boolean][] = [[OSS_MANIFEST, false]];

  if (PRO_PRESENT) {
    files.push([PRO_MANIFEST, true]);
  }
  for (const [path, isPro] of files) {
    const all = readManifest(path);
    const entry = all[project] ?? { shots: [], flaky: [] };
    const kept = entry.shots.filter((s) => !s.startsWith(prefix));
    const mine = taken.filter((s) => (PRO_PRESENT ? isProShot(s) === isPro : !isPro));

    all[project] = { shots: [...new Set([...kept, ...mine])].sort(), flaky: entry.flaky };
    writeManifest(path, all);
  }
}

const maskLocators = (page: Page, masks: { selector: string }[], scope?: string): Locator[] =>
  masks.map((m) => (scope ? page.locator(scope).locator(m.selector) : page.locator(m.selector)));

/** Page screenshot clipped to an element's box: fixed chrome that sits over the live canvas never reports as stable to locator.screenshot. */
async function clipShot(page: Page, locator: Locator, mask: Locator[]): Promise<Buffer> {
  const box = await locator.boundingBox({ timeout: 10_000 });

  if (!box) {
    throw new Error('element has no box');
  }

  return page.screenshot({ ...shotOptions, clip: box, mask, timeout: 20_000 });
}

const shotOptions = { animations: 'disabled', caret: 'hide', style: HIDDEN_SCENE_CSS } as const;

/** Takes one shot, compares or records it, and notes flaky ones as taken but not compared. */
async function shoot(
  testInfo: Parameters<typeof compareOrRecord>[0],
  name: string,
  take: () => Promise<Buffer>,
  flaky: Map<string, string>,
  taken: string[],
  failures: string[]
): Promise<void> {
  const png = await take();

  taken.push(name);
  if (flaky.has(name) && !UPDATE) {
    return;
  }
  const failure = await compareOrRecord(testInfo, name, png);

  if (failure) {
    failures.push(failure);
  }
}

function checkShotSet(project: string, prefix: string, taken: string[], failures: string[]): void {
  if (UPDATE) {
    if (!FILTER.length) {
      updateManifest(project, prefix, taken);
    }

    return;
  }
  if (FILTER.length) {
    return;
  }
  const want = new Set([...expectedShots(project)].filter((s) => s.startsWith(prefix)));
  const flaky = flakyFor(project);
  const have = new Set(taken);

  for (const n of want) {
    if (!have.has(n) && !flaky.has(n)) {
      failures.push(`${n}: in the manifest but no shot was taken`);
    }
  }
  for (const n of have) {
    if (!want.has(n) && !flaky.has(n)) {
      failures.push(`${n}: shot taken but not in the manifest (KT_BASELINE_UPDATE=1 rewrites it)`);
    }
  }
}

test.describe('Menu screenshot baselines @viewports @baseline @local', () => {
  test('side menus', async ({ page }, testInfo) => {
    test.setTimeout(1_800_000);
    const project = testInfo.project.name;

    await bootMenuScene(page, testInfo);
    const menus = (await listMenus(page)).filter((m) => !FILTER.length || FILTER.includes(m.plugin));
    const skips = new Set(loadSkipList().map((s) => s.plugin));
    const flaky = flakyFor(project);
    const taken: string[] = [];
    const failures: string[] = [];
    const problems: { plugin: string; problem: string }[] = [];

    expect(menus.length, 'side menus in the plugin list').toBeGreaterThan(0);
    for (const menu of menus) {
      if (skips.has(menu.plugin)) {
        continue;
      }
      let note = 'ok';
      const before = failures.length;

      try {
        // biome-ignore lint/performance/noAwaitInLoops: one menu open at a time
        await withLimit(MENU_LIMIT_MS, `${menu.plugin} open, shot and close`, async () => {
          await openMenu(page, menu);
          const el = page.locator(`#${menu.sideMenuId}`);

          await shoot(
            testInfo,
            menuShot(menu.plugin),
            () => el.screenshot({ ...shotOptions, mask: maskLocators(page, MENU_MASKS, `#${menu.sideMenuId}`), timeout: 15_000 }),
            flaky,
            taken,
            failures
          );
          await closeMenu(page, menu);
        });
      } catch (e) {
        const problem = (e as Error).message.split('\n')[0];

        note = `error ${problem}`;
        problems.push({ plugin: menu.plugin, problem });
        failures.push(`${menuShot(menu.plugin)}: ${problem}`);
        // The page may be stuck (hung menu, menu still open): reload and rebuild the fixed scene so later menus start clean.
        const rebuildError = await reloadScene(page, testInfo);

        if (rebuildError) {
          failures.push(`${menuShot(menu.plugin)}: scene rebuild failed (${rebuildError}); the remaining menus were not run`);
          console.log(`[baseline ${project}] ${menu.plugin}: ${note}; rebuild failed, stopping`);
          break;
        }
      }
      // Progress line: a full loop takes minutes and a silent run looks hung to a bounded runner.
      console.log(`[baseline ${project}] ${menu.plugin}: ${note}${note === 'ok' && failures.length > before ? ' DIFF' : ''}`);
    }
    if (problems.length) {
      console.log(`[baseline ${project}] menus with problems: ${JSON.stringify(problems)}`);
    }
    checkShotSet(project, 'menu-', taken, failures);
    expect(failures, 'baseline failures').toEqual([]);
  });

  test('core chrome', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const project = testInfo.project.name;
    const isPhone = project === 'phone';

    await bootMenuScene(page, testInfo);
    const flaky = flakyFor(project);
    const taken: string[] = [];
    const failures: string[] = [];
    const chromeMasks = [...fixedSceneMasks(page), ...maskLocators(page, CHROME_MASKS)];
    const take = (name: string, locator: Locator) =>
      shoot(testInfo, name, () => clipShot(page, locator, chromeMasks), flaky, taken, failures).catch((e: Error) => {
        failures.push(`${name}: error ${e.message.split('\n')[0]}`);
      });

    await waitForTransitionsSettled(page);
    await take('chrome-topbar', page.locator('#nav-wrapper'));
    if (isPhone) {
      await page.locator('#drawer-hamburger').tap();
      await page.locator('#plugin-drawer.open').waitFor({ state: 'visible', timeout: 5_000 });
      await waitForTransitionsSettled(page);
      await take('chrome-drawer', page.locator('#plugin-drawer'));
      // The open drawer covers the hamburger, so a real tap is intercepted: dispatch the click to close it.
      await page.locator('#drawer-hamburger').dispatchEvent('click');
      await page
        .locator('#plugin-drawer.open')
        .waitFor({ state: 'hidden', timeout: 5_000 })
        .catch(() => undefined);
    } else {
      // On desktop and laptop the plugin drawer is the always-visible left rail (the bottom menu lives inside it).
      await take('chrome-drawer', page.locator('#plugin-drawer'));
    }
    await waitForTransitionsSettled(page);
    // The info box with the ISS selected: its own shot, so the live values are only masked in the other shots.
    await shoot(
      testInfo,
      'chrome-infobox',
      () => page.locator('#sat-infobox').screenshot({ ...shotOptions, mask: maskLocators(page, MENU_MASKS, '#sat-infobox') }),
      flaky,
      taken,
      failures
    ).catch((e: Error) => {
      failures.push(`chrome-infobox: error ${e.message.split('\n')[0]}`);
    });

    const menus = await listMenus(page);
    const settings = menus.find((m) => m.plugin === 'SettingsMenuPlugin');

    if (settings) {
      await openMenu(page, settings);
      await shoot(testInfo, 'chrome-settings-open', () => page.screenshot({ ...shotOptions, mask: chromeMasks }), flaky, taken, failures).catch((e: Error) => {
        failures.push(`chrome-settings-open: error ${e.message.split('\n')[0]}`);
      });
      await closeMenu(page, settings);
    } else {
      failures.push('chrome-settings-open: SettingsMenuPlugin is not loaded');
    }
    console.log(`[baseline ${project}] core chrome: ${taken.length} shot(s), ${failures.length} failure(s)`);
    checkShotSet(project, 'chrome-', taken, failures);
    expect(failures, 'baseline failures').toEqual([]);
  });
});
