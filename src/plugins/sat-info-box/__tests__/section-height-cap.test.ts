import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('sat-info-box section height cap (#545)', () => {
  const css = readFileSync(resolve(__dirname, '../sat-info-box.css'), 'utf8');

  it('does not cap expanded sections at 1000px, which clipped the ISS GCAT row on desktop', () => {
    const base = /#sat-mission-data \{[^}]*max-height: (\d+)px/u.exec(css);

    expect(base).not.toBeNull();
    expect(Number(base?.[1])).toBeGreaterThanOrEqual(5000);
  });
});
