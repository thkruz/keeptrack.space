import { spawn } from 'node:child_process';
import { cpSync, existsSync, watch } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConsoleStyles, logWithStyle } from './lib/build-error';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const PORT = 5544;
const distDir = resolve(rootDir, 'dist');

const RELOAD_SCRIPT = `<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>`;

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
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

// SSE clients for livereload
const sseClients = new Set<ServerResponse>();

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

    try {
      let filePath = join(distDir, decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
      const fileStat = await stat(filePath).catch(() => null);

      if (fileStat?.isDirectory()) {
        filePath = join(filePath, 'index.html');
      }

      let data = await readFile(filePath);
      const ext = extname(filePath).toLowerCase();

      // Inject livereload script into HTML responses
      if (ext === '.html') {
        const html = data.toString().replace('</body>', `${RELOAD_SCRIPT}</body>`);

        data = Buffer.from(html);
      }

      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
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

  // Run translations first, then start build in watch mode
  const t7e = spawn('npx', ['tsx', './build/generate-translation.ts'], {
    stdio: 'inherit',
    shell: true,
    cwd,
  });

  t7e.on('close', (code) => {
    if (code !== 0) {
      logWithStyle(`Translation generation failed with code ${code}`, ConsoleStyles.ERROR);

      return;
    }

    // Start build in watch mode (runs indefinitely)
    spawn('npx', ['tsx', './build/build-manager.ts', ...buildArgs], {
      stdio: 'inherit',
      shell: true,
      cwd,
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
