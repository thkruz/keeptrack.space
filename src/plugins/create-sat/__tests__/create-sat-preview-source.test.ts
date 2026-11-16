import { buildActivePreviewTle, buildBasicPreviewTleFromForm, buildPreviewTleFromForm } from '@app/plugins/create-sat/create-sat-actions';
import { vi } from 'vitest';

const P = 'createSat';

const incOf = (tle2: string): number => parseFloat(tle2.slice(8, 16));
const meanmoOf = (tle2: string): number => parseFloat(tle2.slice(52, 63));

const setVal = (id: string, value: string): void => {
  (document.getElementById(`${P}-${id}`) as HTMLInputElement).value = value;
};

const activate = (panel: 'basic' | 'advanced'): void => {
  document.querySelectorAll('#createSat-tabs a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#createSat-${panel}-tab`));
};

describe('Create Satellite preview value source', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="createSat-tabs"><li><a href="#createSat-basic-tab" class="active">Basic</a></li><li><a href="#createSat-advanced-tab">Advanced</a></li></ul>
      ${['basic-inc', 'basic-apogee', 'basic-perigee', 'inc', 'meanmo', 'ecen', 'rasc', 'argPe', 'meana', 'year', 'day'].map((id) => `<input id="${P}-${id}" />`).join('')}`;
    // Basic defaults (what the user sees) vs Advanced defaults (equatorial, 16 rev/day)
    setVal('basic-inc', '51.6');
    setVal('basic-apogee', '400');
    setVal('basic-perigee', '400');
    setVal('inc', '0000.0000');
    setVal('meanmo', '16.00000');
    setVal('ecen', '0000000');
    setVal('rasc', '000.0000');
    setVal('argPe', '000.0000');
    setVal('meana', '000.0000');
    setVal('year', '26');
    setVal('day', '319.10000000');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the Basic tab (51.6 deg, 400 km) while Basic is active', () => {
    const tle = buildActivePreviewTle(P);

    expect(tle).not.toBeNull();
    expect(incOf(tle!.tle2)).toBeCloseTo(51.6, 3);
    expect(meanmoOf(tle!.tle2)).toBeCloseTo(15.5, 0);
  });

  it('reads the Advanced tab once Advanced is active', () => {
    activate('advanced');
    const tle = buildActivePreviewTle(P);

    expect(incOf(tle!.tle2)).toBeCloseTo(0, 3);
    expect(meanmoOf(tle!.tle2)).toBeCloseTo(16, 3);
  });

  it('follows edits to the active tab only', () => {
    setVal('basic-inc', '98.2');
    expect(incOf(buildActivePreviewTle(P)!.tle2)).toBeCloseTo(98.2, 3);

    activate('advanced');
    setVal('inc', '0063.4000');
    expect(incOf(buildActivePreviewTle(P)!.tle2)).toBeCloseTo(63.4, 3);

    activate('basic');
    expect(incOf(buildActivePreviewTle(P)!.tle2)).toBeCloseTo(98.2, 3);
  });

  it('derives an eccentric orbit from unequal apogee and perigee', () => {
    setVal('basic-apogee', '35786');
    setVal('basic-perigee', '500');
    const tle = buildBasicPreviewTleFromForm(P);

    expect(tle).not.toBeNull();
    expect(meanmoOf(tle!.tle2)).toBeLessThan(3);
    expect(parseInt(tle!.tle2.slice(26, 33), 10)).toBeGreaterThan(1000000);
  });

  it('returns null for apogee below perigee or blank Basic fields', () => {
    setVal('basic-apogee', '300');
    expect(buildBasicPreviewTleFromForm(P)).toBeNull();
    setVal('basic-apogee', '');
    expect(buildBasicPreviewTleFromForm(P)).toBeNull();
  });

  it('leaves the Advanced builder unchanged', () => {
    expect(incOf(buildPreviewTleFromForm(P)!.tle2)).toBeCloseTo(0, 3);
  });
});
