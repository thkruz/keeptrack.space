import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('custom-sensor.css R20 (#533, #537)', () => {
  const css = readFileSync(join(__dirname, '..', 'custom-sensor.css'), 'utf8');

  it('does not shrink the menu title font (#533)', () => {
    const rule = /#custom-sensor-menu \.side-menu-title-text \{[^}]*\}/u.exec(css)![0];

    expect(rule).not.toMatch(/font-size/u);
  });

  it('lets field labels wrap instead of clipping them (#537)', () => {
    const rule = /#custom-sensor-menu \.input-field > label \{[^}]*\}/u.exec(css)![0];

    expect(rule).not.toMatch(/white-space:\s*nowrap/u);
    expect(rule).not.toMatch(/text-overflow/u);
  });

  describe('unit binding in locale sources (#537)', () => {
    const dir = join(__dirname, '..', 'locales');
    const keys = ['latitude', 'longitude', 'elevation', 'minAzimuth', 'maxAzimuth', 'minElevation', 'maxElevation', 'minRange', 'maxRange'];
    const labelsOf = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8')).plugins.CustomSensorPlugin.labels as Record<string, string>;

    it('en field labels have U+00A0 before the unit parenthesis', () => {
      const labels = labelsOf('en.src.json');

      for (const key of keys) {
        expect(labels[key]).toMatch(/ \((°|km)\)$/u);
      }
    });

    it('no locale breaks a unit label with a plain space before "("', () => {
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.src.json'))) {
        const labels = labelsOf(file);

        for (const key of keys) {
          expect(labels[key], `${file} ${key}`).not.toMatch(/ \(/u);
        }
      }
    });
  });
});
