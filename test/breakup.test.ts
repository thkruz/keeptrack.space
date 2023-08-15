import { keepTrackApi } from '@app/js/keepTrackApi';
import { Breakup } from '@app/js/plugins/breakup/breakup';
import * as OrbitFinderFile from '@app/js/singletons/orbit-finder';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('Breakup_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
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
        } as any);
      // Mock OrbitFinder class
      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => [defaultSat.TLE1, defaultSat.TLE2],
          } as any)
      );
      expect(() => Breakup.onSubmit()).not.toThrow();
    });
  });
});
