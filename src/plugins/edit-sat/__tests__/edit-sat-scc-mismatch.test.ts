import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(__dirname, '..', 'locales');

describe('EditSat sccMismatch message', () => {
  it('has placeholders in every locale that the global replace used by edit-sat.ts fully substitutes', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.src.json'));

    expect(files.length).toBe(12);
    for (const f of files) {
      const msg: string = JSON.parse(readFileSync(join(dir, f), 'utf8')).plugins.EditSat.errorMsgs.sccMismatch;
      const out = msg.replace(/\{fileScc\}/gu, '25544').replace(/\{selectedScc\}/gu, '43013');

      expect(out, f).not.toMatch(/\{/u);
      expect(out, f).toContain('25544');
    }
  });
});
