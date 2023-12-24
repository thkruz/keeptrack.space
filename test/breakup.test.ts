import { keepTrackApi } from '@app/keepTrackApi';
import { Breakup } from '@app/plugins/breakup/breakup';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import * as OrbitFinderFile from '@app/singletons/orbit-finder';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('Breakup_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    window.M.AutoInit = jest.fn();
  });

  standardPluginSuite(Breakup, 'Breakup');
  standardPluginMenuButtonTests(Breakup, 'Breakup');

  describe('onSubmit', () => {
    it('should call the onSubmit method on the Breakup instance', () => {
      const breakupPlugin = new Breakup();
      websiteInit(breakupPlugin);
      standardSelectSat();
      keepTrackApi.getCatalogManager = () =>
        ({
          getSat: () => defaultSat,
          getIdFromObjNum: () => 0,
          satCruncher: {
            postMessage: jest.fn(),
          },
        }) as any;
      // Mock OrbitFinder class
      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => [defaultSat.TLE1, defaultSat.TLE2],
          }) as any
      );
      expect(() => breakupPlugin.onSubmit_()).not.toThrow();
    });
  });
});
