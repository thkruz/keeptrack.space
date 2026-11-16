import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const strip = createRequire(import.meta.url)('../loaders/strip-unused-materialize-css.cjs') as (source: string) => string;

describe('strip-unused-materialize-css loader', () => {
  it('removes fieldset.form-field :has() rules and keeps neighbours', () => {
    const css = [
      '.keep-a { color: red; }',
      '/*--- populated */',
      'fieldset.form-field.animated:has(input:not(:placeholder-shown)) legend::before,',
      'fieldset.form-field.animated:has(input:not(:-moz-placeholder)) legend::before {',
      '  opacity: 1;',
      '}',
      'fieldset.form-field { position: relative; }',
      '.keep-b:has(.x) { color: blue; }',
    ].join('\n');
    const out = strip(css);

    expect(out).not.toContain('placeholder-shown');
    expect(out).toContain('.keep-a { color: red; }');
    expect(out).toContain('fieldset.form-field { position: relative; }');
    expect(out).toContain('.keep-b:has(.x) { color: blue; }');
  });

  it('leaves no :has() rule in the installed materialize.css', () => {
    const file = join(process.cwd(), 'node_modules/@materializecss/materialize/dist/css/materialize.css');
    const out = strip(readFileSync(file, 'utf8'));

    expect(out).not.toMatch(/fieldset\.form-field[^{}]*:has\(/u);
    expect(out).toContain('.input-field');
  });
});
