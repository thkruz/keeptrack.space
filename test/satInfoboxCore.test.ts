import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBoxObject } from '@app/plugins/sat-info-box-object/sat-info-box-object';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType } from '@ootk/src/main';
import { defaultMisl, defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';

describe('SatInfoBoxCore_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
  });

  standardPluginSuite(SatInfoBox, 'SatInfoBoxCore');

  describe('Clicking Orbit Data Links', () => {
    beforeEach(() => {
      ServiceLocator.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
      ServiceLocator.getDotsManager().sizeData = new Int8Array(Array(100).fill(0));
      ServiceLocator.getDotsManager().positionData = new Float32Array(Array(100).fill(0));
      ServiceLocator.getCatalogManager().objectCache = [defaultSat];
      PluginRegistry.getPlugin(SelectSatManager)!.selectSat(0);
      jest.advanceTimersByTime(1000);
    });

    it.skip('should work when I click all-objects-link', () => {
      expect(() => getEl('all-objects-link')!.click()).not.toThrow();
    });
    it.skip('should work when I click near-orbits-link', () => {
      expect(() => getEl('near-orbits-link')!.click()).not.toThrow();
    });
    it.skip('should work when I click near-objects-link1', () => {
      expect(() => getEl('near-objects-link1')!.click()).not.toThrow();
    });
    it.skip('should work when I click near-objects-link2', () => {
      expect(() => getEl('near-objects-link2')!.click()).not.toThrow();
    });
    it.skip('should work when I click near-objects-link4', () => {
      expect(() => getEl('near-objects-link4')!.click()).not.toThrow();
    });
    it.skip('should work when I click sun-angle-link', () => {
      expect(() => getEl('sun-angle-link')!.click()).not.toThrow();
    });
    it.skip('should work when I click nadir-angle-link', () => {
      expect(() => getEl('nadir-angle-link')!.click()).not.toThrow();
    });
    it.skip('should work when I click sec-angle-link', () => {
      expect(() => getEl('sec-angle-link')!.click()).not.toThrow();
    });
  });

  describe('Various Types of Objects', () => {
    beforeEach(() => {
      setupStandardEnvironment([SelectSatManager, SatInfoBox, SatInfoBoxObject]);
      ServiceLocator.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
      ServiceLocator.getDotsManager().sizeData = new Int8Array(Array(100).fill(0));
      ServiceLocator.getDotsManager().positionData = new Float32Array(Array(100).fill(0));
    });

    it('should work with no rcs', () => {
      let sat1 = defaultSat;

      sat1.rcs = null;
      let sat2 = defaultSat;

      ServiceLocator.getCatalogManager().objectCache = [sat1];
      expect(() => {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();

      sat1.rcs = null;
      sat2.rcs = 10;
      ServiceLocator.getCatalogManager().objectCache = [sat1, sat2];
      expect(() => {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();

      sat1 = defaultSat;
      sat1.rcs = null;
      sat1.diameter = '10';
      sat1.span = '10';
      sat1.length = '10';
      sat1.shape = 'sphere';
      sat2 = defaultSat;
      sat2.rcs = null;
      ServiceLocator.getCatalogManager().objectCache = [sat1, sat2];
      expect(() => {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with sensor loaded', () => {
      ServiceLocator.getCatalogManager().isSensorManagerLoaded = true;
      ServiceLocator.getSensorManager().currentSensors = [defaultSensor];

      expect(() => {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with no sensor loaded', () => {
      ServiceLocator.getCatalogManager().isSensorManagerLoaded = true;
      ServiceLocator.getSensorManager().currentSensors = [];

      expect(() => {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with a telescope loaded', () => {
      ServiceLocator.getCatalogManager().isSensorManagerLoaded = true;
      const sensor = defaultSensor;

      sensor.type = SpaceObjectType.OPTICAL;
      ServiceLocator.getSensorManager().currentSensors = [sensor];

      expect(() => {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with a missile', () => {
      ServiceLocator.getCatalogManager().isSensorManagerLoaded = true;
      ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
      ServiceLocator.getCatalogManager().objectCache = [defaultMisl];

      expect(() => {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with all object typees', () => {
      const sat = defaultSat;

      sat.type = SpaceObjectType.UNKNOWN;
      ServiceLocator.getCatalogManager().objectCache = [sat];
      expect(() => PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.PAYLOAD;
      ServiceLocator.getCatalogManager().objectCache = [sat];
      expect(() => PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.ROCKET_BODY;
      ServiceLocator.getCatalogManager().objectCache = [sat];
      expect(() => PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.DEBRIS;
      ServiceLocator.getCatalogManager().objectCache = [sat];
      expect(() => PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.SPECIAL;
      ServiceLocator.getCatalogManager().objectCache = [sat];
      expect(() => PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.STAR;
      ServiceLocator.getCatalogManager().objectCache = [sat];
      expect(() => PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();

      ServiceLocator.getCatalogManager().objectCache = [defaultMisl];
      expect(() => PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
    });
  });
});
