import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { SatInfoBox } from '@app/plugins/select-sat-manager/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType } from 'ootk';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('SatInfoBoxCore_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(SatInfoBox, 'SatInfoBoxCore');

  describe('Clicking Orbit Data Links', () => {
    beforeEach(() => {
      const satInfoBoxCorePlugin = new SatInfoBox();
      websiteInit(satInfoBoxCorePlugin);
      keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
      keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
      keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
      keepTrackApi.getCatalogManager().objectCache = [defaultSat];
      keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
      jest.advanceTimersByTime(1000);
    });

    it('should work when I click all-objects-link', () => {
      expect(() => getEl('all-objects-link').click()).not.toThrow();
    });
    it('should work when I click near-orbits-link', () => {
      expect(() => getEl('near-orbits-link').click()).not.toThrow();
    });
    it('should work when I click near-objects-link1', () => {
      expect(() => getEl('near-objects-link1').click()).not.toThrow();
    });
    it('should work when I click near-objects-link2', () => {
      expect(() => getEl('near-objects-link2').click()).not.toThrow();
    });
    it('should work when I click near-objects-link4', () => {
      expect(() => getEl('near-objects-link4').click()).not.toThrow();
    });
    it('should work when I click sun-angle-link', () => {
      expect(() => getEl('sun-angle-link').click()).not.toThrow();
    });
    it('should work when I click nadir-angle-link', () => {
      expect(() => getEl('nadir-angle-link').click()).not.toThrow();
    });
    it('should work when I click sec-angle-link', () => {
      expect(() => getEl('sec-angle-link').click()).not.toThrow();
    });
  });

  describe('Various Types of Objects', () => {
    beforeEach(() => {
      const satInfoBoxCorePlugin = new SatInfoBox();
      websiteInit(satInfoBoxCorePlugin);
      keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
      keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
      keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    });

    it('should work with no rcs', () => {
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, rcs: null }];
      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();

      keepTrackApi.getCatalogManager().objectCache = [
        { ...defaultSat, rcs: null },
        { ...defaultSat, rcs: '10' },
      ];
      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();

      keepTrackApi.getCatalogManager().objectCache = [
        { ...defaultSat, rcs: null, diameter: '10', span: '10', length: '10', shape: 'sphere' },
        { ...defaultSat, rcs: null },
      ];
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
      keepTrackApi.getSensorManager().currentSensors = [{ ...defaultSensor, lat: null }];

      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with a telescope loaded', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [{ ...defaultSensor, type: SpaceObjectType.OPTICAL }];

      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with a missile', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [defaultSensor];
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, missile: true, desc: 'Fake (F101)' }];

      expect(() => {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with all object typees', () => {
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.UNKNOWN }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.PAYLOAD }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.ROCKET_BODY }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.DEBRIS }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.SPECIAL }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.RADAR_MEASUREMENT }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.RADAR_TRACK }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.RADAR_OBJECT }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, type: SpaceObjectType.STAR }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().objectCache = [{ ...defaultSat, missile: true, desc: 'Fake (F101)', type: SpaceObjectType.BALLISTIC_MISSILE }];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
    });

    it('should work with all intel data', () => {
      const newSat = { ...defaultSat, TTP: 'test', NOTES: 'test', FMISSED: 'test', ORPO: 'test', constellation: 'test', maneuver: 'test', associates: 'test' };
      keepTrackApi.getCatalogManager().objectCache = [newSat];
      expect(() => keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0)).not.toThrow();
    });
  });
});
