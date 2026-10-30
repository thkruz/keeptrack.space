import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPluginImports } from '../lib/import-policy';
import { EXTERNAL_DIR } from '../lib/paths';

/** A plugin with one banned import at the root, one in a subfolder, an allowed facade import and a relative import that escapes. */
const writePlugin = (dir: string): void => {
  mkdirSync(join(dir, 'sub'), { recursive: true });
  writeFileSync(join(dir, 'index.ts'), "import { getEl } from '@app/engine/utils/get-el';\nimport { toast } from '@keeptrack/plugin-api';\nexport const a = [getEl, toast];\n");
  writeFileSync(join(dir, 'sub', 'b.ts'), "\n\nimport { x } from '@app/engine/core/service-locator';\nimport { y } from '../../outside';\nexport const b = [x, y];\n");
};

const summary = (dir: string) =>
  checkPluginImports(dir)
    .violations.map((v) => `${v.file}:${v.line} ${v.reason} ${v.specifier}`)
    .sort((a, b) => a.localeCompare(b));

const EXPECTED = [
  'index.ts:1 not-allowed @app/engine/utils/get-el',
  'sub/b.ts:3 not-allowed @app/engine/core/service-locator',
  'sub/b.ts:4 escapes-plugin ../../outside',
];

describe('checkPluginImports', () => {
  const made: string[] = [];

  afterEach(() => {
    for (const dir of made.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('runs Biome inside src/plugins-external/ and reports plugin-relative files and lines', () => {
    const dir = mkdtempSync(join(EXTERNAL_DIR, 'zz-import-policy-'));

    made.push(dir);
    writePlugin(dir);

    expect(checkPluginImports(dir).biomeError).toBeNull();
    expect(summary(dir)).toEqual(EXPECTED);
  });

  it('accepts a relative path and a folder name that looks like a CLI option', () => {
    const dir = join(EXTERNAL_DIR, '--zz-import-policy-option');

    made.push(dir);
    writePlugin(dir);

    const relativeDir = join('src', 'plugins-external', '--zz-import-policy-option');

    expect(checkPluginImports(relativeDir).biomeError).toBeNull();
    expect(summary(relativeDir)).toEqual(EXPECTED);
  });

  it('falls back to the TypeScript scan outside src/plugins-external/ with the same findings', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kt-import-policy-'));

    made.push(dir);
    writePlugin(dir);

    expect(checkPluginImports(dir).biomeError).toBe('not under src/plugins-external/');
    expect(summary(dir)).toEqual(EXPECTED);
  });
});
