import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, type TestInfo } from '@playwright/test';
import { expect, test } from '@test/e2e/coverage';
import { collectChromeViolations, collectViolations, type LayoutRule, type LayoutViolation } from '@test/e2e/layout-invariants';
import { allowKey, assertLocaleActive, installLocale } from '@test/e2e/locale-mode';
import { closeMenu, listMenus, loadSkipList, type MenuEntry, openMenu, proOnlyPluginIds, waitForTransitionsSettled } from '@test/e2e/menu-catalog';
import { MENU_LIMIT_MS, reloadScene, withLimit } from '@test/e2e/menu-loop';
import { bootMenuScene } from '@test/e2e/menu-scene';

/*
 * Layout check (#612): every side menu in the plugin list is opened in a real browser and checked for geometry
 * and computed-style rules (test/e2e/layout-invariants.ts). Runs in the chromium (desktop 1920x1080), laptop and
 * phone projects.
 *
 * Known violations live in a shrinking allowlist keyed by project, then plugin: test/e2e/layout-allowlist.json
 * (and src/plugins-pro/e2e/layout-allowlist.json for Pro-only plugins). The test fails on a violation that is not
 * listed and on a listed entry that no longer occurs. KT_LAYOUT_UPDATE=1 rewrites this project's section from the
 * current run instead of failing.
 */

type AllowEntry = { rule: LayoutRule; selector: string };
type Allowlist = Record<string, Record<string, AllowEntry[]>>;

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OSS_ALLOWLIST = join(ROOT, 'test/e2e/layout-allowlist.json');
const PRO_ALLOWLIST = join(ROOT, 'src/plugins-pro/e2e/layout-allowlist.json');
const PRO_PRESENT = existsSync(join(ROOT, 'src/plugins-pro/pro-commands.json'));
const UPDATE = process.env.KT_LAYOUT_UPDATE === '1';
const CHROME_KEY = '(chrome)';
const FILTER = (process.env.KT_MENU_FILTER ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Boots the fixed menu scene in the locale KT_LAYOUT_LOCALE asks for (default English) and checks the language took effect. */
async function bootLocalized(page: Page, testInfo: TestInfo): Promise<void> {
  const state = await installLocale(page);

  await bootMenuScene(page, testInfo);
  await assertLocaleActive(page, state);
  if (state.keys !== undefined) {
    console.log(`[layout ${testInfo.project.name}@longest] bundle: ${state.keys} keys, ${state.changed} differ from English`);
  }
}

const readAllow = (path: string): Allowlist => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Allowlist) : {});
const keyOf = (v: AllowEntry) => `${v.rule} ${v.selector}`;

function allowedFor(project: string): Record<string, AllowEntry[]> {
  return { ...(readAllow(OSS_ALLOWLIST)[project] ?? {}), ...(readAllow(PRO_ALLOWLIST)[project] ?? {}) };
}

/** Rewrites this project's entries for the given plugins (update mode), splitting Pro-only plugins into the Pro file. */
function writeAllow(project: string, found: Record<string, LayoutViolation[]>): void {
  const proIds = proOnlyPluginIds();
  const files: [string, boolean][] = [[OSS_ALLOWLIST, false]];

  if (PRO_PRESENT) {
    files.push([PRO_ALLOWLIST, true]);
  }
  for (const [path, isPro] of files) {
    const all = readAllow(path);
    const section = { ...(all[project] ?? {}) };

    for (const [plugin, list] of Object.entries(found)) {
      if (proIds.has(plugin) !== isPro && PRO_PRESENT) {
        continue;
      }
      const entries = [...new Map(list.map((v) => [keyOf(v), { rule: v.rule, selector: v.selector }])).values()].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));

      if (entries.length) {
        section[plugin] = entries;
      } else {
        delete section[plugin];
      }
    }
    all[project] = Object.fromEntries(Object.entries(section).sort(([a], [b]) => a.localeCompare(b)));
    const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)));

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
  }
}

interface Diff {
  unexpected: { plugin: string; v: LayoutViolation }[];
  stale: { plugin: string; e: AllowEntry }[];
}

