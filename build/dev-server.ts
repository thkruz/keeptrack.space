import { spawn } from 'node:child_process';
import { cpSync, createReadStream, existsSync, watch } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { ConsoleStyles, logWithStyle } from './lib/build-error';
import { cloudTilesStartupMessage, handleCloudTiles, isCloudTilesPath, resolveCloudTilesDir } from './cloud-tiles-route';
import { handlePluginEndpoint } from './plugin-install-endpoint';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
/**
 * Overridable so a second instance can be run alongside a warm one (verifying a change to
 * this file, a throwaway static serve) instead of restarting the shared :5544 server and its
 * watch build - competing watch builds on one dist/ have corrupted it before.
 */
const PORT = Number(process.env.KEEPTRACK_DEV_PORT ?? 5544);
const distDir = resolve(rootDir, 'dist');
const cloudTilesDir = resolveCloudTilesDir(rootDir);

const RELOAD_SCRIPT = `<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>`;

/** Responses at or above this stream from disk instead of being buffered whole. */
const STREAM_THRESHOLD_BYTES = 1024 * 1024;

// Maps config directory filenames to their dist/ destinations
const CONFIG_FILE_DESTINATIONS: Record<string, string> = {
  'settingsOverride.js': 'dist/settings/settingsOverride.js',
  'favicon.ico': 'dist/img/favicons/favicon.ico',
};

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

// SSE clients for livereload
const sseClients = new Set<ServerResponse>();

/**
 * Map a request pathname to a file inside dist/, or null if it escapes.
 *
 * `join(distDir, decodeURIComponent(pathname))` is not enough: a decoded `..` segment
 * (`/%2e%2e/`) walks out of dist/ and the server hands back any file the process can read.
 * Normalizing against '/' collapses the traversal and the containment check is what every
 * fs call in the handler relies on: pass only the returned path to stat/readFile/streams.
 */
function resolveInDist(pathname: string): string | null {
  let decoded: string;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // malformed percent-encoding
  }

  if (decoded.includes('\0')) {
    return null;
  }

  const collapsed = normalize(`/${decoded}`);
  const candidate = resolve(distDir, `.${collapsed}`);

  return candidate === distDir || candidate.startsWith(`${distDir}${sep}`) ? candidate : null;
}

