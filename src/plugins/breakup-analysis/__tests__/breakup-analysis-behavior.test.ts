import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { BreakupAnalysis } from '@app/plugins/breakup-analysis/breakup-analysis';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const fakeSat = (over: Record<string, unknown> = {}) => ({
  isSatellite: () => true,
  type: SpaceObjectType.DEBRIS,
  intlDes: '1999-025A',
  active: true,
  sccNum: '25730',
  name: 'FENGYUN 1C DEB',
  perigee: 800,
  apogee: 900,
  inclination: 98.5,
  eccentricity: 0.005,
  getTypeString: () => 'Debris',
  ...over,
});

describe('BreakupAnalysis behavior', () => {
  let plugin: BreakupAnalysis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = BreakupAnalysis as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new BreakupAnalysis();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('static statistical helpers', () => {
    it('calcYearsBetween_ returns the fractional year gap', () => {
      expect(C.calcYearsBetween_('1999-05-10', '2007-01-11')).toBe('7.7');
    });

    it('calcFieldStats_ computes min/max/mean and zeroes for an empty set', () => {
      const sats = [fakeSat({ inclination: 10 }), fakeSat({ inclination: 20 }), fakeSat({ inclination: 30 })];

      expect(C.calcFieldStats_(sats, (s: { inclination: number }) => s.inclination)).toEqual({ min: 10, max: 30, mean: 20 });
      expect(C.calcFieldStats_([], (s: { inclination: number }) => s.inclination)).toEqual({ min: 0, max: 0, mean: 0 });
    });
  });

  it('findDebrisForEvent_ collects active sats whose intlDes matches the prefix', () => {
    const matching = fakeSat({ intlDes: '1999-025A', sccNum: '1' });
    const other = fakeSat({ intlDes: '2000-001A', sccNum: '2' });
    const inactive = fakeSat({ intlDes: '1999-025B', active: false, sccNum: '3' });

    vi.spyOn(ServiceLocator.getCatalogManager(), 'numSatellites', 'get').mockReturnValue(3);
    ServiceLocator.getCatalogManager().objectCache = [matching, other, inactive] as never;

    const results = p().findDebrisForEvent_({ intlDesPrefix: '1999-025' });

    expect(results).toHaveLength(1);
    expect(results[0].sccNum).toBe('1');
  });

  it('countByType_ buckets debris by object type', () => {
    p().debrisResults_ = [
      fakeSat({ type: SpaceObjectType.PAYLOAD }),
      fakeSat({ type: SpaceObjectType.ROCKET_BODY }),
      fakeSat({ type: SpaceObjectType.DEBRIS }),
      fakeSat({ type: SpaceObjectType.DEBRIS }),
    ];

    expect(p().countByType_()).toEqual({ payloads: 1, rocketBodies: 1, debris: 2 });
  });

  it('calcAltitudeStats_ summarizes perigee/apogee and zeroes for empty', () => {
    p().debrisResults_ = [fakeSat({ perigee: 700, apogee: 900 }), fakeSat({ perigee: 800, apogee: 1000 })];

    const stats = p().calcAltitudeStats_();

    expect(stats.minPerigee).toBe(700);
    expect(stats.maxApogee).toBe(1000);
    expect(stats.meanPerigee).toBe(750);

    p().debrisResults_ = [];
    expect(p().calcAltitudeStats_().meanApogee).toBe(0);
  });

  it('filterDebrisOnGlobe_ searches the joined sccNums', () => {
    const searchSpy = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().debrisResults_ = [fakeSat({ sccNum: '111' }), fakeSat({ sccNum: '222' })];
    p().filterDebrisOnGlobe_();

    expect(searchSpy).toHaveBeenCalledWith('111,222');
  });

  it('selectEvent_ renders the detail panel and reveals it', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'numSatellites', 'get').mockReturnValue(1);
    ServiceLocator.getCatalogManager().objectCache = [fakeSat({ intlDes: '1999-025A' })] as never;
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().selectEvent_('fengyun1c');

    expect(p().selectedEventId_).toBe('fengyun1c');
    expect(getEl('breakup-analysis-detail')!.style.display).toBe('block');
    expect(getEl('breakup-analysis-event-info')!.innerHTML.length).toBeGreaterThan(0);
    expect(getEl('breakup-analysis-stats')!.innerHTML.length).toBeGreaterThan(0);
  });

  it('selectEvent_ ignores an unknown event id', () => {
    p().selectEvent_('does-not-exist');

    expect(p().selectedEventId_).not.toBe('does-not-exist');
  });

  it('showEventList_ resets selection and shows the list view', () => {
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);
    p().selectedEventId_ = 'fengyun1c';
    p().debrisResults_ = [fakeSat()];

    p().showEventList_();

    expect(p().selectedEventId_).toBeNull();
    expect(p().debrisResults_).toStrictEqual([]);
    expect(getEl('breakup-analysis-event-list')!.style.display).toBe('block');
  });

  it('renderDispersion_ builds a fragment table and wires row selection', () => {
    p().debrisResults_ = [fakeSat({ sccNum: '25730' })];
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(7);
    const selectSpy = vi.spyOn(SelectSatManager.prototype, 'selectSat').mockImplementation(() => undefined as never);

    p().renderDispersion_();

    const row = getEl('breakup-analysis-dispersion')!.querySelector('[data-scc]')!;

    row.querySelector('td')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(selectSpy).toHaveBeenCalledWith(7);
  });
});
