import { ServiceLocator } from '@app/engine/core/service-locator';
import { getSavedSites, saveSites } from '@app/plugins/sensor/custom-site-registry';
import { activateSavedSite, deactivateSavedSite, getSavedSiteState, makeSavedSiteCurrent } from '@app/plugins/sensor/saved-site-activation';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';
import { makeSiteSource, mockPersistence } from './saved-site-test-utils';

describe('several saved sites active at once', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sm: any;

  beforeEach(() => {
    setupStandardEnvironment([]);
    mockPersistence();
    sm = ServiceLocator.getSensorManager();
    sm.currentSensors = [];
    sm.secondarySensors = [];
    saveSites([makeSiteSource('Custom Sensor-aaa', 'RIDGE', 40), makeSiteSource('Custom Sensor-bbb', 'COAST', 41)]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('activating a second site keeps the current one and adds a secondary', () => {
    makeSavedSiteCurrent('Custom Sensor-aaa');

    const sensor = activateSavedSite('Custom Sensor-bbb');

    expect(sensor?.objName).toBe('Custom Sensor-bbb');
    expect(sm.currentSensors[0].objName).toBe('Custom Sensor-aaa');
    expect(sm.secondarySensors.map((s: { objName: string }) => s.objName)).toEqual(['Custom Sensor-bbb']);
    expect(getSavedSiteState('Custom Sensor-bbb')).toBe('active');
  });

  it('activating twice does not duplicate, and an unknown id returns null', () => {
    makeSavedSiteCurrent('Custom Sensor-aaa');
    const first = activateSavedSite('Custom Sensor-bbb');

    expect(activateSavedSite('Custom Sensor-bbb')).toBe(first);
    expect(sm.secondarySensors).toHaveLength(1);
    expect(activateSavedSite('nope')).toBeNull();
  });

  it('deactivating removes the active sensor but keeps the saved definition', () => {
    makeSavedSiteCurrent('Custom Sensor-aaa');
    activateSavedSite('Custom Sensor-bbb');

    expect(deactivateSavedSite('Custom Sensor-bbb')).toBe(true);
    expect(sm.secondarySensors).toHaveLength(0);
    expect(getSavedSiteState('Custom Sensor-bbb')).toBe('saved');
    expect(getSavedSites().map((s) => s.id)).toEqual(['Custom Sensor-aaa', 'Custom Sensor-bbb']);
    expect(deactivateSavedSite('Custom Sensor-bbb')).toBe(false);
  });
});
