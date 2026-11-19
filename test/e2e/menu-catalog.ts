import { type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Runtime catalog of side menus (#612): read from the loaded plugin list, so a new plugin is covered without
 * writing a spec. Property names come from src/engine/plugins/base-plugin.ts (`id`, `sideMenuElementName`,
 * `bottomIconElementName`, `isRequireSatelliteSelected`, `isRequireSensorSelected`, `isLoginRequired`).
 */
export interface MenuEntry {
  /** Plugin id (PluginRegistry.getPluginByName key; equals the class name for most plugins). */
  plugin: string;
  /** Side menu element id. */
  sideMenuId: string;
  /** Bottom icon element id, also the drawer item's data-plugin-id; null when the menu has no icon. */
  bottomIconId: string | null;
  /** True when the phone/desktop plugin drawer lists this menu. */
  inDrawer: boolean;
  requiresSatellite: boolean;
  requiresSensor: boolean;
  requiresLogin: boolean;
}

export interface SkipEntry {
  plugin: string;
  reason: string;
}

interface PluginLike {
  id: string;
  sideMenuElementName?: string;
  bottomIconElementName?: string;
  isRequireSatelliteSelected?: boolean;
  isRequireSensorSelected?: boolean;
  isLoginRequired?: boolean;
  isMenuButtonActive?: boolean;
  bottomMenuClicked(): void;
  openSideMenu(): void;
  hideSideMenus(): void;
}

interface KtWindow {
  keepTrack: {
    api: {
      getPluginList(): readonly PluginLike[];
      getPluginByName(name: string): PluginLike | null;
      getUiManager(): { hideSideMenus(): void };
      getSensorManager(): { setSensor(s: string | null): void; isSensorSelected(): boolean };
    };
  };
}

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Every loaded plugin that owns a side menu present in the DOM, sorted by plugin id. */
export function listMenus(page: Page): Promise<MenuEntry[]> {
  return page.evaluate(() => {
    const api = (window as unknown as KtWindow).keepTrack.api;

    return api
      .getPluginList()
      .filter((p) => typeof p.sideMenuElementName === 'string' && p.sideMenuElementName.length > 0 && document.getElementById(p.sideMenuElementName) !== null)
      .map((p) => {
        const icon = p.bottomIconElementName && p.bottomIconElementName.length > 0 ? p.bottomIconElementName : null;

        return {
          plugin: p.id,
          sideMenuId: p.sideMenuElementName as string,
          bottomIconId: icon,
          inDrawer: icon !== null && document.querySelector(`.drawer-item[data-plugin-id="${CSS.escape(icon)}"]`) !== null,
          requiresSatellite: p.isRequireSatelliteSelected === true,
          requiresSensor: p.isRequireSensorSelected === true,
          requiresLogin: p.isLoginRequired === true,
        };
      })
      .sort((a, b) => a.plugin.localeCompare(b.plugin));
  });
}

/** Resolves once no finite CSS transition or animation is running (menu slide in/out). */
export async function waitForTransitionsSettled(page: Page): Promise<void> {
  // Let a just-started slide begin before checking that none are running (slide.ts starts it on a timer).
  await page.waitForTimeout(150);
  await page.waitForFunction(
    () =>
      document.getAnimations().every((a) => {
        const iterations = a.effect?.getTiming().iterations ?? 1;

        return iterations === Infinity || a.playState !== 'running';
      }),
    undefined,
    { timeout: 5_000 },
  );
}

/** Opens one menu through the plugin API and waits until it is shown and its slide has finished. */
export async function openMenu(page: Page, entry: MenuEntry): Promise<void> {
  await page.evaluate(({ plugin, hasIcon }) => {
    const p = (window as unknown as KtWindow).keepTrack.api.getPluginByName(plugin);

    if (!p) {
      throw new Error(`plugin ${plugin} not loaded`);
    }
    if (hasIcon) {
      p.bottomMenuClicked();
    } else {
      p.openSideMenu();
    }
  }, { plugin: entry.plugin, hasIcon: entry.bottomIconId !== null });
  await page.locator(`#${entry.sideMenuId}`).waitFor({ state: 'visible', timeout: 5_000 });
  await waitForTransitionsSettled(page);
}

/** Closes every side menu through the API and confirms this one is gone. The wait is 12 s: after a screenshot the slide-out timer was observed to fire 2.5 to 2.8 s late (1.2 s without), more under load. */
export async function closeMenu(page: Page, entry: MenuEntry): Promise<void> {
  await page.evaluate((plugin) => {
    const api = (window as unknown as KtWindow).keepTrack.api;
    const p = api.getPluginByName(plugin);

    if (p) {
      p.hideSideMenus();
    } else {
      api.getUiManager().hideSideMenus();
    }
  }, entry.plugin);
  await page.locator(`#${entry.sideMenuId}`).waitFor({ state: 'hidden', timeout: 12_000 });
  await waitForTransitionsSettled(page);
}

/** Selects a sensor (by sensor key) so sensor-gated menus open. */
export async function selectSensor(page: Page, sensorKey = 'NSN-WALLOPS'): Promise<void> {
  await page.evaluate((key) => (window as unknown as KtWindow).keepTrack.api.getSensorManager().setSensor(key), sensorKey);
  await page.waitForTimeout(1_000);
}

const readJsonIfExists = <T>(path: string, fallback: T): T => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback);

/** OSS skip list merged with the Pro one when the Pro submodule is present. */
export function loadSkipList(): SkipEntry[] {
  return [...readJsonIfExists<SkipEntry[]>(join(REPO_ROOT, 'test/e2e/menu-skip.json'), []), ...readJsonIfExists<SkipEntry[]>(join(REPO_ROOT, 'src/plugins-pro/e2e/menu-skip.json'), [])];
}

const ID_DECL = /readonly id\s*=\s*['"]([A-Za-z0-9_]+)['"]/gu;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'scripts', '.reference-env', 'dist', 'docs', 'e2e']);

const scanIds = (dir: string, found: Set<string>): Set<string> => {
  if (!existsSync(dir)) {
    return found;
  }
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name) && !ent.name.startsWith('.')) {
        scanIds(join(dir, ent.name), found);
      }
    } else if (ent.name.endsWith('.ts') && !ent.name.endsWith('.test.ts') && !ent.name.endsWith('.d.ts')) {
      for (const m of readFileSync(join(dir, ent.name), 'utf8').matchAll(ID_DECL)) {
        found.add(m[1]);
      }
    }
  }

  return found;
};

let proOnlyIds_: Set<string> | null = null;

/** Plugin ids declared only under src/plugins-pro; their skip and allowlist entries live in the Pro files. */
export function proOnlyPluginIds(): Set<string> {
  if (!proOnlyIds_) {
    const oss = new Set<string>();

    for (const d of ['src/plugins', 'src/app', 'src/engine']) {
      scanIds(join(REPO_ROOT, d), oss);
    }
    const pro = scanIds(join(REPO_ROOT, 'src/plugins-pro'), new Set());

    proOnlyIds_ = new Set([...pro].filter((id) => !oss.has(id)));
  }

  return proOnlyIds_;
}
