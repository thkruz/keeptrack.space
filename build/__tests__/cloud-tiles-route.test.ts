import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cloudTilesStartupMessage, handleCloudTiles, isCloudTilesPath, resolveCloudTileFile, resolveCloudTilesDir } from '../cloud-tiles-route';

interface Reply { status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }

const get = (url: string, method = 'GET'): Promise<Reply> =>
  new Promise((ok, fail) => {
    const req = request(url, { method }, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => ok({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
    });

    req.on('error', fail);
    req.end();
  });

describe('resolveCloudTileFile', () => {
  const dir = resolve('/tiles');

  it('accepts meta.json and numeric tile paths', () => {
    expect(resolveCloudTileFile(dir, '/cloud-tiles/meta.json')).toBe(join(dir, 'meta.json'));
    expect(resolveCloudTileFile(dir, '/cloud-tiles/7/12/345.png')).toBe(join(dir, '7', '12', '345.png'));
  });

  it.each([
    '/cloud-tiles/',
    '/cloud-tiles/../secret.png',
    '/cloud-tiles/7/../meta.json',
    '/cloud-tiles/%2e%2e/meta.json',
    '/cloud-tiles/7/12/345.jpg',
    '/cloud-tiles/7/12/345.png/',
    '/cloud-tiles/7/12/a.png',
    '/cloud-tiles/7/12.png',
    '/cloud-tiles/1/2/3/4.png',
    '/cloud-tiles/7\\12\\345.png',
    '/cloud-tiles/other.json',
    '/cloud-tiles/meta.json/x',
    '/other/meta.json',
  ])('rejects %s', (p) => {
    expect(resolveCloudTileFile(dir, p)).toBeNull();
  });
});

describe('isCloudTilesPath', () => {
  it('claims the prefix only', () => {
    expect(isCloudTilesPath('/cloud-tiles/meta.json')).toBe(true);
    expect(isCloudTilesPath('/cloud-tiles')).toBe(true);
    expect(isCloudTilesPath('/cloud-tilesx/a')).toBe(false);
    expect(isCloudTilesPath('/index.html')).toBe(false);
  });
});

describe('resolveCloudTilesDir', () => {
  const root = resolve('/repo');

  it('prefers the env variable, then .cloud-tiles, else null', () => {
    const all = () => true;
    const none = () => false;

    expect(resolveCloudTilesDir(root, { KEEPTRACK_CLOUD_TILES_DIR: '/data/t' }, all)).toBe(resolve('/data/t'));
    expect(resolveCloudTilesDir(root, {}, all)).toBe(join(root, '.cloud-tiles'));
    expect(resolveCloudTilesDir(root, {}, none)).toBeNull();
    expect(resolveCloudTilesDir(root, { KEEPTRACK_CLOUD_TILES_DIR: '/data/t' }, none)).toBeNull();
    expect(resolveCloudTilesDir(root, { KEEPTRACK_CLOUD_TILES_DIR: '  ' }, none)).toBeNull();
  });

  it('says how to turn tiles on when off', () => {
    expect(cloudTilesStartupMessage(null)).toContain('KEEPTRACK_CLOUD_TILES_DIR');
    expect(cloudTilesStartupMessage('/x')).toContain('/x');
  });
});

describe('handleCloudTiles over HTTP', () => {
  let dir: string;
  let server: Server;
  let missingServer: Server;
  let base: string;
  let missingBase: string;

  const listen = (s: Server): Promise<string> => new Promise((ok) => s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${(s.address() as AddressInfo).port}`)));

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'cloud-tiles-'));
    mkdirSync(join(dir, '3', '1'), { recursive: true });
    writeFileSync(join(dir, 'meta.json'), '{"ok":true}');
    writeFileSync(join(dir, '3', '1', '2.png'), Buffer.from([1, 2, 3, 4]));
    server = createServer((req, res) => void handleCloudTiles(req, res, new URL(req.url!, 'http://x').pathname, dir));
    missingServer = createServer((req, res) => void handleCloudTiles(req, res, new URL(req.url!, 'http://x').pathname, null));
    base = await listen(server);
    missingBase = await listen(missingServer);
  });

  afterAll(() => {
    server.close();
    missingServer.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves meta.json uncached with a JSON type', async () => {
    const res = await get(`${base}/cloud-tiles/meta.json`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.body.toString()).toBe('{"ok":true}');
  });

  it('serves a tile with a long cache and PNG type, and HEAD has no body', async () => {
    const res = await get(`${base}/cloud-tiles/3/1/2.png`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toContain('max-age=31536000');
    expect([...res.body]).toEqual([1, 2, 3, 4]);
    const head = await get(`${base}/cloud-tiles/3/1/2.png`, 'HEAD');

    expect(head.status).toBe(200);
    expect(head.headers['content-length']).toBe('4');
    expect(head.body.length).toBe(0);
  });

  it('404s a missing tile and a rejected path, 405s other methods', async () => {
    expect((await get(`${base}/cloud-tiles/3/1/9.png`)).status).toBe(404);
    expect((await get(`${base}/cloud-tiles/3/1/2.jpg`)).status).toBe(404);
    expect((await get(`${base}/cloud-tiles/%2e%2e/meta.json`)).status).toBe(404);
    expect((await get(`${base}/cloud-tiles/meta.json`, 'POST')).status).toBe(405);
  });

  it('answers 404 for everything when the folder is missing', async () => {
    expect((await get(`${missingBase}/cloud-tiles/meta.json`)).status).toBe(404);
    expect((await get(`${missingBase}/cloud-tiles/3/1/2.png`)).status).toBe(404);
  });
});
