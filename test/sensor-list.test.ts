/* eslint-disable @typescript-eslint/no-explicit-any */
import { sensors } from '@app/catalogs/sensors';
import { keepTrackApi } from '@app/keepTrackApi';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { PersistenceManager } from '@app/singletons/persistence-manager';
import { DetailedSensor } from 'ootk';

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

  it('should reload last sensor if data exists', () => {
    const mockSetSensor = jest.fn();

    jest.spyOn(PersistenceManager.getInstance(), 'getItem').mockReturnValue(
      JSON.stringify([{ objName: 'sensor1' }, 'sensorId']),
    );
    jest.spyOn(keepTrackApi, 'getSensorManager').mockReturnValue({
      setSensor: mockSetSensor,
    } as any);

    SensorListPlugin.reloadLastSensor_();

    expect(mockSetSensor).toHaveBeenCalledWith(sensors.sensor1, 'sensorId');
  });

  it('should not reload last sensor if no data exists', () => {
    const mockSetSensor = jest.fn();

    jest.spyOn(PersistenceManager.getInstance(), 'getItem').mockReturnValue(null);
    jest.spyOn(keepTrackApi, 'getSensorManager').mockReturnValue({
      setSensor: mockSetSensor,
    } as any);

    SensorListPlugin.reloadLastSensor_();

    expect(mockSetSensor).not.toHaveBeenCalled();
  });
});
