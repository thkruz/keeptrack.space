/* eslint-disable @typescript-eslint/no-explicit-any */
import { keepTrackApi } from '@app/keepTrackApi';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { DetailedSensor } from '@ootk/src/main';

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
    expect(plugin.sideMenuElementHtml).toContain('<ul id="list-of-sensors">');
  });

  it.skip('should handle sensorListContentClick with valid sensor group', () => {
    const mockSetSensor = jest.fn();

    jest.spyOn(keepTrackApi, 'getSensorManager').mockReturnValue({
      clearSecondarySensors: jest.fn(),
      setSensor: mockSetSensor,
    } as any);

    plugin.sensorListContentClick('validSensorGroup');

    expect(mockSetSensor).toHaveBeenCalledWith('validSensorGroup');
  });

  it('should handle sensorListContentClick with invalid sensor group', () => {
    const mockSetSensor = jest.fn();

    jest.spyOn(keepTrackApi, 'getSensorManager').mockReturnValue({
      clearSecondarySensors: jest.fn(),
      setSensor: mockSetSensor,
    } as any);

    plugin.sensorListContentClick('invalidSensorGroup');

    expect(mockSetSensor).not.toHaveBeenCalled();
  });

  it.skip('should throw error if no sensors are found in createLiForSensor_', () => {
    expect(() => {
      SensorListPlugin.createLiForSensor_({} as DetailedSensor);
    }).toThrow('No sensors found');
  });
});