function diffAgainst(allowed: Record<string, AllowEntry[]>, found: Record<string, LayoutViolation[]>): Diff {
  const diff: Diff = { unexpected: [], stale: [] };

  for (const [plugin, list] of Object.entries(found)) {
    const allow = new Set((allowed[plugin] ?? []).map(keyOf));
    const seen = new Set(list.map(keyOf));

    diff.unexpected.push(...list.filter((v) => !allow.has(keyOf(v))).map((v) => ({ plugin, v })));
    diff.stale.push(...(allowed[plugin] ?? []).filter((e) => !seen.has(keyOf(e))).map((e) => ({ plugin, e })));
  }

  return diff;
}

function failureMessage(diff: Diff): string {
  const lines = [
    ...diff.unexpected.map(({ plugin, v }) => `NEW    ${plugin}  ${v.rule}  ${v.selector}  ${v.detail}`),
    ...diff.stale.map(({ plugin, e }) => `FIXED  ${plugin}  ${e.rule}  ${e.selector}  (no longer occurs: remove it from the allowlist)`),
  ];

  return `${diff.unexpected.length} new layout violation(s), ${diff.stale.length} stale allowlist entr(ies); KT_LAYOUT_UPDATE=1 rewrites the allowlist\n${lines.slice(0, 40).join('\n')}`;
}

