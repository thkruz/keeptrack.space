/* eslint-disable no-console */
import { spawn, spawnSync } from 'node:child_process';
import { buildDevOverride, DEV_SERVER_URL, openPluginMenu, waitForReady, waitForServer } from '../lib/boot';
import { CliError, log } from '../lib/log';
import { REPO_ROOT } from '../lib/paths';
import { resolvePlugin } from '../lib/resolve-plugin';

interface DevFlags {
  catalog: boolean;
  headless: boolean;
  full: boolean;
  noOpen: boolean;
  pro: boolean;
}

export async function devCommand(positionals: string[], flags: Record<string, string | boolean>): Promise<number> {
  const name = positionals[0];

  if (!name) {
    throw new CliError('Usage: npm run plugin -- dev <name> [--catalog] [--headless] [--full] [--no-open] [--screenshot] [--pro]');
  }

  const resolved = resolvePlugin(name);
  const configKey = resolved.configKey;
  const dependencies = resolved.kind === 'external' ? resolved.dependencies : [];

  const devFlags: DevFlags = {
    catalog: Boolean(flags.catalog),
    headless: Boolean(flags.headless),
    full: Boolean(flags.full),
    noOpen: Boolean(flags['no-open']),
    pro: Boolean(flags.pro),
  };

  if (flags.screenshot) {
    return screenshot(configKey, devFlags);
  }

  return runDevLoop(configKey, dependencies, devFlags);
}

/** Delegate a one-shot capture to inspect.ts (zero new screenshot code). */
function screenshot(configKey: string, flags: DevFlags): number {
  const spec = {
    id: `plugin-dev-${configKey}`,
    catalog: flags.catalog,
    plugins: { [configKey]: { enabled: true }, TopMenu: { enabled: true }, TooltipsPlugin: { enabled: true } },
    settings: { isStrictPluginList: !flags.full },
    evaluate: [`(() => { const el = document.querySelector('[data-plugin-id="${configKey}"]'); if (el) { el.click(); } })()`],
    settleMs: 1_500,
  };

  const res = spawnSync('npx', ['tsx', 'scripts/inspect.ts', JSON.stringify(spec)], {
    cwd: REPO_ROOT, shell: process.platform === 'win32', stdio: 'inherit',
  });

  return res.status ?? 1;
}

async function runDevLoop(configKey: string, dependencies: string[], flags: DevFlags): Promise<number> {
  const startedServer = await ensureServer(flags.pro);

  // Lazy import so `add`/`list`/etc. don't pay Playwright's load cost.
  const { chromium } = await import('playwright');
  const override = buildDevOverride({ configKey, dependencies, catalog: flags.catalog, full: flags.full });
  const { DEFAULT_ALLOWLIST } = await import('../../../test/e2e/console-listener');
  const isBenign = (text: string): boolean => DEFAULT_ALLOWLIST.some((entry) => entry.pattern.test(text));

  const browser = await chromium.launch({ headless: flags.headless });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const type = msg.type();

    if ((type === 'warning' || type === 'error') && !isBenign(msg.text())) {
      console.log(`${log.dim('[browser]')} ${type}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    if (!isBenign(err.message)) {
      console.log(`\x1b[31m[browser] pageerror:\x1b[0m ${err.message}`);
    }
  });

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({ contentType: 'application/javascript', body: `window.settingsOverride = ${JSON.stringify(override)};` });
  });

  log.info(`Booting ${configKey} at ${DEV_SERVER_URL} …`);
  await page.goto(DEV_SERVER_URL);
  await waitForReady(page);
  if (!flags.noOpen) {
    await openPluginMenu(page, configKey);
  }

  // Attach the reopen handler only AFTER the initial boot so it fires on SSE
  // reloads (edit → rebuild → location.reload()) and not on the first load —
  // otherwise a second drawer click would toggle the menu back closed.
  let reloads = 0;

  page.on('load', () => {
    void (async () => {
      try {
        await waitForReady(page);
        if (!flags.noOpen) {
          await openPluginMenu(page, configKey);
        }
        reloads += 1;
        log.step(`Reloaded (#${reloads}) — ${configKey} ready.`);
      } catch {
        // A reload mid-rebuild can race; the next load event will settle.
      }
    })();
  });

  log.success(`Dev session live for ${configKey}. Edit your plugin — it rebuilds and reloads automatically.`);
  log.step('Press Ctrl+C to stop.' + (flags.headless ? ' (headless)' : ''));

  await waitForExit(browser, startedServer);

  return 0;
}

/** Ensure a warm dev server; spawn one if absent. Returns the spawned child (to kill on exit) or null. */
async function ensureServer(pro: boolean): Promise<ReturnType<typeof spawn> | null> {
  if (await fetch(DEV_SERVER_URL).then(() => true).catch(() => false)) {
    log.step(`Reusing dev server at ${DEV_SERVER_URL}.`);

    return null;
  }

  log.info(`No dev server at ${DEV_SERVER_URL} — starting ${pro ? 'start:pro' : 'start'} … (first build can take a minute)`);
  const child = spawn('npx', ['tsx', './build/dev-server.ts', pro ? '--profile=pro' : '--profile=oss'], {
    cwd: REPO_ROOT, shell: process.platform === 'win32', stdio: ['inherit', 'pipe', 'pipe'],
  });

  // The dev server serves dist/ the instant its HTTP listener is up — BEFORE the
  // first rspack build finishes — so waiting on the port alone opens the browser
  // on a stale/empty bundle. Instead wait for the reporter's build-complete marker
  // ("built in …"), forwarding the server's output to the terminal meanwhile.
  if (!(await waitForBuild(child, 300_000))) {
    child.kill();
    throw new CliError('Dev server build did not complete within 300s.');
  }
  await waitForServer(DEV_SERVER_URL, 30_000);

  return child;
}

/**
 * Resolve true when the dev server's watch build first completes, detected via
 * the reporter's "built in …" / "rebuilt in …" line. Forwards all server output
 * to this terminal so the user still sees build progress and later rebuilds.
 */
function waitForBuild(child: ReturnType<typeof spawn>, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (val: boolean): void => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    const timer = setTimeout(() => done(false), timeoutMs);

    child.stdout?.on('data', (buf: Buffer) => {
      const text = buf.toString();

      process.stdout.write(text);
      if (/(?:re)?built in /u.test(text)) {
        clearTimeout(timer);
        done(true);
      }
    });
    child.stderr?.on('data', (buf: Buffer) => process.stderr.write(buf));
    child.on('exit', () => done(false));
  });
}

function waitForExit(browser: { on: (e: string, cb: () => void) => void; close: () => Promise<void> }, server: ReturnType<typeof spawn> | null): Promise<void> {
  return new Promise((resolve) => {
    const shutdown = (): void => {
      if (server) {
        server.kill();
      }
      resolve();
    };

    browser.on('disconnected', shutdown);
    process.on('SIGINT', () => {
      void browser.close().finally(shutdown);
    });
  });
}
