import { describe, expect, it } from 'vitest';
import { buildAdvancedTabHtml } from '../create-sat-menu-html';

/** R14: the ISO epoch field shows a format hint, not a date that looks like a real value. */
describe('create-sat epoch timestamp placeholder', () => {
  it('uses a format hint instead of a concrete date', () => {
    const html = buildAdvancedTabHtml();

    expect(html).toContain('placeholder="YYYY-MM-DDTHH:MM:SSZ"');
    expect(html).not.toContain('2026-11-04T00:00:00Z');
  });
});
