/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import * as OrbitFinderFile from '@app/app/analysis/orbit-finder';
import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Kilometers } from '@app/engine/ootk/src/main';
import { Breakup } from '@app/plugins/breakup/breakup';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

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

    it('should handle non-satellite objects in onBottomIconClick', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      jest.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue({
        isSatellite: () => false,
      } as any);

      const closeSpy = jest.spyOn(breakupPlugin, 'closeSideMenu');

      breakupPlugin.onBottomIconClick();

      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should handle non-circular orbits in onBottomIconClick', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      const mockSat = {
        isSatellite: () => true,
        apogee: 2000,
        perigee: 500,
      };

      jest.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue(mockSat as any);
      const closeSpy = jest.spyOn(breakupPlugin, 'closeSideMenu');
      const disableSpy = jest.spyOn(breakupPlugin, 'setBottomIconToDisabled');

      breakupPlugin.onBottomIconClick();

      expect(closeSpy).toHaveBeenCalled();
      expect(disableSpy).toHaveBeenCalled();
    });

    it('should update SCC number in menu for valid satellite', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      const mockSat = {
        isSatellite: () => true,
        apogee: 500,
        perigee: 400,
        sccNum: '12345',
      };

      jest.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue(mockSat as any);
      breakupPlugin['isMenuButtonActive'] = true;

      breakupPlugin.onBottomIconClick();

      expect((<HTMLInputElement>document.getElementById('hc-scc')).value).toBe('12345');
    });

    it('should return correct drag options', () => {
      const breakupPlugin = new Breakup();
      const dragOptions = breakupPlugin['getDragOptions_']();

      expect(dragOptions.isDraggable).toBe(true);
    });

    it('should build side menu HTML', () => {
      const breakupPlugin = new Breakup();
      const html = breakupPlugin['buildSideMenuHtml_']();

      expect(html).toContain('breakup-menu');
      expect(html).toContain('Breakup Simulator');
      expect(html).toContain('hc-scc');
      expect(html).toContain('hc-inc');
      expect(html).toContain('hc-per');
      expect(html).toContain('hc-raan');
      expect(html).toContain('hc-count');
    });

    it('should handle invalid start number in getFormData', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      (<HTMLInputElement>document.getElementById('hc-startNum')).value = 'invalid';

      const formData = Breakup['getFormData_'](ServiceLocator.getCatalogManager());

      expect(formData.startNum).toBe(90000);
    });

    it('should handle missing satellite in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      jest.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue(null);

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle Error direction in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      jest.spyOn(SatMath, 'getDirection').mockReturnValue('Error');
      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          }) as OrbitFinderFile.OrbitFinder,
      );

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle TLE creation errors in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => ['Error', 'Error message'],
          }) as any,
      );

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle altitude check failure in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          }) as OrbitFinderFile.OrbitFinder,
      );

      jest.spyOn(SatMath, 'altitudeCheck').mockReturnValue(0 as Kilometers);

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle DetailedSatellite creation error in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          }) as OrbitFinderFile.OrbitFinder,
      );

      const originalDetailedSatellite = (global as any).DetailedSatellite;

      (global as any).DetailedSatellite = jest.fn(() => {
        throw new Error('Test error');
      });

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();

      (global as any).DetailedSatellite = originalDetailedSatellite;
    });

    it('should handle non-circular orbit in onSubmit after initial checks', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      const mockSat = ServiceLocator.getCatalogManager().getSat(0);

      if (mockSat) {
        mockSat.apogee = 2000 as Kilometers;
        mockSat.perigee = 500 as Kilometers;
      }

      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          }) as OrbitFinderFile.OrbitFinder,
      );

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it.skip('should update search limit when breakup count exceeds it', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      (<HTMLInputElement>document.getElementById('hc-count')).value = '1000';
      (global as any).settingsManager.searchLimit = 100;

      jest.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        () =>
          ({
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          }) as OrbitFinderFile.OrbitFinder,
      );

      breakupPlugin['onSubmit_']();

      expect((global as any).settingsManager.searchLimit).toBe(1000);
    });

    it('should not update SCC number when menu is not active', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      const mockSat = {
        isSatellite: () => true,
        sccNum: '12345',
      };

      jest.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue(mockSat as any);
      breakupPlugin['isMenuButtonActive'] = false;

      const initialValue = (<HTMLInputElement>document.getElementById('hc-scc')).value;

      breakupPlugin['updateSccNumInMenu_']();

      expect((<HTMLInputElement>document.getElementById('hc-scc')).value).toBe(initialValue);
    });

    it('should not update SCC number when satellite is not selected', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      jest.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue({
        isSatellite: () => false,
      } as any);

      breakupPlugin['isMenuButtonActive'] = true;

      const initialValue = (<HTMLInputElement>document.getElementById('hc-scc')).value;

      breakupPlugin['updateSccNumInMenu_']();

      expect((<HTMLInputElement>document.getElementById('hc-scc')).value).toBe(initialValue);
    });

    it('should call bottomIconCallback', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      const spy = jest.spyOn(breakupPlugin, 'onBottomIconClick');

      breakupPlugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });

    it('should return help config', () => {
      const breakupPlugin = new Breakup();
      const helpConfig = breakupPlugin.getHelpConfig();

      expect(helpConfig.title).toBe('Breakup Menu');
      expect(helpConfig.body).toContain('Breakup Menu');
      expect(helpConfig.body).toContain('Inclination Variation');
    });
  });
});