function startServer() {
  const server = createServer(async (req, res) => {
    // Swallow socket-level errors (client aborts, RST). Without this listener a
    // write to a closed/aborted socket emits an unhandled 'error' that crashes the
    // whole process — under Playwright (which aborts requests on page close /
    // navigation constantly) that takes down the server and every later test fails
    // with ERR_CONNECTION_REFUSED.
    res.on('error', () => { /* ignore broken pipe / reset */ });

    const pathname = new URL(req.url!, `http://localhost:${PORT}`).pathname;

    // SSE endpoint for livereload
    if (pathname === '/__reload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));

      return;
    }

    // One-click plugin install (dev-server only; localhost + same-origin guarded).
    if (pathname.startsWith('/__plugin/')) {
      await handlePluginEndpoint(req, res, pathname, rootDir);

      return;
    }

    // Volumetric-cloud tiles, same-origin, from a folder outside dist/ (never copied by the build).
    if (isCloudTilesPath(pathname)) {
      await handleCloudTiles(req, res, pathname, cloudTilesDir);

      return;
    }

    const safePath = resolveInDist(pathname === '/' ? '/index.html' : pathname);

    if (!safePath) {
      res.writeHead(404);
      res.end('Not found');

      return;
    }

    try {
      let filePath = safePath;
      const fileStat = await stat(filePath).catch(() => null);

      if (fileStat?.isDirectory()) {
        filePath = join(filePath, 'index.html');
      }

      const ext = extname(filePath).toLowerCase();
      const isCode = ext === '.html' || ext === '.js' || ext === '.mjs';

      /*
       * Static assets (textures/meshes/wasm) get a validator so a reload costs a 304 instead
       * of the full body. venus8k.jpg alone is 12.5 MB and was re-downloaded every time the
       * camera moved to Venus. Answered before readFile so a revalidation never touches disk.
       * Staleness is still impossible: `no-cache` forces the browser to ask every time, and a
       * rebuild changes mtime, hence the ETag. Code stays `no-store` (see below).
       */
      const etag = !isCode && fileStat && !fileStat.isDirectory() ? `W/"${fileStat.size.toString(16)}-${Math.trunc(fileStat.mtimeMs).toString(16)}"` : null;

      if (etag && req.headers['if-none-match'] === etag) {
        res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' });
        res.end();

        return;
      }

      /*
       * Stream large assets straight from disk rather than buffering them. `readFile` holds
       * the whole file in memory per request, so a handful of concurrent texture loads (this
       * repo ships 12-18 MB JPEGs) costs tens of MB of short-lived allocation and delays the
       * first byte until the entire file is resident. HTML can't stream - it gets the
       * livereload script injected below - and small files aren't worth the stream setup.
       */
      const isStreamed = ext !== '.html' && !!fileStat && !fileStat.isDirectory() && fileStat.size >= STREAM_THRESHOLD_BYTES;
      let data: Buffer | null = null;
      let length = fileStat?.size ?? 0;

      if (!isStreamed) {
        data = await readFile(filePath);

        // Inject livereload script into HTML responses
        if (ext === '.html') {
          data = Buffer.from(data.toString().replace('</body>', `${RELOAD_SCRIPT}</body>`));
        }

        length = data.length;
      }

      /*
       * Content-Length matters as much as the MIME type here. Without it Node falls back to
       * chunked encoding, and a chunked body that is cut short (aborted socket, a rebuild
       * restarting the server mid-transfer) has ALREADY sent its 200 - so the browser shows a
       * 200 with an unreadable body and fetch() rejects at the body read with a bare
       * "Failed to fetch", which is what made a 12.5 MB texture look like it loaded while
       * erroring. A declared length makes a short transfer an unambiguous, retryable error.
       */
      const headers: Record<string, string> = {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Content-Length': String(length),
      };

      if (isCode) {
        // Never let the browser heuristically cache CODE in dev: a stale index.html (pointing
        // at old chunks) or a stale worker script (workers don't reliably refetch on reload)
        // silently wedges boot at "Building 3D Models…".
        headers['Cache-Control'] = 'no-store, must-revalidate';
      } else if (etag) {
        headers.ETag = etag;
        headers['Cache-Control'] = 'no-cache';
      }

      res.writeHead(200, headers);

      if (isStreamed) {
        await pipeline(createReadStream(filePath), res);
      } else {
        res.end(data);
      }
    } catch {
      // Guard against "headers already sent" when the response was partially
      // written before the failure — calling writeHead again would throw out of
      // the catch and crash the process.
      if (!res.headersSent) {
        res.writeHead(404);
      }
      res.end('Not found');
    }
  });

  /*
   * Node defaults keepAliveTimeout to 5 s, which is shorter than Chrome keeps a pooled socket
   * open. That gap is a classic race: the browser sends on a connection the server is closing
   * in the same instant and the request dies immediately (ERR_EMPTY_RESPONSE /
   * ERR_CONNECTION_RESET, surfacing to fetch as a bare "Failed to fetch"). headersTimeout must
   * stay above keepAliveTimeout or Node reaps the socket while headers are still arriving.
   */
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  // A malformed request line / header from an aborted client must not crash the server.
  server.on('clientError', (_err, socket) => {
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });

  // Last-resort safety net: keep the dev/test server alive even if an unexpected
  // error escapes a request handler. Logged, not fatal.
  process.on('uncaughtException', (err) => {
    logWithStyle(`Uncaught exception (server kept alive): ${err.message}`, ConsoleStyles.ERROR);
  });
  process.on('unhandledRejection', (reason) => {
    logWithStyle(`Unhandled rejection (server kept alive): ${String(reason)}`, ConsoleStyles.ERROR);
  });

  server.listen(PORT, () => {
    logWithStyle(`Serving dist/ at http://localhost:${PORT}`, ConsoleStyles.SUCCESS);
    logWithStyle(cloudTilesStartupMessage(cloudTilesDir), cloudTilesDir ? ConsoleStyles.INFO : ConsoleStyles.DEBUG);
  });
}