function writeReport(project: string, part: string, data: unknown): void {
  const path = join(ROOT, 'test-results', `layout-report-${project}${part ? `-${part}` : ''}.json`);

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

test.describe('Layout invariants @viewports @layout', () => {
  test('side menus', async ({ page }, testInfo) => {
    test.setTimeout(1_800_000);
    const project = allowKey(testInfo.project.name);

    await bootLocalized(page, testInfo);
    if (testInfo.project.name === 'phone') {
      expect(await page.evaluate(() => (window as unknown as { settingsManager: { isMobileModeEnabled: boolean } }).settingsManager.isMobileModeEnabled)).toBe(true);
    }

    const menus = (await listMenus(page)).filter((m) => !FILTER.length || FILTER.includes(m.plugin));
    const skips = new Map(loadSkipList().map((s) => [s.plugin, s.reason]));
    const allowed = allowedFor(project);
    const found: Record<string, LayoutViolation[]> = {};
    const notOpened: { plugin: string; error: string }[] = [];
    const skipped: { plugin: string; reason: string }[] = [];

    expect(menus.length, 'side menus in the plugin list').toBeGreaterThan(0);

    for (const menu of menus) {
      if (skips.has(menu.plugin)) {
        skipped.push({ plugin: menu.plugin, reason: skips.get(menu.plugin) as string });
        continue;
      }
      let opened = false;

      try {
        // biome-ignore lint/performance/noAwaitInLoops: one menu open at a time
        await withLimit(MENU_LIMIT_MS, `${menu.plugin} open, check and close`, async () => {
          await openMenu(page, menu);
          opened = true;
          const violations = await collectViolations(page, `#${menu.sideMenuId}`);

          found[menu.plugin] = violations;
          const allow = new Set((allowed[menu.plugin] ?? []).map(keyOf));

          if (!UPDATE && violations.some((v) => !allow.has(keyOf(v)))) {
            await testInfo.attach(`${menu.plugin}.png`, { body: await page.locator(`#${menu.sideMenuId}`).screenshot(), contentType: 'image/png' });
          }
          await closeMenu(page, menu);
        });
      } catch (e) {
        notOpened.push({ plugin: menu.plugin, error: `${opened ? 'did not finish: ' : ''}${(e as Error).message.split('\n')[0]}` });
        // The page may be stuck (hung menu, menu still open): reload and rebuild the fixed scene so later menus start clean.
        const rebuildError = await reloadScene(page, testInfo);

        if (rebuildError) {
          notOpened.push({ plugin: menu.plugin, error: `scene rebuild failed (${rebuildError}); the remaining menus were not run` });
          console.log(`[layout ${project}] ${menu.plugin}: failed, rebuild failed, stopping`);
          break;
        }
      }
      // Progress line: a full loop takes minutes and a silent run looks hung to a bounded runner.
      console.log(`[layout ${project}] ${menu.plugin}: ${opened ? `${found[menu.plugin]?.length ?? '?'} violation(s)` : 'did not open'}`);
    }

    writeReport(project, '', {
      project,
      viewport: page.viewportSize(),
      menus: menus.map((m: MenuEntry) => ({ ...m, violations: found[m.plugin] ?? null })),
      skipped,
      notOpened,
    });

    expect(notOpened, 'menus that did not open or close (add to test/e2e/menu-skip.json with a reason if they cannot)').toEqual([]);

    if (UPDATE) {
      writeAllow(project, found);

      return;
    }
    const diff = diffAgainst(allowed, found);

    expect(diff.unexpected.length + diff.stale.length, failureMessage(diff)).toBe(0);
  });

  test('core chrome', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const project = allowKey(testInfo.project.name);

    await bootLocalized(page, testInfo);
    const menus = await listMenus(page);
    const skips = new Set(loadSkipList().map((s) => s.plugin));
    // One menu every build and viewport has: Settings when loaded, else the first that opens.
    const menu = menus.find((m) => m.plugin === 'SettingsMenuPlugin') ?? menus.find((m) => !skips.has(m.plugin));
    const violations = await collectChromeViolations(page);

    if (menu) {
      await openMenu(page, menu);
      violations.push(...(await collectChromeViolations(page, `#${menu.sideMenuId}`)));
      if (!UPDATE) {
        await testInfo.attach('chrome-with-menu.png', { body: await page.screenshot(), contentType: 'image/png' });
      }
      await closeMenu(page, menu);
    }
    const unique = [...new Map(violations.map((v) => [keyOf(v), v])).values()];
    const found = { [CHROME_KEY]: unique };

    writeReport(project, 'chrome', { project, menu: menu?.plugin ?? null, violations: unique });
    if (UPDATE) {
      writeAllow(project, found);

      return;
    }
    const diff = diffAgainst(allowedFor(project), found);

    expect(diff.unexpected.length + diff.stale.length, failureMessage(diff)).toBe(0);
  });

  test('rules report injected fixtures', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'rule self-test needs one viewport only');
    await page.setContent('<!doctype html><html><body style="margin:0"></body></html>');
    await page.setViewportSize({ width: 1200, height: 800 });

    const box = 'position:fixed;top:10px;left:100px;width:300px;height:400px;background:#fff;';
    const fixtures: { rule: LayoutRule; html: string }[] = [
      { rule: 'h-overflow', html: `<div id="fx" style="${box}overflow:auto"><div style="width:700px;height:20px">wide</div></div>` },
      { rule: 'clipped-text', html: `<div id="fx" style="${box}"><div style="width:60px;overflow:hidden;white-space:nowrap">A long label that cannot fit</div></div>` },
      { rule: 'outside-viewport', html: `<div id="fx" style="${box}"><button style="position:absolute;left:-180px;top:5px;width:60px">Out</button></div>` },
      { rule: 'outside-menu', html: `<div id="fx" style="${box}"><button style="position:absolute;left:260px;top:5px;width:120px">Wide</button></div>` },
      {
        rule: 'overlap',
        html: `<div id="fx" style="${box}"><button style="position:absolute;left:5px;top:5px;width:80px;height:30px">A</button><button style="position:absolute;left:30px;top:15px;width:80px;height:30px">B</button></div>`,
      },
      { rule: 'line-through', html: `<div id="fx" style="${box}"><label style="text-decoration:line-through">Struck</label></div>` },
      { rule: 'bare-select', html: `<div id="fx" style="${box}"><select><option>One</option></select></div>` },
      { rule: 'raw-key', html: `<div id="fx" style="${box}"><span>plugins.FooPlugin.barLabel</span><p>Hello {{name}}</p></div>` },
    ];
    const clean = `<div id="fx" style="${box}overflow:auto"><label>Fine</label><div class="select-wrapper"><select><option>One</option></select></div><button>Ok</button></div>`;

    for (const fx of fixtures) {
      // biome-ignore lint/performance/noAwaitInLoops: one fixture in the page at a time
      await page.evaluate((h) => {
        document.body.innerHTML = h;
      }, fx.html);
      const rules = (await collectViolations(page, '#fx')).map((v) => v.rule);

      expect(rules, `fixture for ${fx.rule}`).toContain(fx.rule);
    }

    await page.evaluate((h) => {
      document.body.innerHTML = h;
    }, clean);
    expect(await collectViolations(page, '#fx'), 'a clean fixture reports nothing').toEqual([]);

    // Chrome rule: a toast over an open menu.
    await page.evaluate(() => {
      document.body.innerHTML =
        '<div id="fx-menu" style="position:fixed;left:0;top:60px;width:300px;height:400px"></div><div id="toast-container"><div class="toast" style="position:fixed;left:50px;top:100px;width:200px;height:40px">Toast</div></div>';
    });
    expect((await collectChromeViolations(page, '#fx-menu')).map((v) => v.rule)).toContain('chrome-toast-over-menu');
  });
});

