import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { keepTrackApi } from '@app/keepTrackApi';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SensorListPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SensorListPlugin, 'SensorListPlugin');
  standardPluginMenuButtonTests(SensorListPlugin, 'SensorListPlugin');
  standardClickTests(SensorListPlugin);
  standardChangeTests(SensorListPlugin);
});

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('SensorListPlugin', () => {
  let plugin: SensorListPlugin;

  beforeEach(() => {
    plugin = new SensorListPlugin();
  });

  it('should initialize with correct id and dependencies', () => {
    expect(plugin.id).toBe('SensorListPlugin');
    expect(plugin.dependencies_).toEqual([DateTimeManager.name]);
  });

  it('should set drag options correctly', () => {
    expect(plugin.dragOptions).toEqual({
      isDraggable: true,
      minWidth: 550,
      maxWidth: 800,
    });
  });

  it('should generate correct side menu HTML', () => {
    expect(plugin.sideMenuElementHtml).toContain('<div id="sensor-list-menu"');
    expect(plugin.sideMenuElementHtml).toContain('kt-ui-v13');
    expect(plugin.sideMenuElementHtml).toContain('<div id="list-of-sensors">');
  });

  it('should handle sensorListContentClick with valid sensor group', () => {
    const mockSetSensor = vi.fn();

    vi.spyOn(ServiceLocator, 'getSensorManager').mockReturnValue({
      clearSecondarySensors: vi.fn(),
      setSensor: mockSetSensor,
      currentSensors: [],
    } as any);
    plugin.isMenuButtonActive = true;
    (plugin as any).sensorGroups_ = [{ name: 'validSensorGroup' }];
    vi.spyOn(keepTrackApi, 'getMainCamera').mockReturnValue({ lookAtLatLon: vi.fn() } as any);

    plugin.sensorListContentClick('validSensorGroup');

    expect(mockSetSensor).toHaveBeenCalledWith('validSensorGroup');
  });

  it('should handle sensorListContentClick with invalid sensor group', () => {
    const mockSetSensor = vi.fn();

    vi.spyOn(keepTrackApi, 'getSensorManager').mockReturnValue({
      clearSecondarySensors: vi.fn(),
      setSensor: mockSetSensor,
    } as any);

    plugin.sensorListContentClick('invalidSensorGroup');

    expect(mockSetSensor).not.toHaveBeenCalled();
  });

  it('should render placeholder text for a sensor with no data in createSensorRow_', () => {
    const html = (SensorListPlugin as unknown as { createSensorRow_: (sensor: DetailedSensor) => string }).createSensorRow_({} as DetailedSensor);

    expect(html).toContain('data-sensor="Missing Data"');
  });
});
