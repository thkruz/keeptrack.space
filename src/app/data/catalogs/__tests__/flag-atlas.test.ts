import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { OPERATOR_RULES } from '../../operators/operator-rules';
import { country2flagIcon, countryCodeList, countryFlagIconMap } from '../countries';

interface AtlasJson {
  width: number;
  height: number;
  fallback: string;
  missing: string[];
  cells: Record<string, [number, number, number, number]>;
}

const ATLAS_DIR = resolve(__dirname, '../../../../../public/img/flag-atlas');
const atlas = JSON.parse(readFileSync(resolve(ATLAS_DIR, 'atlas.json'), 'utf8')) as AtlasJson;

/** The key the app looks up: country2flagIcon's class minus the `fi-` prefix. */
const keyOf = (country: string): string => country2flagIcon(country).slice(3);

describe('flag atlas (public/img/flag-atlas)', () => {
  it('stays under the 512 KB budget', () => {
    expect(existsSync(resolve(ATLAS_DIR, 'atlas.png'))).toBe(true);
    expect(statSync(resolve(ATLAS_DIR, 'atlas.png')).size).toBeLessThan(512 * 1024);
  });

  it('has a cell for every country name and code in countries.ts', () => {
    const inputs = [...Object.keys(countryCodeList), ...Object.values(countryCodeList).flatMap((c) => c.split('|')), ...Object.keys(countryFlagIconMap)];

    for (const input of inputs.filter((i) => i !== '')) {
      expect(atlas.cells[keyOf(input)], `${input} -> ${keyOf(input)}`).toBeDefined();
    }
  });

  it('gives every operator rule country real flag art (not the fallback)', () => {
    for (const rule of OPERATOR_RULES) {
      expect(atlas.cells[rule.country], rule.slug).toBeDefined();
      expect(atlas.missing).not.toContain(rule.country);
    }
  });

  it('maps keys without art to the fallback cell', () => {
    for (const key of atlas.missing) {
      expect(atlas.cells[key]).toEqual(atlas.cells[atlas.fallback]);
    }
  });

  it('places the first cells where the 96x64 grid puts them', () => {
    // Cell 0 (fallback) spans x 0..96, y 0..64 px of 2048x1024, inset half a texel:
    // u0 = 0.5/2048 = 0.000244, v0 = 0.5/1024 = 0.000488, u1 = 95.5/2048 = 0.046631, v1 = 63.5/1024 = 0.062012.
    expect(atlas.cells[atlas.fallback]).toEqual([0.000244, 0.000488, 0.046631, 0.062012]);
    // ISS and US are real flags, so they never share the fallback rect.
    expect(atlas.cells.iss).not.toEqual(atlas.cells[atlas.fallback]);
    expect(atlas.cells.us).not.toEqual(atlas.cells[atlas.fallback]);
  });
});
