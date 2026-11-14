import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

/** Pro issues #143 #171 #195 #231 #292 #293 #294: static CSS guards for the phone clearance rules. */
describe('phone floating clearance CSS', () => {
  const css = readFileSync(resolve(__dirname, '../phone-floating-clearance.css'), 'utf8');
  const ts = readFileSync(resolve(__dirname, '../mobile-zoom-buttons.ts'), 'utf8');

  it('is imported with the zoom buttons', () => {
    expect(ts).toContain("import './phone-floating-clearance.css'");
  });

  it('ends side menus and the info box above the utility pill', () => {
    expect(css).toMatch(/\.side-menu-parent[\s\S]*?bottom: var\(--pill-clearance\) !important/u);
  });

  it('docks the info box full width to the bottom, capped at 45dvh, with the pill inside its own strip (#460)', () => {
    const box = /body #sat-infobox \{([^}]*)\}/u.exec(css)?.[1] ?? '';

    expect(box).toMatch(/bottom: 0;/u);
    expect(box).toMatch(/border-bottom: calc\(var\(--sat-infobox-footer-height\)[^;]*\) solid/u);
    expect(box).toMatch(/padding-bottom: 0;/u);
    expect(box).toMatch(/max-height: 45dvh/u);
    expect(box).not.toMatch(/^\s*bottom: var\(--pill-clearance\)/mu);
    expect(css).toMatch(/mobile-zoom-raised \{[^}]*bottom: calc\(45% \+ 12px\)/u);
  });

  it('keeps the footer strip at most 48px with a 48px pill and 44px icon inside it (#464)', () => {
    const strip = /--sat-infobox-footer-height: (\d+)px/u.exec(css)?.[1];

    expect(Number(strip)).toBeLessThanOrEqual(48);
    expect(css).toMatch(/\.drawer-utility-footer \{[^}]*bottom: env\(safe-area-inset-bottom[^}]*min-width: 48px[^}]*min-height: 48px/u);
    expect(css).toMatch(/\.drawer-utility-footer::before \{[^}]*width: 44px[^}]*height: 44px/u);
  });

  it('keeps header icon buttons 32px and the title text shrinkable', () => {
    expect(css).toMatch(/\.side-menu-title-right \.icon-btn \{[^}]*width: 32px/u);
    expect(css).toMatch(/\.side-menu-title-text \{[^}]*min-width: 0 !important/u);
    expect(css).toMatch(/\.secondary-title-bar \{[^}]*flex: 0 0 auto/u);
  });

  it('hides sticky hover tooltips and keeps the clock inside its slot on phones', () => {
    expect(css).toMatch(/\[data-tooltip\]::before[\s\S]*?display: none !important/u);
    expect(css).toMatch(/#nav-top-center \{[^}]*overflow: hidden/u);
  });

  it('gives phone controls 44px hit areas (#157)', () => {
    const info = readFileSync(resolve(__dirname, '../../../plugins/sat-info-box/sat-info-box.css'), 'utf8');
    const phoneInfo = info.slice(info.lastIndexOf('#157'));

    expect(css).toMatch(/#datetime #datetime-zone \{[^}]*height: 44px/u);
    expect(css).toMatch(/\.drawer-utility-icon \{[^}]*width: 44px[^}]*height: 44px/u);
    expect(css).toMatch(/\.drawer-utility-footer::before \{[^}]*width: 44px[^}]*height: 44px/u);
    expect(phoneInfo).toMatch(/\.sat-watchlist-icon \{[^}]*padding: 13px/u);
    expect(phoneInfo).toMatch(/\.sat-info-copy-values \{[^}]*min-height: 44px/u);
    expect(phoneInfo).toMatch(/\.sat-info-circle \{[^}]*width: 44px[^}]*height: 44px/u);
    expect(phoneInfo).toMatch(/@media \(max-width: 639px\)/u);
  });

  it('keeps key help areas, utility icons and the pill at 44px and rows apart (#157)', () => {
    const info = readFileSync(resolve(__dirname, '../../../plugins/sat-info-box/sat-info-box.css'), 'utf8');

    expect(info).toMatch(/\.sat-info-key--help,\s*#sat-infobox \.sat-info-key\[kt-tooltip\] \{[^}]*min-width: 44px[^}]*min-height: 44px/u);
    expect(info).toMatch(/\.sat-info-row:has\([^)]*\) \{[^}]*min-height: 44px/u);
    expect(css).toMatch(/\.drawer-utility-icon \{[^}]*width: 44px !important[^}]*height: 44px !important/u);
    expect(css).toMatch(/\.drawer-utility-footer \{[^}]*min-width: 48px[^}]*min-height: 48px/u);
    expect(css).toMatch(/#datetime #datetime-zone \{[^}]*width: auto[^}]*outline-offset: -5px/u);
  });
});
