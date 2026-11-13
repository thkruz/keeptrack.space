import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Issue #143: at phone widths side menus must fit the viewport regardless of the
 * user agent (is-mobile-mode is UA based and does not cover a narrow desktop window).
 */
describe('phone side-menu layout CSS', () => {
  const css = readFileSync(resolve(__dirname, '../plugin-drawer.css'), 'utf8');
  const start = css.indexOf('@media (max-width: 639px), (max-height: 500px) and (max-width: 1000px)');
  const block = start >= 0 ? css.slice(start) : '';

  it('has a viewport-based phone block (portrait and landscape)', () => {
    expect(start).toBeGreaterThan(-1);
  });

  it('constrains side menus to the viewport minus the drawer rail', () => {
    expect(block).toMatch(/\.side-menu-parent[\s\S]*?width: calc\(100vw - var\(--drawer-offset, 0px\)\) !important/u);
    expect(block).toMatch(/min-width: 0 !important/u);
  });

  it('scrolls the menu body and clears the floating pill and safe area', () => {
    expect(block).toMatch(/overflow-y: auto !important/u);
    expect(block).toMatch(/padding-bottom: calc\(96px \+ env\(safe-area-inset-bottom/u);
  });

  it('stops the utility pill expanding on touch hover', () => {
    expect(block).toMatch(/\.drawer-utility-footer:not\(\.expanded\):hover/u);
  });

  it('makes env() safe areas available via viewport-fit=cover', () => {
    const html = readFileSync(resolve(__dirname, '../../../../public/index.html'), 'utf8');

    expect(html).toMatch(/viewport-fit=cover/u);
  });
});
