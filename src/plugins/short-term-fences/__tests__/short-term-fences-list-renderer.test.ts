import { renderStfList } from '@app/plugins/short-term-fences/short-term-fences-list-renderer';
import { Degrees, Kilometers } from '@ootk/src/main';
import type { DetailedSensor } from '@app/app/sensors/DetailedSensor';

const l = (key: string): string => `[${key}]`;

const fence = (overrides: Partial<DetailedSensor> = {}): DetailedSensor =>
  ({
    objName: 'STF-1',
    uiName: 'STF-1',
    minAz: 48 as Degrees,
    maxAz: 52 as Degrees,
    minEl: 18 as Degrees,
    maxEl: 22 as Degrees,
    minRng: 950 as Kilometers,
    maxRng: 1050 as Kilometers,
    ...overrides,
  }) as DetailedSensor;

describe('renderStfList', () => {
  it('renders the empty-state note when there are no fences', () => {
    const html = renderStfList([], l, 'remove.png');

    expect(html).toContain('stf-empty');
    expect(html).toContain('[empty]');
    expect(html).not.toContain('stf-fence-card');
  });

  it('renders one card per fence with its name, ranges, and remove control', () => {
    const html = renderStfList([fence(), fence({ objName: 'STF-2', uiName: 'STF-2' })], l, 'remove.png');

    expect(html.match(/stf-fence-card/gu)).toHaveLength(2);
    expect(html).toContain('STF-1');
    expect(html).toContain('STF-2');
    // Remove control resolves by objName for the delegated listener.
    expect(html).toContain('data-id="STF-1"');
    expect(html).toContain('data-id="STF-2"');
    expect(html).toContain('remove-fence');
    // The remove icon is a CSS-masked glyph (theme-tinted), not a raw <img>.
    expect(html).toContain('stf-remove-glyph');
    expect(html).toContain("--stf-remove-icon: url('remove.png')");
    expect(html).not.toContain('<img');
    // Attribute grid shows az/el/range.
    expect(html).toContain('48° - 52°');
    expect(html).toContain('18° - 22°');
    expect(html).toContain('950 - 1050 km');
  });

  it('falls back to objName when uiName is absent', () => {
    const html = renderStfList([fence({ uiName: undefined })], l, 'remove.png');

    expect(html).toContain('STF-1');
  });
});
