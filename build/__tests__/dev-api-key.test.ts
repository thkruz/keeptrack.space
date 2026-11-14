import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertNoApiKeyInDist, isDevKeyAllowed, resolveDevApiKey } from '../lib/dev-api-key';

const KEY = 'kt_0123456789abcdef0123456789abcdef';

describe('dev api key build guard', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kt-guard-'));
    mkdirSync(join(dir, 'js'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('only embeds the dev key for development, watch or opted-in builds', () => {
    const env = { KEEPTRACK_DEV_API_KEY: KEY };

    expect(resolveDevApiKey('development', false, './none', env)).toBe(KEY);
    expect(resolveDevApiKey('production', true, './none', env)).toBe(KEY);
    expect(resolveDevApiKey('production', false, './none', { ...env, KEEPTRACK_ALLOW_DEV_API_KEY: '1' })).toBe(KEY);
    expect(resolveDevApiKey('production', false, './none', env)).toBe('');
    expect(isDevKeyAllowed('production', false, {})).toBe(false);
  });

  it('reads the key from the env file when not in process env', () => {
    const envFile = join(dir, '.env');

    writeFileSync(envFile, `FOO=1\nKEEPTRACK_DEV_API_KEY="${KEY}"\n`);
    expect(resolveDevApiKey('development', false, envFile, {})).toBe(KEY);
  });

  it('fails a production build whose dist contains either key, without printing it', () => {
    writeFileSync(join(dir, 'js', 'main.js'), `var a="${KEY}";`);

    for (const name of ['KEEPTRACK_DEV_API_KEY', 'KEEPTRACK_API_KEY']) {
      let message = '';

      try {
        assertNoApiKeyInDist(dir, 'production', false, './none', { [name]: KEY });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toContain('main.js');
      expect(message).not.toContain(KEY);
    }
  });

  it('passes a clean production dist and skips allowed builds', () => {
    writeFileSync(join(dir, 'js', 'main.js'), 'var a=1;');
    expect(() => assertNoApiKeyInDist(dir, 'production', false, './none', { KEEPTRACK_API_KEY: KEY })).not.toThrow();

    writeFileSync(join(dir, 'js', 'main.js'), `var a="${KEY}";`);
    expect(() => assertNoApiKeyInDist(dir, 'development', false, './none', { KEEPTRACK_API_KEY: KEY })).not.toThrow();
  });
});
