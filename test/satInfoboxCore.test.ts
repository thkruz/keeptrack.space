import { keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { SpaceObjectType } from '@app/js/lib/space-object-type';
import { SatInfoBoxCore } from '@app/js/plugins/select-sat-manager/satInfoboxCore';
import { SelectSatManager } from '@app/js/plugins/select-sat-manager/select-sat-manager';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('SatInfoBoxCore_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(SatInfoBoxCore, 'SatInfoBoxCore');

  describe('Clicking Orbit Data Links', () => {
    beforeEach(() => {
      const satInfoBoxCorePlugin = new SatInfoBoxCore();
      websiteInit(satInfoBoxCorePlugin);
      keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
      keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
      keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
      keepTrackApi.getCatalogManager().satData = [defaultSat];
      (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0);
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
      const satInfoBoxCorePlugin = new SatInfoBoxCore();
      websiteInit(satInfoBoxCorePlugin);
      keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
      keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
      keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    });

    it('should work with no rcs', () => {
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, rcs: null }];
      expect(() => {
        (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();

      keepTrackApi.getCatalogManager().satData = [
        { ...defaultSat, rcs: null },
        { ...defaultSat, rcs: '10' },
      ];
      expect(() => {
        (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();

      keepTrackApi.getCatalogManager().satData = [
        { ...defaultSat, rcs: null, diameter: '10', span: '10', length: '10', shape: 'sphere' },
        { ...defaultSat, rcs: null },
      ];
      expect(() => {
        (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with sensor loaded', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [defaultSensor];

      expect(() => {
        (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with no sensor loaded', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [{ ...defaultSensor, lat: null }];

      expect(() => {
        (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with a telescope loaded', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [{ ...defaultSensor, type: SpaceObjectType.OPTICAL }];

      expect(() => {
        (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with a missile', () => {
      keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
      keepTrackApi.getSensorManager().currentSensors = [defaultSensor];
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, missile: true, desc: 'Fake (F101)' }];

      expect(() => {
        (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0);
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should work with all object typees', () => {
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.UNKNOWN }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.PAYLOAD }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.ROCKET_BODY }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.DEBRIS }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.SPECIAL }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.RADAR_MEASUREMENT }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.RADAR_TRACK }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.RADAR_OBJECT }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, type: SpaceObjectType.STAR }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
      keepTrackApi.getCatalogManager().satData = [{ ...defaultSat, missile: true, desc: 'Fake (F101)', type: SpaceObjectType.BALLISTIC_MISSILE }];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
    });

    it('should work with all intel data', () => {
      const newSat = { ...defaultSat, TTP: 'test', NOTES: 'test', FMISSED: 'test', ORPO: 'test', constellation: 'test', maneuver: 'test', associates: 'test' };
      keepTrackApi.getCatalogManager().satData = [newSat];
      expect(() => (<SelectSatManager>keepTrackApi.getPlugin(SelectSatManager)).selectSat(0)).not.toThrow();
    });
  });
});
