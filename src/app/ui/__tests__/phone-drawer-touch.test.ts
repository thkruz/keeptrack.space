import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { MobileManager } from '../mobileManager';

/** Round 5 phone drawer issues #153 to #157 (keeptrack-space-pro). */
describe('phone drawer and touch targets', () => {
  const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');
  const drawerCss = read('../plugin-drawer.css');
  const tail = drawerCss.slice(drawerCss.indexOf('Phone drawer and touch targets (issues #153 to #157)'));

  it('#153 keeps the account, sensors and palette plugins on phones', () => {
    for (const key of ['UserAccountPlugin', 'CommandPalettePlugin', 'SensorListPlugin', 'CustomSensorPlugin', 'LookAnglesPlugin', 'BestPassPlugin']) {
      expect(MobileManager.MOBILE_PLUGINS).toContain(key);
    }
  });

  it('#153 puts the account row first in the phone drawer', () => {
    expect(tail).toMatch(/\.plugin-drawer\.mobile-mode \.drawer-user-account \{\s*order: -2;/u);
  });

  it('#143 stacks settings panes above their parent menu on phones', () => {
    expect(drawerCss).toMatch(/body \[id\$="-secondary"\]\.side-menu-parent \{\s*z-index: 6 !important;/u);
  });

  it('#154 makes the custom sensor submit row non-sticky on phones', () => {
    const css = read('../../../plugins/sensor/custom-sensor.css');
    const phone = css.slice(css.lastIndexOf('@media (max-width: 639px)'));

    expect(phone).toMatch(/#cs-submit \{\s*position: static;/u);
  });

  it('#155 caps the drawer at the viewport width', () => {
    expect(tail).toMatch(/max-width: 100vw !important/u);
    expect(tail).toMatch(/desktop-mode:not\(\.rail-mode\) \{\s*width: 100vw !important/u);
  });

  it('#156 scrolls the whole phone drawer and provides a close button', () => {
    expect(tail).toMatch(/\.plugin-drawer\.mobile-mode \{[^}]*overflow-y: auto/u);
    expect(tail).toMatch(/\.drawer-close-btn \{\s*display: flex;/u);
  });

  it('#157 shows the palette trigger on phones and sizes targets to 44px', () => {
    expect(drawerCss).not.toMatch(/\.drawer-search \{\s*display: none !important;/u);
    expect(tail).toMatch(/\.drawer-item \{\s*min-height: 44px/u);
    expect(tail).toMatch(/#search-holder \{\s*min-height: 44px/u);
    const tl = read('../../../plugins-pro/access-timeline/access-timeline.css');

    expect(tl).toMatch(/__mode-btn \{\s*min-height: 44px/u);
    expect(tl).toMatch(/__tool-btn \{\s*width: 44px;\s*height: 44px/u);
  });
});
