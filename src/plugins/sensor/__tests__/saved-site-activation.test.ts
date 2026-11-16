import { ServiceLocator } from '@app/engine/core/service-locator';
import { saveSites } from '@app/plugins/sensor/custom-site-registry';
import { findActiveSiteSensor, getSavedSiteRows, getSavedSiteState, makeSavedSiteCurrent } from '@app/plugins/sensor/saved-site-activation';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';
import { makeSiteSource, mockPersistence } from './saved-site-test-utils';

describe('saved site activation (make a saved site current)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sm: any;

  beforeEach(() => {
    setupStandardEnvironment([]);
    mockPersistence();
    sm = ServiceLocator.getSensorManager();
    sm.currentSensors = [];
    sm.secondarySensors = [];
    saveSites([makeSiteSource('Custom Sensor-aaa', 'RIDGE', 40), makeSiteSource('Custom Sensor-bbb', 'COAST', 41), makeSiteSource('Custom Sensor-ccc', 'COAST', 42)]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('reports saved, active and current separately', () => {
    expect(getSavedSiteRows().map((r) => r.state)).toEqual(['saved', 'saved', 'saved']);

    makeSavedSiteCurrent('Custom Sensor-aaa');
    makeSavedSiteCurrent('Custom Sensor-bbb');

    expect(getSavedSiteState('Custom Sensor-bbb')).toBe('current');
    expect(getSavedSiteState('Custom Sensor-aaa')).toBe('active');
    expect(getSavedSiteState('Custom Sensor-ccc')).toBe('saved');
  });

  it('builds a saved but inactive site from the registry and makes it the primary sensor', () => {
    const sensor = makeSavedSiteCurrent('Custom Sensor-bbb');

    expect(sensor?.objName).toBe('Custom Sensor-bbb');
    expect(sensor?.isCustomSensor).toBe(true);
    expect(sensor?.lat).toBeCloseTo(41, 6);
    expect(sm.currentSensors[0]).toBe(sensor);
  });

  it('keeps the previous custom primary as a secondary instead of discarding it', () => {
    makeSavedSiteCurrent('Custom Sensor-aaa');
    makeSavedSiteCurrent('Custom Sensor-bbb');

    expect(sm.currentSensors.map((s: { objName: string }) => s.objName)).toEqual(['Custom Sensor-bbb']);
    expect(sm.secondarySensors.map((s: { objName: string }) => s.objName)).toEqual(['Custom Sensor-aaa']);
  });

  it('promotes an active secondary without creating a duplicate sensor', () => {
    makeSavedSiteCurrent('Custom Sensor-aaa');
    makeSavedSiteCurrent('Custom Sensor-bbb');
    const secondary = findActiveSiteSensor('Custom Sensor-aaa');

    makeSavedSiteCurrent('Custom Sensor-aaa');

    expect(sm.currentSensors[0]).toBe(secondary);
    expect(sm.secondarySensors.map((s: { objName: string }) => s.objName)).toEqual(['Custom Sensor-bbb']);
    expect([...sm.currentSensors, ...sm.secondarySensors]).toHaveLength(2);
  });

  it('is a no-op when the site is already current', () => {
    const first = makeSavedSiteCurrent('Custom Sensor-aaa');
    const spy = vi.spyOn(sm, 'addSecondarySensor');

    expect(makeSavedSiteCurrent('Custom Sensor-aaa')).toBe(first);
    expect(spy).not.toHaveBeenCalled();
  });

  it('replaces a catalog primary but never touches same-named sites with other ids', () => {
    sm.currentSensors = [{ objName: 'EGLAFB', isSensor: () => true }];

    makeSavedSiteCurrent('Custom Sensor-bbb');

    expect(sm.currentSensors[0].objName).toBe('Custom Sensor-bbb');
    expect(sm.secondarySensors).toHaveLength(0);
    expect(getSavedSiteState('Custom Sensor-ccc')).toBe('saved');
  });

  it('returns null for an id that is not saved', () => {
    expect(makeSavedSiteCurrent('Custom Sensor-zzz')).toBeNull();
    expect(sm.currentSensors).toHaveLength(0);
  });
});
