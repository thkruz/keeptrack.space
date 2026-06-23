import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { keepTrackApi } from '@app/keepTrackApi';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

import { setupStandardEnvironment } from '@test/environment/standard-env';

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

  it.skip('should handle sensorListContentClick with valid sensor group', () => {
    const mockSetSensor = vi.fn();

    vi.spyOn(keepTrackApi, 'getSensorManager').mockReturnValue({
      clearSecondarySensors: vi.fn(),
      setSensor: mockSetSensor,
    } as any);

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

  it.skip('should throw error if no sensors are found in createSensorRow_', () => {
    expect(() => {
      (SensorListPlugin as unknown as { createSensorRow_: (sensor: DetailedSensor) => void }).createSensorRow_({} as DetailedSensor);
    }).toThrow('No sensors found');
  });
});
