import { vi } from 'vitest';
/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Kilometers, Satellite } from '@app/engine/ootk/src/main';
import { Breakup } from '@app/plugins/breakup/breakup';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import * as OrbitFinderFile from '@ootk/src/orbit-design/OrbitFinder';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('Breakup_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(Breakup, 'Breakup');
  standardPluginMenuButtonTests(Breakup, 'Breakup');

  describe('onSubmit', () => {
    it('should call the onSubmit method on the Breakup instance', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();
      // Mock OrbitFinder class
      vi.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        function mockOrbitFinder() {
          return {
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          };
        } as any,
      );
      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle non-satellite objects in onBottomIconClick', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      vi.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue({
        isSatellite: () => false,
      } as any);

      const closeSpy = vi.spyOn(breakupPlugin, 'closeSideMenu');

      breakupPlugin.onBottomIconClick();

      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should handle non-circular orbits in onBottomIconClick', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      // Object.create(Satellite.prototype, …) keeps instanceof Satellite working
      // (the plugin gates on instanceof to reject OemSatellite) while letting us
      // pin apogee/perigee to test values.
      const mockSat = Object.assign(Object.create(Satellite.prototype), {
        apogee: 2000,
        perigee: 500,
      });

      vi.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue(mockSat);
      const closeSpy = vi.spyOn(breakupPlugin, 'closeSideMenu');
      const disableSpy = vi.spyOn(breakupPlugin, 'setBottomIconToDisabled');

      breakupPlugin.onBottomIconClick();

      expect(closeSpy).toHaveBeenCalled();
      expect(disableSpy).toHaveBeenCalled();
    });

    it('should update SCC number in menu for valid satellite', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      const mockSat = Object.assign(Object.create(Satellite.prototype), {
        apogee: 500,
        perigee: 400,
        sccNum: '12345',
      });

      vi.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue(mockSat);
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
      const config = breakupPlugin.getSideMenuConfig();

      expect(config.html).toContain('breakup-menu');
      expect(config.title).toBe('Breakup Simulator');
      expect(config.html).toContain('hc-scc');
      expect(config.html).toContain('hc-inc');
      expect(config.html).toContain('hc-per');
      expect(config.html).toContain('hc-raan');
      expect(config.html).toContain('hc-count');
    });

    it('should build a v13 side menu with the new controls', () => {
      const breakupPlugin = new Breakup();
      const config = breakupPlugin.getSideMenuConfig();

      expect(config.html).toContain('kt-ui-v13');
      expect(config.html).toContain('kt-section');
      expect(config.html).toContain('hc-ecc');
      expect(config.html).toContain('breakup-create-btn');
      expect(config.html).toContain('breakup-clear-btn');
    });

    it('should not have a count option whose value disagrees with its label', () => {
      const breakupPlugin = new Breakup();
      const config = breakupPlugin.getSideMenuConfig();

      // Regression: the old menu had `<option value="200">250</option>`.
      expect(config.html).not.toContain('value="200"');
      expect(config.html).toContain('<option value="250">250</option>');
    });

    it('should expose a keyboard shortcut', () => {
      const breakupPlugin = new Breakup();
      const shortcuts = breakupPlugin.getKeyboardShortcuts();

      expect(shortcuts.some((s) => s.key === 'B')).toBe(true);
    });

    it('should expose create and clear command-palette commands', () => {
      const breakupPlugin = new Breakup();
      const commands = breakupPlugin.getCommandPaletteCommands();

      expect(commands.map((c) => c.id)).toEqual(['Breakup.create', 'Breakup.clear']);
      // Clear is unavailable until a breakup exists.
      const clear = commands.find((c) => c.id === 'Breakup.clear');

      expect(clear?.isAvailable?.()).toBe(false);
    });

    it('should no-op clearBreakup when there is nothing to clear', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      expect(() => breakupPlugin['clearBreakup_']()).not.toThrow();
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

      vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue(null);

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle Error direction in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      vi.spyOn(SatMath, 'getDirection').mockReturnValue('Error');
      vi.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        function test() {
          return {
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          };
        } as any,
      );

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle TLE creation errors in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      vi.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        function test() {
          return {
            rotateOrbitToLatLon: () => ['Error', 'Error message'],
          };
        } as any,
      );

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle altitude check failure in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      vi.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        function test() {
          return {
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          };
        } as any,
      );

      vi.spyOn(SatMath, 'altitudeCheck').mockReturnValue(0 as Kilometers);

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle Satellite creation error in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      vi.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        function test() {
          return {
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          };
        } as any,
      );

      const originalSatellite = (global as any).Satellite;

      (global as any).Satellite = vi.fn(() => {
        throw new Error('Test error');
      });

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();

      (global as any).Satellite = originalSatellite;
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

      vi.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        function test() {
          return {
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          };
        } as any,
      );

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it.skip('should update search limit when breakup count exceeds it', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      (<HTMLInputElement>document.getElementById('hc-count')).value = '1000';
      (global as any).settingsManager.searchLimit = 100;

      vi.spyOn(OrbitFinderFile, 'OrbitFinder').mockImplementation(
        function test() {
          return {
            rotateOrbitToLatLon: () => [defaultSat.tle1, defaultSat.tle2],
          };
        } as any,
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

      vi.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue(mockSat as any);
      breakupPlugin['isMenuButtonActive'] = false;

      const initialValue = (<HTMLInputElement>document.getElementById('hc-scc')).value;

      breakupPlugin['updateSccNumInMenu_']();

      expect((<HTMLInputElement>document.getElementById('hc-scc')).value).toBe(initialValue);
    });

    it('should not update SCC number when satellite is not selected', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      vi.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue({
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

      const spy = vi.spyOn(breakupPlugin, 'onBottomIconClick');

      breakupPlugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });

    it('should return help config', () => {
      const breakupPlugin = new Breakup();
      const helpConfig = breakupPlugin.getHelpConfig();

      expect(helpConfig.title).toBe('Breakup Menu');
      expect(helpConfig.sections!.length).toBeGreaterThanOrEqual(3);
      expect(helpConfig.sections![0].image?.src).toContain('img/help/breakup/');
      expect(helpConfig.tips!.length).toBeGreaterThan(0);
    });
  });
});
