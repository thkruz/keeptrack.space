/**
 * UI gate matrix runner. Serves dist/ (pro build) statically, boots the app once per viewport x locale in the installed
 * system Chrome, opens every plugin menu in turn and runs checks A to E (plus G with --axe, I with --mutations).
 *
 *   pnpm exec tsx scripts/gates/ui/run.ts [--viewports=desktop,laptop,phone] [--locales=en,pseudo]
 *       [--axe=desktop] [--mutations] [--limit=N] [--port=5598]
 *
 * Locale `pseudo` is English with every text node padded 40 percent (check F). Output: .metrics/ui/<viewport>-<locale>.json.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium, type Page } from 'playwright';
import { applyAllowlist, checksAtoE } from './checks';
import { collect, PSEUDO_LOCALE_SCRIPT } from './collector';
import { MUTATIONS, runMutation, type MutationResult } from './mutations';
import type { AllowlistEntry, UiFinding } from './types';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const OUT = path.join(ROOT, '.metrics', 'ui');

const arg = (name: string, dflt: string): string => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));

  return hit ? hit.slice(name.length + 3) : dflt;
};
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

const PORT = Number(arg('port', '5598'));
const BASE = `http://localhost:${PORT}`;
const VIEWPORTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/e2e/viewports.json'), 'utf8')) as Record<string, Record<string, unknown>>;
const allow = (JSON.parse(fs.readFileSync(path.join(HERE, 'allowlist.json'), 'utf8')) as { entries: AllowlistEntry[] }).entries;

const log = (m: string): void => {
  // eslint-disable-next-line no-console
  console.log(m);
};

const startServer = async (): Promise<ChildProcess> => {
  const child = spawn('pnpm', ['exec', 'tsx', 'build/dev-server.ts', '--static'], {
    cwd: ROOT,
    env: { ...process.env, KEEPTRACK_DEV_PORT: String(PORT) },
    shell: true,
    windowsHide: true,
    stdio: 'ignore',
  });

  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE);

      if (r.ok) {
        return child;
      }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('static server did not start');
};

const stopServer = (child: ChildProcess): void => {
  if (child.pid) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  }
};

const loadAxe = async (): Promise<(new (a: { page: Page }) => { include(s: string): unknown; analyze(): Promise<{ violations: AxeViolation[] }> }) | null> => {
  try {
    return (await import('@axe-core/playwright')).default as never;
  } catch { /* fall through */ }
  const alt = process.env.AXE_MODULE_DIR;

  if (alt) {
    const req = createRequire(path.join(alt, 'x.js'));

    return (req('@axe-core/playwright') as { default?: never; AxeBuilder?: never }).AxeBuilder ?? null;
  }

  return null;
};

interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  nodes: { target: unknown[]; html: string }[];
}

const DISCOVER = `(() => {
  const api = window.keepTrack.api;
  const plugins = typeof api.getPluginList === 'function' ? api.getPluginList() : [];
  const byRoot = {};
  for (const p of plugins) { if (p && p.sideMenuElementName) { byRoot[p.sideMenuElementName] = p.id; } }
  return Array.from(document.querySelectorAll('.side-menu-parent')).map((r) => ({ root: r.id, pluginId: byRoot[r.id] || null })).filter((m) => m.root && !m.root.endsWith('-secondary'));
})()`;

const openScript = (root: string, pluginId: string | null): string => `(() => {
  const api = window.keepTrack.api;
  ${pluginId ? `const p = api.getPluginByName(${JSON.stringify(pluginId)}); if (p && typeof p.openSideMenu === 'function') { p.openSideMenu(); return; }` : ''}
  const el = document.getElementById(${JSON.stringify(root)}); if (el) { el.classList.remove('start-hidden'); }
})()`;