function notifyClients() {
  for (const client of sseClients) {
    client.write('data: reload\n\n');
  }
}

function watchDist() {
  let debounce: ReturnType<typeof setTimeout> | null = null;

  watch(distDir, { recursive: true }, () => {
    if (debounce) {
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      logWithStyle('Change detected, reloading...', ConsoleStyles.INFO);
      notifyClients();
    }, 300);
  });
}

/**
 * Watch a profile's config directory for changes to non-rspack files
 * (settingsOverride.js, favicon.ico) and re-copy them to dist/.
 */
function watchConfigDir(profileName: string) {
  const configDir = resolve(rootDir, 'configs', profileName);

  if (!existsSync(configDir)) {
    return;
  }

  logWithStyle(`Watching configs/${profileName}/ for changes`, ConsoleStyles.INFO);

  watch(configDir, (_, filename) => {
    if (!filename) {
      return;
    }

    const destRelative = CONFIG_FILE_DESTINATIONS[filename];

    if (destRelative) {
      const src = resolve(configDir, filename);
      const dest = resolve(rootDir, destRelative);

      logWithStyle(`Config changed: ${filename} → ${destRelative}`, ConsoleStyles.DEBUG);
      cpSync(src, dest);
      // dist/ watcher will pick up the change and trigger reload
    }
  });
}

/**
 * Spawn a shell command supplied as a single string.
 *
 * Passing an args array together with `shell: true` is deprecated (Node DEP0190):
 * the args are concatenated onto the command, not escaped, so Node now warns.
 * Building the full command string ourselves is the documented replacement — safe
 * here because every command below is static and trusted (no external input).
 *
 * We invoke `pnpm exec` (not `npx`) so no npm process runs: npm would otherwise print
 * "Unknown config" warnings for this repo's pnpm-only settings on every child spawn.
 */
function spawnShell(command: string, cwd: string) {
  return spawn(command, { stdio: 'inherit', shell: true, cwd });
}

function runBuildWatch(args: string[]): void {
  const buildArgs = args.length > 0 ? args : ['development'];

  // Ensure --watch is included
  if (!buildArgs.includes('--watch')) {
    buildArgs.push('--watch');
  }

  // generate-translation.ts below already merges src/locales; the build must not redo it
  if (!buildArgs.includes('--skip-locales')) {
    buildArgs.push('--skip-locales');
  }

  const cwd = rootDir;

  // Reconcile external plugins first (restore clones a fork committed + regenerate
  // the manifest), then translations, then start the watch build. --skip-locales on
  // sync avoids a redundant t7e run since we run generate-translation right after.
  const sync = spawnShell('pnpm exec tsx ./scripts/plugin/index.ts sync --skip-locales', cwd);

  sync.on('close', () => {
    // Run translations, then start build in watch mode
    const t7e = spawnShell('pnpm exec tsx ./build/generate-translation.ts', cwd);

    t7e.on('close', (code) => {
      if (code !== 0) {
        logWithStyle(`Translation generation failed with code ${code}`, ConsoleStyles.ERROR);

        return;
      }

      // Start build in watch mode (runs indefinitely)
      spawnShell(`pnpm exec tsx ./build/build-manager.ts ${buildArgs.join(' ')}`, cwd);
    });
  });
}

function getProfileName(args: string[]): string | null {
  const profileArg = args.find((arg) => arg.startsWith('--profile='));

  return profileArg ? profileArg.split('=')[1] : null;
}

const isStaticOnly = process.argv.includes('--static');

if (isStaticOnly) {
  startServer();
} else {
  const args = process.argv.slice(2).filter((arg) => arg !== '--static');
  const profileName = getProfileName(args);

  // Start build in watch mode (non-blocking)
  runBuildWatch(args);

  // Start server and file watchers
  startServer();
  watchDist();

  // Watch config directory for non-rspack file changes
  if (profileName) {
    watchConfigDir(profileName);
  }
}
