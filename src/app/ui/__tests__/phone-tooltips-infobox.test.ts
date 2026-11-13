import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { MobileManager } from '../mobileManager';

/** Round 12 Z15: #191 (tooltips on phone) and #195 (sat info box tail clipped on phone). */
describe('phone tooltips and sat info box', () => {
  it('#191 keeps TooltipsPlugin enabled in phone mode (otherwise createTooltip never runs)', () => {
    expect(MobileManager.MOBILE_PLUGINS).toContain('TooltipsPlugin');
  });

  it('#195 lifts the 1000px section cap on phones so the last rows are reachable', () => {
    const css = readFileSync(resolve(__dirname, '../../../plugins/sat-info-box/sat-info-box.css'), 'utf8');
    const phone = css.slice(css.lastIndexOf('@media (max-width: 639px)'));

    expect(phone).toMatch(/#sat-mission-data \{\s*max-height: 5000px;/u);
    expect(phone).toMatch(/padding-bottom: calc\(76px/u);
  });
});
