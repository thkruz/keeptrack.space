/**
 * Standalone mesh viewer server.
 *
 * Serves a small web tool that renders public/meshes OBJ+MTL files with the
 * exact KeepTrack mesh pipeline (layout, x0.05 scale, shader, log depth) so a
 * mesh can be validated without booting the full app.
 *
 * Usage: npm run mesh-viewer [-- --port=5533 --no-open]
 */
import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const meshesDir = path.join(repoRoot, 'public', 'meshes');

const portArg = process.argv.find((a) => a.startsWith('--port='));
const port = portArg ? Number.parseInt(portArg.split('=')[1], 10) : Number.parseInt(process.env.PORT ?? '5533', 10);
const noOpen = process.argv.includes('--no-open');

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.obj': 'text/plain; charset=utf-8',
  '.mtl': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const libFiles: Record<string, string> = {
  'webgl-obj-loader.min.js': path.join(repoRoot, 'node_modules', 'webgl-obj-loader', 'dist', 'webgl-obj-loader.min.js'),
  'gl-matrix-min.js': path.join(repoRoot, 'node_modules', 'gl-matrix', 'gl-matrix-min.js'),
};

const sendFile = (res: http.ServerResponse, filePath: string, noStore = false): void => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Not found: ${path.basename(filePath)}`);

      return;
    }
    const headers: Record<string, string> = {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    };

    if (noStore) {
      headers['Cache-Control'] = 'no-store';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
};

const listMeshes = (): { name: string; size: number }[] => fs
  .readdirSync(meshesDir)
  .filter((f) => f.endsWith('.obj'))
  .sort((a, b) => a.localeCompare(b))
  .map((f) => ({
    name: f.replace(/\.obj$/u, ''),
    size: fs.statSync(path.join(meshesDir, f)).size,
  }));

/*
 * SSE hot-reload plumbing: fs.watch on public/meshes, debounced per file
 * (Windows fires duplicate change events), broadcast to connected clients.
 */
const sseClients = new Set<http.ServerResponse>();
const debounceTimers = new Map<string, NodeJS.Timeout>();

const broadcast = (payload: object): void => {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;

  for (const client of sseClients) {
    client.write(msg);
  }
};

fs.watch(meshesDir, (_event, filename) => {
  if (!filename || !(/\.(?:obj|mtl)$/u).test(filename)) {
    return;
  }
  const existing = debounceTimers.get(filename);

  if (existing) {
    clearTimeout(existing);
  }
  debounceTimers.set(filename, setTimeout(() => {
    debounceTimers.delete(filename);
    broadcast({ file: filename });
  }, 200));
});

setInterval(() => {
  for (const client of sseClients) {
    client.write(': ping\n\n');
  }
}, 30000).unref();

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/' || pathname === '/index.html') {
      sendFile(res, path.join(scriptDir, 'index.html'));
    } else if (pathname === '/viewer.js') {
      sendFile(res, path.join(scriptDir, 'viewer.js'));
    } else if (pathname === '/api/meshes') {
      res.writeHead(200, { 'Content-Type': mimeTypes['.json'], 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(listMeshes()));
    } else if (pathname === '/api/watch') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      res.write(': connected\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
    } else if (pathname.startsWith('/meshes/')) {
      // basename() blocks path traversal; meshes are flat in one directory
      sendFile(res, path.join(meshesDir, path.basename(pathname)), true);
    } else if (pathname.startsWith('/lib/')) {
      const lib = libFiles[path.basename(pathname)];

      if (lib) {
        sendFile(res, lib);
      } else {
        res.writeHead(404);
        res.end();
      }
    } else if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(String(err));
  }
});

server.listen(port, () => {
  const address = `http://localhost:${port}`;

  // eslint-disable-next-line no-console
  console.log(`Mesh viewer running at ${address}`);
  // eslint-disable-next-line no-console
  console.log(`Serving ${listMeshes().length} meshes from ${meshesDir}`);

  if (!noOpen) {
    const opener = process.platform === 'win32' ? `start "" "${address}"` : process.platform === 'darwin' ? `open "${address}"` : `xdg-open "${address}"`;

    exec(opener, () => { /* best effort; the URL is printed above */ });
  }
});
