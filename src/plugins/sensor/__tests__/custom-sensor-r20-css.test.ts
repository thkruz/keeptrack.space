import { readFileSync } from 'fs';
import { join } from 'path';

describe('custom-sensor.css R20 (#533, #537)', () => {
  const css = readFileSync(join(__dirname, '..', 'custom-sensor.css'), 'utf8');

  it('does not shrink the menu title font (#533)', () => {
    const rule = /#custom-sensor-menu \.side-menu-title-text \{[^}]*\}/u.exec(css)![0];

    expect(rule).not.toMatch(/font-size/u);
  });

  it('keeps field labels on one line (#537)', () => {
    const rule = /#custom-sensor-menu \.input-field > label \{[^}]*\}/u.exec(css)![0];

    expect(rule).toMatch(/white-space:\s*nowrap/u);
  });
});
