import { CUSTOM_SENSOR_DEFAULT_NAME, formatCustomSensorLocation, isCustomSensor, resolveCustomSensorName } from '@app/app/sensors/custom-sensor-identity';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorManager } from '@app/app/sensors/sensorManager';
import { KeepTrack } from '@app/keeptrack';
import { buildCustomSensorParams, CustomSensorFormValues } from '@app/plugins/sensor/custom-sensor-core';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const DENVER: CustomSensorFormValues = {
  uiName: 'Denver imaging',
  type: 'Optical',
  lat: 39.7392,
  lon: -104.9903,
  alt: 1.6,
  minAz: 0,
  maxAz: 360,
  minEl: 10,
  maxEl: 90,
  minRng: 0,
  maxRng: 50000,
};

describe('custom sensor display name', () => {
  let mgr: SensorManager;

  beforeEach(() => {
    setupStandardEnvironment();
    (KeepTrack.getInstance().containerRoot as HTMLDivElement).innerHTML = `
      <div id="sensor-info-title"></div>
      <div id="sensor-type"></div>
      <div id="sensor-country"></div>
    `;
    mgr = new SensorManager();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(mgr as any, 'updatePositionCruncher_').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('carries the typed name onto the DetailedSensor', () => {
    const sensor = new DetailedSensor(buildCustomSensorParams(DENVER, 'abc123'));

    expect(sensor.name).toBe('Denver imaging');
    expect(sensor.uiName).toBe('Denver imaging');
    expect(sensor.isCustomSensor).toBe(true);
    expect(sensor.objName).toBe('Custom Sensor-abc123');
    expect(sensor.country).toBe('39.739°N, 104.990°W');
    expect(sensor.clone().isCustomSensor).toBe(true);
  });

  it('falls back to "Custom Sensor" when the name is left empty', () => {
    expect(new DetailedSensor(buildCustomSensorParams({ ...DENVER, uiName: '   ' }, 'x')).name).toBe(CUSTOM_SENSOR_DEFAULT_NAME);
    expect(resolveCustomSensorName(undefined)).toBe(CUSTOM_SENSOR_DEFAULT_NAME);
  });

  it('shows the typed name in sensor-info-title and the sensor title', async () => {
    const sensor = new DetailedSensor(buildCustomSensorParams(DENVER, 'abc123'));

    mgr.setSensor(sensor);

    expect(mgr.currentSensors).toStrictEqual([sensor]);
    expect(mgr.sensorTitle).toBe('Denver imaging');
    expect(document.getElementById('sensor-info-title')?.textContent).toBe('Denver imaging');
    // setInnerHtml writes on idle
    await vi.waitFor(() => expect(document.getElementById('sensor-country')?.textContent).toBe('39.739°N, 104.990°W'));
  });

  it('never parses markup in a typed name', () => {
    const sensor = new DetailedSensor(buildCustomSensorParams({ ...DENVER, uiName: '<img src=x onerror=alert(1)>' }, 'abc123'));

    mgr.setSensor(sensor);

    expect(document.querySelector('#sensor-info-title img')).toBeNull();
    expect(document.getElementById('sensor-info-title')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('still recognises a renamed custom sensor as custom', () => {
    const sensor = new DetailedSensor(buildCustomSensorParams(DENVER, 'abc123'));
    const reset = vi.spyOn(mgr, 'resetSensorSelected').mockImplementation(() => undefined);

    expect(isCustomSensor(sensor)).toBe(true);
    expect(isCustomSensor(defaultSensor)).toBe(false);

    mgr.currentSensors = [sensor];
    mgr.clearSecondarySensors();

    expect(reset).toHaveBeenCalled();
  });

  it('recognises legacy custom sensors without the flag', () => {
    expect(isCustomSensor({ objName: 'Custom Sensor-legacy', name: 'Old name' })).toBe(true);
    expect(isCustomSensor({ objName: 'Custom Sensor', name: 'Custom Sensor' })).toBe(true);
    expect(isCustomSensor(null)).toBe(false);
  });

  it('formats the location line', () => {
    expect(formatCustomSensorLocation(-33.5, 151.25)).toBe('33.500°S, 151.250°E');
    expect(formatCustomSensorLocation(Number.NaN, 0)).toBe('Custom location');
  });
});
