/**
 * Uploads source map files from dist/js/ to Cloudflare R2 and removes them locally.
 *
 * Usage: npx tsx build/lib/sourcemap-uploader.ts
 *
 * Requires wrangler CLI to be installed and authenticated.
 * Source maps are keyed as: sourcemaps/{version}/{filename}
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConsoleStyles, handleBuildError, logWithStyle } from './build-error';

const BUCKET_NAME = 'keeptrack-sourcemaps';
const DIST_JS_DIR = 'dist/js';

const dirName = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(dirName, '../..');

function getVersion(): string {
  const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

  return packageJson.version;
}

function findMapFiles(): string[] {
  const jsDir = join(rootDir, DIST_JS_DIR);

  return readdirSync(jsDir)
    .filter((f) => f.endsWith('.map'))
    .map((f) => join(jsDir, f));
}

function uploadToR2(filePath: string, key: string): void {
  logWithStyle(`Uploading: ${key}`, ConsoleStyles.INFO);
  execSync(`npx wrangler r2 object put "${BUCKET_NAME}/${key}" --file="${filePath}"`, {
    cwd: rootDir,
    stdio: 'pipe',
  });
}

try {
  const version = getVersion();

  logWithStyle(`Source map upload for v${version}`, ConsoleStyles.INFO);

  const mapFiles = findMapFiles();

  if (mapFiles.length === 0) {
    logWithStyle('No .map files found in dist/js/. Did the build generate source maps?', ConsoleStyles.WARNING);
    process.exit(0);
  }

  logWithStyle(`Found ${mapFiles.length} source map file(s)`, ConsoleStyles.INFO);

  for (const filePath of mapFiles) {
    const fileName = filePath.split(/[\\/]/u).pop()!;
    const key = `sourcemaps/${version}/${fileName}`;

    uploadToR2(filePath, key);
    rmSync(filePath);
    logWithStyle(`Deleted local: ${fileName}`, ConsoleStyles.DEBUG);
  }

  logWithStyle(`Uploaded ${mapFiles.length} source map(s) to R2`, ConsoleStyles.SUCCESS);
} catch (error) {
  handleBuildError(error);
}