const closeScript = (root: string, pluginId: string | null): string => `(() => {
  const api = window.keepTrack.api;
  ${pluginId ? `const p = api.getPluginByName(${JSON.stringify(pluginId)}); if (p && typeof p.closeSideMenu === 'function') { try { p.closeSideMenu(); } catch (e) {} }` : ''}
  const el = document.getElementById(${JSON.stringify(root)}); if (el) { el.classList.add('start-hidden'); }
})()`;

interface MenuOut {
  pluginId: string | null;
  error?: string;
  findings: UiFinding[];
}

const boot = async (browser: import('playwright').Browser, vpName: string, lng: string): Promise<{ page: Page; close: () => Promise<void> }> => {
  const vp = VIEWPORTS[vpName];
  const context = await browser.newContext({
    viewport: { width: vp.width as number, height: vp.height as number },
    deviceScaleFactor: 1,
    isMobile: vp.isMobile as boolean,
    hasTouch: vp.hasTouch as boolean,
    ...(vp.userAgent ? { userAgent: vp.userAgent as string } : {}),
    serviceWorkers: 'block',
  });

  await context.addInitScript((l: string) => {
    try {
      localStorage.setItem('i18nextLng', l);
    } catch { /* ignore */ }
    document.cookie = `i18next=${l};path=/;max-age=3600`;
  }, lng);
  const page = await context.newPage();
  const override = { isAutoStart: true, noCatalogOnLoad: true, minLogLevel: 'WARN', isDisablePerformanceDowngrade: true, isDisableLoginGate: true, isDisableOnboarding: true, plugins: {} };

  await page.route('**/settings/settingsOverride.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `window.settingsOverride = ${JSON.stringify(override)};` }));
  await page.goto(`${BASE}?lng=${lng}`);
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 90_000 });
  await page.waitForFunction(() => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true, undefined, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  return { page, close: () => context.close() };
};

