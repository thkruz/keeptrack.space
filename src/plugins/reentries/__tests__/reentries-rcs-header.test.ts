import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const localeDir = join(__dirname, '..', 'locales');

describe('reentries RCS table header', () => {
  const files = readdirSync(localeDir).filter((f) => f.endsWith('.src.json'));

  it('covers all 12 locales', () => {
    expect(files).toHaveLength(12);
  });

  it.each(files)('%s prints m² not a caret', (file) => {
    const json = JSON.parse(readFileSync(join(localeDir, file), 'utf8'));
    const table = Object.values(json)[0] as { [k: string]: unknown };
    const rcs = JSON.stringify(table).match(/"rcs":"([^"]*)"/u)?.[1] ?? '';

    expect(rcs).toMatch(/\((m|м)²\)/u);
    expect(rcs).not.toContain('^');
  });
});