/*
 * Narrow phone (#614): the core chrome at 360x740, only in the phone-narrow project (tag @narrow). Allowlist section
 * "phone-narrow" (plus "phone-narrow@<locale>"), entries under "(chrome)".
 */
test.describe('Layout invariants, narrow phone @narrow', () => {
  test('core chrome at 360 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-narrow', 'runs in the phone-narrow project only');
    test.setTimeout(240_000);
    const project = allowKey(testInfo.project.name);

    await bootLocalized(page, testInfo);
    expect(await page.evaluate(() => (window as unknown as { settingsManager: { isMobileModeEnabled: boolean } }).settingsManager.isMobileModeEnabled), 'mobile mode').toBe(true);
    expect(page.viewportSize()?.width, 'viewport width').toBe(360);

    const all: LayoutViolation[] = [];
    const sweep = async (label: string, openMenuSelector: string | null, root: string | null) => {
      const found = [...(await collectChromeViolations(page, openMenuSelector)), ...(root ? await collectViolations(page, root) : [])];

      all.push(...found.map((v) => ({ ...v, selector: `[${label}] ${v.selector}` })));
      console.log(`[layout ${project}] ${label}: ${found.length} violation(s)`);
    };

    // Top bar and the sat info box with the ISS selected (the fixed scene selects it).
    await waitForTransitionsSettled(page);
    await sweep('top bar and info box', null, '#sat-infobox');

    // Drawer open.
    await page.locator('#drawer-hamburger').tap();
    await page.locator('#plugin-drawer.open').waitFor({ state: 'visible', timeout: 5_000 });
    await waitForTransitionsSettled(page);
    await sweep('drawer open', '#plugin-drawer', '#plugin-drawer');
    await page.locator('#drawer-hamburger').dispatchEvent('click');
    await page
      .locator('#plugin-drawer.open')
      .waitFor({ state: 'hidden', timeout: 5_000 })
      .catch(() => undefined);
    await waitForTransitionsSettled(page);

    // Search results open.
    await page.locator('#search').fill('ISS');
    await page.locator('#search-results').waitFor({ state: 'visible', timeout: 10_000 });
    await waitForTransitionsSettled(page);
    await sweep('search results', null, '#search-results');

    const unique = [...new Map(all.map((v) => [keyOf(v), v])).values()];

    writeReport(project, 'chrome', { project, violations: unique });
    if (UPDATE) {
      writeAllow(project, { [CHROME_KEY]: unique });

      return;
    }
    const diff = diffAgainst(allowedFor(project), { [CHROME_KEY]: unique });

    expect(diff.unexpected.length + diff.stale.length, failureMessage(diff)).toBe(0);
  });
});

/*
 * MOBILE_PLUGINS guard (#614). The list in src/app/ui/mobileManager.ts is read from the source at test time and compared
 * with what the phone build loaded:
 *   (a) a listed plugin that is not loaded in mobile mode,
 *   (b) a loaded plugin with a drawer entry that is not listed,
 *   (c) the phone features the 2026-11 fixes added (commits 1529ff419 tooltips, 61934230b onboarding, dfb2de399 Reset to
 *       Start): each must be present, not switched off by the mobile plugin sweep.
 * Known mismatches live in test/e2e/mobile-plugins-allowlist.json (Pro-only plugin names: src/plugins-pro/e2e/...), shrink only.
 */
type MobileMismatches = Record<string, string[]>;
const MOBILE_OSS_ALLOWLIST = join(ROOT, 'test/e2e/mobile-plugins-allowlist.json');
const MOBILE_PRO_ALLOWLIST = join(ROOT, 'src/plugins-pro/e2e/mobile-plugins-allowlist.json');
const readMobileAllow = (path: string): MobileMismatches => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as MobileMismatches) : {});

function mobilePluginsFromSource(): string[] {
  const src = readFileSync(join(ROOT, 'src/app/ui/mobileManager.ts'), 'utf8');
  const start = src.indexOf('MOBILE_PLUGINS');
  const open = src.indexOf('= [', start);
  const close = src.indexOf('];', open);

  if (start < 0 || open < 0 || close < 0) {
    throw new Error('could not find the MOBILE_PLUGINS array in src/app/ui/mobileManager.ts');
  }
  const body = src
    .slice(open, close)
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/u, ''))
    .join('\n');

  return [...body.matchAll(/'([A-Za-z0-9_]+)'/gu)].map((m) => m[1]);
}