const main = async (): Promise<void> => {
  const vpNames = arg('viewports', 'desktop,laptop,phone').split(',');
  const locales = arg('locales', 'en,pseudo').split(',');
  const axeVps = arg('axe', 'desktop').split(',').filter(Boolean);
  const limit = Number(arg('limit', '0'));
  const doMutations = flag('mutations');

  fs.mkdirSync(OUT, { recursive: true });
  const AxeBuilder = axeVps.length ? await loadAxe() : null;

  if (axeVps.length && !AxeBuilder) {
    log('axe: @axe-core/playwright not resolvable; set AXE_MODULE_DIR. G skipped.');
  }
  const server = await startServer();
  const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const mutationResults: Record<string, MutationResult[]> = {};

  try {
    for (const vpName of vpNames) {
      for (const locale of locales) {
        const t0 = Date.now();
        const pseudo = locale === 'pseudo';
        const lng = pseudo ? 'en' : locale;
        const phone = Boolean(VIEWPORTS[vpName].isMobile);
        let { page, close } = await boot(browser, vpName, lng);
        const result: { viewport: string; locale: string; chrome: UiFinding[]; menus: Record<string, MenuOut>; axe: Record<string, { id: string; impact?: string | null; nodes: number; targets: string[] }[]> } = {
          viewport: vpName, locale, chrome: [], menus: {}, axe: {},
        };

        try {
          if (pseudo) {
            await page.evaluate(PSEUDO_LOCALE_SCRIPT);
          }
          const ctx = (menu: string) => ({ viewport: vpName, locale, menu });

          result.chrome = applyAllowlist(checksAtoE(await collect(page, null), { phone }), allow, ctx('chrome'));
          const menus = (await page.evaluate(DISCOVER)) as { root: string; pluginId: string | null }[];
          const only = arg('menus', '').split(',').filter(Boolean);
          const todo = only.length ? menus.filter((m) => only.includes(m.root)) : limit ? menus.slice(0, limit) : menus;
          const wantAxe = AxeBuilder && locale === 'en' && axeVps.includes(vpName);

          for (const m of todo) {
            if (process.env.GATE_VERBOSE) { log(`  ${vpName}-${locale} ${m.root}`); }
            const work = async (): Promise<void> => {
              await page.evaluate(openScript(m.root, m.pluginId));
              await page.waitForTimeout(650);
              if (!(await page.locator(`#${m.root}`).isVisible().catch(() => false))) {
                result.menus[m.root] = { pluginId: m.pluginId, error: 'menu did not become visible', findings: [] };

                return;
              }
              if (pseudo) {
                await page.evaluate(PSEUDO_LOCALE_SCRIPT);
                await page.waitForTimeout(150);
              }
              const findings = checksAtoE(await collect(page, m.root), { phone }).filter((f) => f.inMenu);

              if (wantAxe) {
                const axe = await new (AxeBuilder as never as new (a: { page: Page }) => { include(s: string): { analyze(): Promise<{ violations: AxeViolation[] }> } })({ page }).include(`#${m.root}`).analyze();

                result.axe[m.root] = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 5).map((n) => String(n.target.join(' '))) }));
                for (const v of axe.violations) {
                  findings.push({ rule: 'G-axe', selector: `${v.id} (${v.nodes.length} nodes)`, detail: `${v.impact ?? 'n/a'}: ${v.help}`, rects: [], inMenu: true, inMutation: false });
                }
              }
              result.menus[m.root] = { pluginId: m.pluginId, findings: applyAllowlist(findings, allow, ctx(m.root)) };
            };
            let hung = false;

            try {
              await Promise.race([work(), new Promise<void>((_, rej) => setTimeout(() => rej(new Error('HANG')), 60_000))]);
            } catch (e) {
              hung = e instanceof Error && e.message === 'HANG';
              result.menus[m.root] = { pluginId: m.pluginId, error: hung ? 'page hung over 60s (menu skipped, page rebooted)' : e instanceof Error ? e.message.slice(0, 200) : String(e), findings: [] };
            }
            if (hung) {
              await Promise.race([close(), new Promise((r) => setTimeout(r, 10_000))]).catch(() => undefined);
              ({ page, close } = await boot(browser, vpName, lng));
              if (pseudo) {
                await page.evaluate(PSEUDO_LOCALE_SCRIPT);
              }
            } else {
              await page.evaluate(closeScript(m.root, m.pluginId)).catch(() => undefined);
              await page.waitForTimeout(100);
            }
          }

          if (doMutations && vpName === vpNames[0] && locale === 'en') {
            const results: MutationResult[] = [];

            for (const spec of MUTATIONS) {
              let last: MutationResult | null = null;

              for (const m of todo.slice(0, 25)) {
                await page.evaluate(openScript(m.root, m.pluginId));
                await page.waitForTimeout(500);
                last = await runMutation(page, spec, m.root);
                last.note = `${last.note ? `${last.note}; ` : ''}menu ${m.root}`;
                await page.evaluate(closeScript(m.root, m.pluginId)).catch(() => undefined);
                if (last.applied) {
                  break;
                }
              }
              results.push(last ?? { kind: spec.kind, applied: false, target: null, detected: false, rules: [], note: 'no menus' });
            }
            mutationResults[`${vpName}-${locale}`] = results;
          }
        } finally {
          await close();
        }
        fs.writeFileSync(path.join(OUT, `${vpName}-${locale}.json`), JSON.stringify(result, null, 1));
        const total = Object.values(result.menus).reduce((n, m) => n + m.findings.length, 0) + result.chrome.length;

        log(`${vpName}-${locale}: ${Object.keys(result.menus).length} menus, ${total} findings, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }
  } finally {
    await browser.close();
    stopServer(server);
  }
  fs.writeFileSync(path.join(OUT, 'mutations.json'), JSON.stringify(mutationResults, null, 1));
  const missed = Object.values(mutationResults).flat().filter((r) => !r.detected);

  if (missed.length) {
    log(`I: ${missed.length} mutation(s) missed or not applied`);
    process.exitCode = 1;
  }
};

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(2);
});
