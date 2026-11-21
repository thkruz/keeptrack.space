// Standalone regression: no app, API key, build, globalSetup, or live API access.
// node --experimental-strip-types --test test/e2e/production-api-guard.selftest.ts
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { chromium } from '@playwright/test';
import { installProductionApiGuard } from './production-api-guard.ts';
import type { BrowserContext, Route } from '@playwright/test';

test('guard matches every production API path and aborts without leaking query secrets', async () => {
  let matcher: (url: URL) => boolean;
  let handler: (route: Route) => Promise<void>;
  const context = {
    route: async (match: typeof matcher, callback: typeof handler) => { matcher = match; handler = callback; },
  } as unknown as BrowserContext;
  const check = await installProductionApiGuard(context);
  check();
  for (const path of ['/v4/sats/brief', '/v4/r2/vimpel.json', '/v4/notices?norad=25544&apiKey=SECRET', '/v4/sat/25544', '/v5/new']) {
    assert.equal(matcher!(new URL(`https://api.keeptrack.space${path}`)), true);
  }
  assert.equal(matcher!(new URL('http://API.KEEPTRACK.SPACE.:8080/v4/notices')), true);
  for (const url of ['http://localhost:5599/', 'http://127.0.0.1:5599/', 'https://staging.example/v4/notices', 'https://api.keeptrack.space.example/v4/notices']) {
    assert.equal(matcher!(new URL(url)), false);
  }
  for (const method of ['GET', 'POST', 'OPTIONS']) {
    let aborted = false;
    await handler!({
      request: () => ({ method: () => method, url: () => 'https://api.keeptrack.space/v4/notices?apiKey=SECRET' }),
      abort: async (reason: string) => { assert.equal(reason, 'blockedbyclient'); aborted = true; },
      fallback: () => { throw new Error('must never fall through'); },
      continue: () => { throw new Error('must never reach the network'); },
    } as unknown as Route);
    assert.equal(aborted, true);
  }
  assert.throws(check, (error: Error) => {
    assert.match(error.message, /GET \/v4\/notices/u);
    assert.match(error.message, /OPTIONS \/v4\/notices/u);
    assert.match(error.message, /POST \/v4\/notices/u);
    assert.doesNotMatch(error.message, /SECRET|apiKey/u);
    return true;
  });
});

// Opt in on a machine with Chromium. The safety sink prevents outbound traffic
// even if the guard regresses. The root app/workflow must not be invoked here.
test('browser: local replay, fallback, and new pages', { skip: process.env.E2E_GUARD_BROWSER !== '1' }, async (t) => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>Local guard check</title>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const port = (server.address() as { port: number }).port;
  const browser = await chromium.launch({
    ...(process.env.E2E_GUARD_CHROMIUM ? { executablePath: process.env.E2E_GUARD_CHROMIUM } : {}),
  });

  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    let escaped = 0;

    // Safety net registered FIRST: a defective guard reaches this local sink,
    // never the network. Only the loopback test server may receive real traffic.
    await context.route('**/*', async (route) => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') {
        await route.continue();
      } else {
        escaped++;
        await route.abort('blockedbyclient');
      }
    });
    const check = await installProductionApiGuard(context);
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}`);

    // Page fixtures take precedence; local replay remains usable.
    await page.route('**/v4/notices?limit=100', (route) => route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{"count":0,"notices":[]}',
    }));
    assert.equal(await page.evaluate(async () => (await fetch('https://api.keeptrack.space/v4/notices?limit=100')).status), 200);
    check();

    // Missing snapshot, filtered query, single satellite, future endpoint, and
    // non-GET traffic must all stop locally. The query must not reach diagnostics.
    for (const path of ['/v4/sats/brief', '/v4/r2/vimpel.json', '/v4/notices?norad=25544&apiKey=SECRET', '/v4/sat/25544', '/v5/new']) {
      const result = await page.evaluate(async (path) => {
        try { await fetch(`https://api.keeptrack.space${path}`); return 'escaped'; }
        catch { return 'blocked'; }
      }, path);
      assert.equal(result, 'blocked');
    }
    await page.evaluate(async () => {
      await fetch('https://api.keeptrack.space/v4/new', { method: 'POST', body: 'x' }).catch(() => {});
    });
    // A page-level fallback must still hit the context guard.
    await page.route('**/v4/sat/25544', (route) => route.fallback());
    await page.evaluate(async () => { await fetch('https://api.keeptrack.space/v4/sat/25544').catch(() => {}); });
    const second = await context.newPage();
    await second.goto(`http://127.0.0.1:${port}`);
    await second.evaluate(async () => { await fetch('https://api.keeptrack.space/v4/notices').catch(() => {}); });
    assert.equal(escaped, 0, 'a production request escaped the guard');
    assert.throws(check, (error: Error) => {
      assert.match(error.message, /GET \/v4\/sat\/25544/u);
      assert.match(error.message, /POST \/v4\/new/u);
      assert.doesNotMatch(error.message, /SECRET|apiKey/u);
      return true;
    });
    await context.close();
  } finally {
    await browser.close();
  }
});