test.describe('Phone plugin list @viewports @mobile-plugins', () => {
  test('MOBILE_PLUGINS matches what the phone loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'phone project only');
    test.setTimeout(180_000);

    await bootLocalized(page, testInfo);
    const listed = mobilePluginsFromSource();

    expect(listed.length, 'plugins parsed from MOBILE_PLUGINS').toBeGreaterThan(20);
    const state = await page.evaluate(() => {
      const w = window as unknown as {
        settingsManager: { isMobileModeEnabled: boolean };
        keepTrack: { api: { getPluginList(): { id: string; bottomIconElementName?: string }[] } };
      };
      const plugins = w.keepTrack.api.getPluginList();

      return {
        mobile: w.settingsManager.isMobileModeEnabled,
        loaded: plugins.map((p) => p.id),
        inDrawer: plugins
          .filter((p) => p.bottomIconElementName && document.querySelector(`.drawer-item[data-plugin-id="${CSS.escape(p.bottomIconElementName)}"]`))
          .map((p) => p.id),
        tooltipTargets: document.querySelectorAll('[kt-tooltip]').length,
        resetToStartButton: document.getElementById('reset-to-start-time-btn') !== null,
      };
    });

    expect(state.mobile, 'mobile mode').toBe(true);
    const loaded = new Set(state.loaded);
    const mismatches: string[] = [
      ...listed.filter((id) => !loaded.has(id)).map((id) => `a: listed but not loaded: ${id}`),
      ...state.inDrawer.filter((id) => !listed.includes(id)).map((id) => `b: has a drawer entry but is not listed: ${id}`),
    ];

    // (c) the phone features: plugin loaded and its UI present.
    if (!loaded.has('TooltipsPlugin')) {
      mismatches.push('c: not loaded on phone, info circles show no text: TooltipsPlugin');
    } else if (state.tooltipTargets === 0) {
      mismatches.push('c: loaded but no [kt-tooltip] element exists: TooltipsPlugin');
    }
    if (!loaded.has('OnboardingPlugin')) {
      mismatches.push('c: not loaded on phone, welcome tour never starts: OnboardingPlugin');
    }
    if (PRO_PRESENT && !loaded.has('ResetToStart')) {
      mismatches.push('c: not loaded on phone, clock popover has no Reset to Start: ResetToStart');
    }
    if (loaded.has('ResetToStart') && !state.resetToStartButton) {
      mismatches.push('c: loaded but #reset-to-start-time-btn is not in the page: ResetToStart');
    }
    mismatches.sort();

    const key = allowKey('phone');
    const proIds = proOnlyPluginIds();
    const isPro = (m: string) => proIds.has(m.slice(m.lastIndexOf(' ') + 1));
    const split = (pro: boolean) => mismatches.filter((m) => (PRO_PRESENT ? isPro(m) === pro : !pro));

    writeReport(key, 'mobile-plugins', { listed, loaded: state.loaded, inDrawer: state.inDrawer, mismatches });
    if (UPDATE) {
      const targets: [string, boolean][] = [[MOBILE_OSS_ALLOWLIST, false]];

      if (PRO_PRESENT) {
        targets.push([MOBILE_PRO_ALLOWLIST, true]);
      }
      for (const [path, pro] of targets) {
        const all = readMobileAllow(path);

        all[key] = split(pro);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, `${JSON.stringify(Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
      }

      return;
    }
    const allowed = new Set([...(readMobileAllow(MOBILE_OSS_ALLOWLIST)[key] ?? []), ...(readMobileAllow(MOBILE_PRO_ALLOWLIST)[key] ?? [])]);
    const fresh = mismatches.filter((m) => !allowed.has(m));
    const stale = [...allowed].filter((m) => !mismatches.includes(m));

    expect(
      fresh.length + stale.length,
      `${fresh.map((m) => `NEW    ${m}`).join('\n')}\n${stale.map((m) => `FIXED  ${m} (remove it from the allowlist)`).join('\n')}\nKT_LAYOUT_UPDATE=1 rewrites the allowlist`
    ).toBe(0);
  });
});
