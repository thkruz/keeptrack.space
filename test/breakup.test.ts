/* eslint-disable dot-notation */
import * as OrbitFinderFile from '@app/app/analysis/orbit-finder';
import { Breakup } from '@app/plugins/breakup/breakup';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
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
      // Mock OrbitFinder class
      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          }) as OrbitFinderFile.OrbitFinder,
      );
      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });
  });
});
