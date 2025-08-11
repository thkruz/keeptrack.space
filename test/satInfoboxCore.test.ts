import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { SatInfoBoxObject } from '@app/plugins/sat-info-box-object/sat-info-box-object';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType } from 'ootk';
import { defaultMisl, defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('SatInfoBoxCore_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox, SatInfoBoxObject]);
    keepTrackApi.emit(KeepTrackApiEvents.uiManagerInit);
    keepTrackApi.emit(KeepTrackApiEvents.uiManagerFinal);
  });

  standardPluginSuite(SatInfoBox, 'SatInfoBoxCore');

  describe('Clicking Orbit Data Links', () => {
    beforeEach(() => {
      const satInfoBoxCorePlugin = new SatInfoBox();

      websiteInit(satInfoBoxCorePlugin);
      keepTrackApi.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
      keepTrackApi.getDotsManager().sizeData = new Int8Array(Array(100).fill(0));
      keepTrackApi.getDotsManager().positionData = new Float32Array(Array(100).fill(0));
      keepTrackApi.getCatalogManager().objectCache = [defaultSat];
      keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
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
      const satInfoBoxCorePlugin = new SatInfoBox();

      websiteInit(satInfoBoxCorePlugin);
      keepTrackApi.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
      keepTrackApi.getDotsManager().sizeData = new Int8Array(Array(100).fill(0));
      keepTrackApi.getDotsManager().positionData = new Float32Array(Array(100).fill(0));
    });

    it('should work with no rcs', () => {
      let sat1 = defaultSat;

      sat1.rcs = null;
      let sat2 = defaultSat;

      keepTrackApi.getCatalogManager().objectCache = [sat1];
      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();

      sat1.rcs = null;
      sat2.rcs = 10;
      keepTrackApi.getCatalogManager().objectCache = [sat1, sat2];
      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
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
      keepTrackApi.getCatalogManager().objectCache = [sat1, sat2];
      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with sensor loaded', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [defaultSensor];

      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with no sensor loaded', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [];

      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with a telescope loaded', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      const sensor = defaultSensor;

      sensor.type = SpaceObjectType.OPTICAL;
      keepTrackApi.getSensorManager().currentSensors = [sensor];

      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with a missile', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [defaultSensor];
      keepTrackApi.getCatalogManager().objectCache = [defaultMisl];

      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with all object typees', () => {
      const sat = defaultSat;

      sat.type = SpaceObjectType.UNKNOWN;
      keepTrackApi.getCatalogManager().objectCache = [sat];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.PAYLOAD;
      keepTrackApi.getCatalogManager().objectCache = [sat];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.ROCKET_BODY;
      keepTrackApi.getCatalogManager().objectCache = [sat];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.DEBRIS;
      keepTrackApi.getCatalogManager().objectCache = [sat];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.SPECIAL;
      keepTrackApi.getCatalogManager().objectCache = [sat];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      sat.type = SpaceObjectType.STAR;
      keepTrackApi.getCatalogManager().objectCache = [sat];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();

      keepTrackApi.getCatalogManager().objectCache = [defaultMisl];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
    });
  });
});
