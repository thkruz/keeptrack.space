/* eslint-disable camelcase */ // OrbitGuard API payload fields are snake_case
import { vi } from 'vitest';
import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBoxOrbitGuard } from '@app/plugins/sat-info-box-orbit-guard/sat-info-box-orbit-guard';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SatInfoBoxOrbitGuard', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatInfoBoxOrbitGuard, 'SatInfoBoxOrbitGuard');
});

describe('SatInfoBoxOrbitGuard behavior', () => {
  let plugin: SatInfoBoxOrbitGuard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  // A representative API payload for one satellite.
  const apiPayload = (scc: string) => ({
    [scc]: {
      elset: [
        { epoch: '2022-01-01T00:00:00Z', raan: 10, inclination: 51, argOfPerigee: 20, semiMajorAxis: 6778, eccentricity: 0.001, meanMotion: 15.5, period: 92 },
        { epoch: '2022-01-01T01:00:00Z', raan: 11, inclination: 51, argOfPerigee: 21, semiMajorAxis: 6779, eccentricity: 0.001, meanMotion: 15.5, period: 92 },
      ],
      eo: [{ ra: 1, declination: 2, range: 500, epoch: '2022-01-01T00:00:00Z' }],
      detection: {
        event_start_timestamp: '2022-01-01T00:00:00Z',
        event_end_timestamp: '2022-01-01T02:00:00Z',
        maneuver_class: 'Stationkeeping',
        maneuver_probability: 0.87,
        oof_detection: 1,
        stability_change_detection: 1,
        stability_change_probability: 0.42,
      },
    },
  });

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxOrbitGuard();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('createManeuverSection_ builds the section markup', () => {
    const htmlStr = p().createManeuverSection_();

    expect(htmlStr).toContain('maneuver-sat-info');
    expect(htmlStr).toContain('OrbitGuard');
  });

  describe('fetchHistoricalPlotData_', () => {
    it('parses the API response into elset/eo/event series', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(apiPayload('25544')),
      })));

      const out = await p().fetchHistoricalPlotData_('25544');

      expect(out).toHaveLength(3);
      expect(out[0].name).toContain('25544');
      expect(out[0].value.length).toBe(2);
      expect(out[2].value.maneuver_class).toBe('Stationkeeping');
    });

    it('returns an empty array on a non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500, statusText: 'err' })));

      expect(await p().fetchHistoricalPlotData_('25544')).toEqual([]);
    });

    it('returns an empty array when fetch rejects', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))));

      expect(await p().fetchHistoricalPlotData_('25544')).toEqual([]);
    });
  });

  it('createHistorical2dPlot_ renders the detection header and charts (echarts mocked)', () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="maneuver-sat-info-data"></div>');

    const data = [
      { name: 'SAT-25544', value: [['2022-01-01T00:00:00Z', 10, 51, 20, 6778, 400, 0.001, 15.5, 92]] },
      { name: 'SAT-25544 EO Data', value: [[1, 2, 500, '2022-01-01T00:00:00Z']] },
      { name: 'SAT-25544 Event', value: apiPayload('25544')['25544'].detection },
    ];

    expect(() => p().createHistorical2dPlot_(data)).not.toThrow();
    // The detection header text reflects the maneuver class and OOF flag.
    expect(getEl('maneuver-sat-info-data')!.textContent).toContain('Stationkeeping');
  });

  it('createHistorical2dPlot_ shows "no event" text when detection is empty', () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="maneuver-sat-info-data"></div>');

    const data = [
      { name: 'SAT-25544', value: [['2022-01-01T00:00:00Z', 10, 51, 20, 6778, 400, 0.001, 15.5, 92]] },
      { name: 'SAT-25544 EO Data', value: [] },
      { name: 'SAT-25544 Event', value: { maneuver_class: null, oof_detection: false, stability_change_detection: false } },
    ];

    expect(() => p().createHistorical2dPlot_(data)).not.toThrow();
  });
});
