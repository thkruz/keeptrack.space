import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import { RfSensor } from '@app/app/sensors/DetailedSensor';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import * as isThisNodeModule from '@app/engine/utils/isThisNode';
import { KeepTrack } from '@app/keeptrack';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxSensor } from '@app/plugins/sat-info-box-sensor/sat-info-box-sensor';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees, Kilometers, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/**
 * Helper to set up the test environment with a sensor and satellite selected,
 * bypassing the real sensor-database lookup inside setSensor().
 */
const setupSensorAndSat = (sensor: RfSensor) => {
  // Directly set currentSensors to avoid sensor-database lookup
  ServiceLocator.getSensorManager().currentSensors = [sensor];
  standardSelectSat();
  KeepTrack.getInstance().isInitialized = true;
};

/** Triggers a per-frame update so Sun status gets recalculated. */
const triggerFrameUpdate = () => {
  EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat);
};

describe('SatInfoBoxSensor', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  it('does not throw when updateSelectBox fires before the sensor DOM is created', () => {
    const plugin = new SatInfoBoxSensor();

    plugin.init();
    KeepTrack.getInstance().isInitialized = true;
    // Simulate browser behavior: getEl returns null instead of throwing in test mode
    const isThisNodeSpy = vi.spyOn(isThisNodeModule, 'isThisNode').mockReturnValue(false);

    // Sanity: section element should not be in DOM yet
    expect(getEl('sat-range', true)).toBeNull();

    expect(() => EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat)).not.toThrow();

    isThisNodeSpy.mockRestore();
  });

  describe('Sun status field', () => {
    it('should update the Sun field from its placeholder when a sensor and satellite are selected', () => {
      const plugin = new SatInfoBoxSensor();

      websiteInit(plugin);

      const mockSunEci: TemeVec3 = { x: 100000 as Kilometers, y: 100000 as Kilometers, z: 0 as Kilometers };

      ServiceLocator.getScene().sun.eci = mockSunEci;
      vi.spyOn(SatMath, 'calculateIsInSun').mockReturnValue(SunStatus.SUN);

      setupSensorAndSat(defaultSensor);
      triggerFrameUpdate();

      const sunEl = getEl('sat-sun');

      expect(sunEl).toBeDefined();
      expect(sunEl!.innerHTML).not.toBe('-');
    });

    it('should update the Sun field on per-frame updateSelectBox event', () => {
      const plugin = new SatInfoBoxSensor();

      websiteInit(plugin);

      const mockSunEci: TemeVec3 = { x: 100000 as Kilometers, y: 100000 as Kilometers, z: 0 as Kilometers };

      ServiceLocator.getScene().sun.eci = mockSunEci;
      vi.spyOn(SatMath, 'calculateIsInSun').mockReturnValue(SunStatus.UMBRAL);

      setupSensorAndSat(defaultSensor);
      triggerFrameUpdate();

      const sunEl = getEl('sat-sun');

      expect(sunEl).toBeDefined();
      expect(sunEl!.innerHTML).not.toBe('-');
    });

    it('should show No Effect for radar sensors', () => {
      const plugin = new SatInfoBoxSensor();

      websiteInit(plugin);

      // defaultSensor is PHASED_ARRAY_RADAR - sun has no effect on radar
      setupSensorAndSat(defaultSensor);
      triggerFrameUpdate();

      const sunEl = getEl('sat-sun');

      expect(sunEl).toBeDefined();
      expect(sunEl!.innerHTML).toBe('No Effect');
    });

    it('should update Sun field immediately when sensor is selected after satellite', () => {
      const plugin = new SatInfoBoxSensor();

      websiteInit(plugin);
      KeepTrack.getInstance().isInitialized = true;

      // Manually set satellite selection state (selectSat throws in test env)
      const selectSatManager = PluginRegistry.getPlugin(SelectSatManager)!;

      ServiceLocator.getCatalogManager().objectCache = [defaultSat];
      selectSatManager.selectedSat = 0;
      selectSatManager.primarySatObj = defaultSat;

      const sunEl = getEl('sat-sun');

      expect(sunEl).toBeDefined();

      const sectionEl = getEl('sensor-sat-info');

      expect(sectionEl).toBeDefined();

      // Now select a sensor - Sun field should update immediately via updateSensorVisibility_
      ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
      EventBus.getInstance().emit(EventBusEvent.setSensor, defaultSensor, 0);

      // Section should now be visible
      expect(sectionEl!.style.display).not.toBe('none');
      // Sun field should NOT show the placeholder - it should be updated immediately
      expect(sunEl!.innerHTML).not.toBe('-');
    });

    it('should show sun illumination status for optical sensors', () => {
      const plugin = new SatInfoBoxSensor();

      websiteInit(plugin);

      const mockSunEci: TemeVec3 = { x: 100000 as Kilometers, y: 100000 as Kilometers, z: 0 as Kilometers };

      ServiceLocator.getScene().sun.eci = mockSunEci;
      vi.spyOn(SatMath, 'calculateIsInSun').mockReturnValue(SunStatus.SUN);

      // Create an optical sensor variant
      const opticalSensor = new RfSensor({
        ...defaultSensor,
        type: SpaceObjectType.OPTICAL,
        lat: defaultSensor.lat as Degrees,
        lon: defaultSensor.lon as Degrees,
        alt: defaultSensor.alt as Kilometers,
        minAz: defaultSensor.minAz as Degrees,
        maxAz: defaultSensor.maxAz as Degrees,
        minEl: defaultSensor.minEl as Degrees,
        maxEl: defaultSensor.maxEl as Degrees,
        minRng: defaultSensor.minRng as Kilometers,
        maxRng: defaultSensor.maxRng as Kilometers,
      });

      setupSensorAndSat(opticalSensor);
      triggerFrameUpdate();

      const sunEl = getEl('sat-sun');

      expect(sunEl).toBeDefined();
      // For optical sensors during nighttime, should show the computed sun status
      expect(sunEl!.innerHTML).not.toBe('-');
    });
  });
});
