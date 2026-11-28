/**
 * Dev-server route that serves the volumetric-cloud tile set same-origin at `/cloud-tiles/`.
 *
 * The folder comes from KEEPTRACK_CLOUD_TILES_DIR, else `<repo root>/.cloud-tiles` when that exists.
 * With neither, the route answers 404 and the Pro client falls back to the painted cloud map.
 * Only GET and HEAD; only `meta.json` and `{level}/{row}/{col}.png` (digits only, so no traversal);
 * files stream from disk (the set is several GB).
 */
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';

export const CLOUD_TILES_PREFIX = '/cloud-tiles/';
export const TILE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const META_CACHE_CONTROL = 'no-cache';

const TILE_PATH = /^\d{1,2}\/\d{1,6}\/\d{1,6}\.png$/u;

/** Folder holding the tiles, or null when tiles are off. */
export const resolveCloudTilesDir = (rootDir: string, env: NodeJS.ProcessEnv = process.env, exists: (p: string) => boolean = existsSync): string | null => {
  const fromEnv = env.KEEPTRACK_CLOUD_TILES_DIR?.trim();

  if (fromEnv) {
    const dir = resolve(fromEnv);

    return exists(dir) ? dir : null;
  }
  const fallback = resolve(rootDir, '.cloud-tiles');

  return exists(fallback) ? fallback : null;
};

/** The one line logged at startup. */
export const cloudTilesStartupMessage = (dir: string | null): string =>
  dir
    ? `Cloud tiles served from ${dir} at ${CLOUD_TILES_PREFIX}`
    : `Cloud tiles are off (404 at ${CLOUD_TILES_PREFIX}): set KEEPTRACK_CLOUD_TILES_DIR to the tile folder or link it as .cloud-tiles in the repo root`;

/** True when the pathname belongs to this route (so the caller hands it over, even to answer 404). */
export const isCloudTilesPath = (pathname: string): boolean => pathname === '/cloud-tiles' || pathname.startsWith(CLOUD_TILES_PREFIX);

/** Absolute file for a request pathname, or null when it is not meta.json or a numeric tile path. */
export const resolveCloudTileFile = (dir: string, pathname: string): string | null => {
  if (!pathname.startsWith(CLOUD_TILES_PREFIX)) {
    return null;
  }
  const rest = pathname.slice(CLOUD_TILES_PREFIX.length);

  if (rest !== 'meta.json' && !TILE_PATH.test(rest)) {
    return null;
  }

  return join(dir, ...rest.split('/'));
};

const notFound = (res: ServerResponse): void => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end('Not found');
};

/** Handle a request already known to be under /cloud-tiles. */
export const handleCloudTiles = async (req: IncomingMessage, res: ServerResponse, pathname: string, dir: string | null): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');

    return;
  }
  const file = dir ? resolveCloudTileFile(dir, pathname) : null;

  if (!file) {
    notFound(res);

    return;
  }
  const info = await stat(file).catch(() => null);

  if (!info?.isFile()) {
    notFound(res);

    return;
  }
  const isMeta = pathname.endsWith('/meta.json');

  res.writeHead(200, {
    'Content-Type': isMeta ? 'application/json; charset=utf-8' : 'image/png',
    'Content-Length': String(info.size),
    'Cache-Control': isMeta ? META_CACHE_CONTROL : TILE_CACHE_CONTROL,
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') {
    res.end();

    return;
  }
  const stream = createReadStream(file);

  stream.on('error', () => res.destroy());
  stream.pipe(res);
};
