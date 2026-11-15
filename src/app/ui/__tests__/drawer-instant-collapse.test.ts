import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('plugin drawer responsiveness', () => {
  const css = readFileSync(resolve(__dirname, '../plugin-drawer.css'), 'utf8');

  it('folds and unfolds groups without a max-height animation', () => {
    expect(css).toMatch(/\.drawer-group-items \{[^}]*transition: none;/u);
    expect(css).toMatch(/\.drawer-group\.collapsed \.drawer-group-items \{[^}]*transition: none;/u);
  });

  it('expands the rail with fast transitions only', () => {
    const railStart = css.indexOf('/* ---- Rail Mode (desktop only) ---- */');
    const railBlock = css.slice(railStart, css.indexOf('.plugin-drawer.rail-mode.rail-hover {', railStart));

    expect(railStart).toBeGreaterThan(-1);
    expect(railBlock).not.toContain('--kt-duration-slow');
  });
});
