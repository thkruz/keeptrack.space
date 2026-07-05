/**
 * Dev-server-only endpoint that lets the in-app Plugin Manager install a plugin
 * with one click (instead of copying a CLI command). This exists ONLY in the
 * local dev server — production static hosting never serves it.
 *
 * Guardrails: localhost bind (the dev server already binds locally), a same-origin
 * check on the Origin header (blocks CSRF from other pages), and an https-only
 * repository allowlist. Installing still runs third-party code in the build, so
 * this is a convenience for a trusted local developer, not a public surface.
 */
import { spawn } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';

const ALLOWED_ORIGINS = new Set(['http://localhost:5544', 'http://127.0.0.1:5544']);
const HTTPS_GIT_URL = /^https:\/\/[\w.@:/~-]+$/u;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolveBody(data));
  });
}

// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/gu;

/**
 * Handle a `/__plugin/*` request. Returns true if the request was handled (so the
 * caller skips static file serving), false otherwise.
 */
export async function handlePluginEndpoint(req: IncomingMessage, res: ServerResponse, pathname: string, rootDir: string): Promise<boolean> {
  if (!pathname.startsWith('/__plugin/')) {
    return false;
  }

  // Presence probe — the Manager shows the one-click button only when this responds.
  if (pathname === '/__plugin/status' && req.method === 'GET') {
    sendJson(res, 200, { ok: true });

    return true;
  }

  if (pathname === '/__plugin/install' && req.method === 'POST') {
    await handleInstall(req, res, rootDir);

    return true;
  }

  sendJson(res, 404, { ok: false, message: 'Unknown plugin endpoint' });

  return true;
}

async function handleInstall(req: IncomingMessage, res: ServerResponse, rootDir: string): Promise<void> {
  const origin = req.headers.origin;

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    sendJson(res, 403, { ok: false, message: 'Cross-origin install blocked.' });

    return;
  }

  let parsed: { repository?: string; ref?: string };

  try {
    parsed = JSON.parse(await readBody(req)) as { repository?: string; ref?: string };
  } catch {
    sendJson(res, 400, { ok: false, message: 'Invalid JSON body.' });

    return;
  }

  const repository = String(parsed.repository ?? '');

  if (!HTTPS_GIT_URL.test(repository)) {
    sendJson(res, 400, { ok: false, message: 'Only https git URLs may be installed from the browser.' });

    return;
  }

  const args = ['tsx', resolve(rootDir, 'scripts/plugin/index.ts'), 'add', repository, '--yes'];

  if (parsed.ref) {
    args.push('--ref', String(parsed.ref));
  }

  const child = spawn('npx', args, { cwd: rootDir, shell: process.platform === 'win32' });
  let output = '';

  child.stdout?.on('data', (d: Buffer) => {
    output += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    output += d.toString();
  });
  child.on('close', (code) => {
    const message = output.replaceAll(ANSI, '').trim().split('\n').slice(-4).join('\n');

    sendJson(res, code === 0 ? 200 : 500, { ok: code === 0, message });
  });
}
