/* eslint-disable dot-notation */
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SensorTimeline } from '@app/plugins/timeline-sensor/sensor-timeline';
import { DetailedSatellite, DetailedSensor, Hours } from '@ootk/src/main';
import { setupStandardEnvironment } from '../environment/standard-env';
import { websiteInit } from '../generic-tests';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

describe('SensorTimeline Weather Integration', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    window.M.AutoInit = jest.fn();
  });

  it('should correctly calculate passes and integrate weather data', async () => {
    const sensorTimelinePlugin = new SensorTimeline();

    websiteInit(sensorTimelinePlugin);

    // Load fetchWeatherApiMock.json
    const weatherDataOutput = (await import('./weatherDataOutput.json')).default;
    const selectedSat = await import('./selectedSat.json');
    const { default: enabledSensors } = await import('./enabledSensors.json');

    for (let i = 0; i < enabledSensors.length; i++) {
      sensorTimelinePlugin['enabledSensors_'].push(new DetailedSensor({ ...enabledSensors[i] } as unknown as DetailedSensor));
    }

    ServiceLocator.getCatalogManager().objectCache[0] = new DetailedSatellite({
      ...selectedSat,
    } as unknown as DetailedSatellite);

    sensorTimelinePlugin['getWeather_'] = jest.fn().mockResolvedValue(weatherDataOutput);
    ServiceLocator.getTimeManager().getOffsetTimeObj = jest.fn().mockReturnValue(new Date(1745200420463));
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
    sensorTimelinePlugin.isMenuButtonActive = true;
    sensorTimelinePlugin['lengthOfLookAngles_'] = 24 as Hours;
    sensorTimelinePlugin['detailedPlot'] = true;
    // Convert each object's 'hourly' array from strings to Dates
    if (Array.isArray(weatherDataOutput)) {
      for (let j = 0; j < weatherDataOutput.length; j++) {
        const obj = weatherDataOutput[j];

        if (Array.isArray(obj.hourly)) {
          for (let k = 0; k < obj.hourly.length; k++) {
            (obj.hourly as (string | Date)[])[k] = new Date(obj.hourly[k]);
          }
        }
      }
    }

    sensorTimelinePlugin['getWeather_'] = jest.fn().mockResolvedValue(weatherDataOutput);
    sensorTimelinePlugin['drawEmptyPlot_'] = jest.fn();
    // Mock this.ctx_
    sensorTimelinePlugin['ctx_'] = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    // This is going error and get caught bercause we aren't mocking the 2D context well
    errorManagerInstance.info = jest.fn();
    await expect(sensorTimelinePlugin.updateTimeline()).resolves.not.toThrow();

    // Check to see if errorManagerInstance.info was run
    expect(errorManagerInstance.info).toHaveBeenCalledTimes(0);

    const calculatedPasses = await sensorTimelinePlugin['calculatePasses_']();

    // Snapshot the output of calculatePasses_
    expect(calculatedPasses).toMatchSnapshot();
  });
});
