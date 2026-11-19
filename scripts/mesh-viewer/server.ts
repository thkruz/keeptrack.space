/**
 * Standalone mesh viewer server.
 *
 * Serves a small web tool that renders OBJ+MTL files with the exact KeepTrack
 * mesh pipeline (layout, x0.001 scale, shader, log depth) so a mesh can be
 * validated without booting the full app.
 *
 * Both mesh directories are served as one flat namespace, exactly like a pro
 * build does at runtime: the free models in `public/meshes/` plus, when the
 * plugins-pro submodule is checked out, the Pro models in
 * `src/plugins-pro/public/meshes/`. A missing submodule just means fewer entries
 * in the list, never a broken viewer.
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
/*
 * Searched in order, so a name present in both resolves to the Pro copy - which is what the
 * build does too (its copy plugin writes over `public/`'s output).
 */
const meshDirs = [path.join(repoRoot, 'src', 'plugins-pro', 'public', 'meshes'), path.join(repoRoot, 'public', 'meshes')].filter((d) => fs.existsSync(d));

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

/** Absolute path of a mesh file, taking the first directory that has it. */
const resolveMesh = (fileName: string): string | null => {
  for (const dir of meshDirs) {
    const candidate = path.join(dir, fileName);

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const listMeshes = (): { name: string; size: number }[] => {
  // First directory wins, so a Pro model shadows a same-named free one rather than listing twice.
  const byName = new Map<string, { name: string; size: number }>();

  for (const dir of meshDirs) {
    for (const f of fs.readdirSync(dir)) {
      const name = f.endsWith('.obj') ? f.slice(0, -'.obj'.length) : null;

      if (name && !byName.has(name)) {
        byName.set(name, { name, size: fs.statSync(path.join(dir, f)).size });
      }
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
};

/*
 * SSE hot-reload plumbing: fs.watch on every mesh directory, debounced per file
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

for (const dir of meshDirs) {
  fs.watch(dir, (_event, filename) => {
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
}

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
      // basename() blocks path traversal; meshes are flat within each directory
      const meshPath = resolveMesh(path.basename(pathname));

      if (meshPath) {
        sendFile(res, meshPath, true);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Not found: ${path.basename(pathname)}`);
      }
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
    // eslint-disable-next-line no-console
    console.error(err);
    res.end('Internal server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  const address = `http://localhost:${port}`;

  // eslint-disable-next-line no-console
  console.log(`Mesh viewer running at ${address}`);
  // eslint-disable-next-line no-console
  console.log(`Serving ${listMeshes().length} meshes from ${meshDirs.map((d) => path.relative(repoRoot, d)).join(' + ')}`);

  if (!noOpen) {
    const opener = process.platform === 'win32' ? `start "" "${address}"` : process.platform === 'darwin' ? `open "${address}"` : `xdg-open "${address}"`;

    exec(opener, () => { /* best effort; the URL is printed above */ });
  }
});
