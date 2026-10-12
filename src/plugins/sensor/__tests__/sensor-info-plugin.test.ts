import { DetailedSensor, DetailedSensorParams } from '@app/app/sensors/DetailedSensor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { Degrees, Kilometers, SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SensorInfoPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  it('constructs without throwing', () => {
    expect(() => new SensorInfoPlugin()).not.toThrow();
  });

  standardPluginSuite(SensorInfoPlugin);
  standardPluginMenuButtonTests(SensorInfoPlugin);
  standardClickTests(SensorInfoPlugin);
});

describe('SensorInfoPlugin mask and source rows', () => {
  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  const station = (over: Partial<DetailedSensorParams> = {}) =>
    new DetailedSensor({
      objName: 'KSAT-SVALBARD',
      uiName: 'Svalbard (SvalSat)',
      lat: 78.2298 as Degrees,
      lon: 15.4078 as Degrees,
      alt: 0.45 as Kilometers,
      type: SpaceObjectType.GROUND_SENSOR_STATION,
      minEl: 5 as Degrees,
      ...over,
    });

  it('shows the point count and the cited source for a masked station preset', () => {
    const plugin = new SensorInfoPlugin();

    websiteInit(plugin);
    ServiceLocator.getSensorManager().currentSensors = [
      station({
        sourceUrl: 'https://www.wikidata.org/wiki/Q1796135',
        sourceRetrieved: '2026-09-19',
        interpolateMask: true,
        elevationMasks: [0, 120, 240].map((az) => ({ startAz: az as Degrees, stopAz: az as Degrees, minEl: 8 as Degrees })),
      }),
    ];

    plugin.getSensorInfo();

    expect(getEl('sensor-mask')!.textContent).toBe('3 points');
    expect(getEl('sensor-mask-row')!.style.display).toBe('block');

    const link = getEl('sensor-source')!.querySelector('a')!;

    expect(link.href).toBe('https://www.wikidata.org/wiki/Q1796135');
    expect(link.textContent).toBe('www.wikidata.org');
    expect(link.rel).toBe('noopener noreferrer');
    expect(getEl('sensor-source')!.textContent).toBe('www.wikidata.org, retrieved 2026-09-19');
  });

  it('hides both rows for an unmasked, uncited sensor', () => {
    const plugin = new SensorInfoPlugin();

    websiteInit(plugin);
    ServiceLocator.getSensorManager().currentSensors = [station()];

    plugin.getSensorInfo();

    expect(getEl('sensor-mask-row')!.style.display).toBe('none');
    expect(getEl('sensor-source-row')!.style.display).toBe('none');
  });

  it('refuses a non-https source link', () => {
    const plugin = new SensorInfoPlugin();

    websiteInit(plugin);
    ServiceLocator.getSensorManager().currentSensors = [station({ sourceUrl: 'javascript:alert(1)' })];

    plugin.getSensorInfo();

    expect(getEl('sensor-source')!.querySelector('a')).toBeNull();
    expect(getEl('sensor-source-row')!.style.display).toBe('none');
  });
});
