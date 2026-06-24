import { vi } from 'vitest';
/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Kilometers, Satellite, TleLine1, TleLine2 } from '@app/engine/ootk/src/main';
import { Breakup } from '@app/plugins/breakup/breakup';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment, standardSelectSat } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

// A highly eccentric (Molniya-like) orbit - the regime the old algorithm refused.
const ellipticalSat = () => new Satellite({
  id: 0,
  active: true,
  sccNum: '00005',
  name: 'Molniya',
  tle1: '1 44444U 19999A   21203.40407588  .00000000  00000-0  00000-0 0  9991' as TleLine1,
  tle2: '2 44444  63.4000 100.0000 7200000  270.0000  10.0000  2.00600000 00001' as TleLine2,
});

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

    it('should accept non-circular (elliptical) orbits in onBottomIconClick', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      // A highly elliptical Satellite must NOT be rejected anymore.
      const mockSat = Object.assign(Object.create(Satellite.prototype), {
        apogee: 39000,
        perigee: 500,
        sccNum: '00005',
        isSatellite: () => true,
      });

      vi.spyOn(breakupPlugin['selectSatManager_'], 'getSelectedSat').mockReturnValue(mockSat);
      const closeSpy = vi.spyOn(breakupPlugin, 'closeSideMenu');
      const disableSpy = vi.spyOn(breakupPlugin, 'setBottomIconToDisabled');

      breakupPlugin.onBottomIconClick();

      expect(closeSpy).not.toHaveBeenCalled();
      expect(disableSpy).not.toHaveBeenCalled();
    });

    it('should update SCC number in menu for valid satellite', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      const mockSat = Object.assign(Object.create(Satellite.prototype), {
        sccNum: '12345',
        isSatellite: () => true,
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
      expect(config.html).toContain('hc-startNum');
      expect(config.html).toContain('hc-count');
    });

    it('should build a v13 side menu with the delta-V controls', () => {
      const breakupPlugin = new Breakup();
      const config = breakupPlugin.getSideMenuConfig();

      expect(config.html).toContain('kt-ui-v13');
      expect(config.html).toContain('kt-section');
      expect(config.html).toContain('hc-dv-radial');
      expect(config.html).toContain('hc-dv-intrack');
      expect(config.html).toContain('hc-dv-crosstrack');
      expect(config.html).toContain('breakup-create-btn');
      expect(config.html).toContain('breakup-clear-btn');
    });

    it('should include the event-type preset dropdown with all five presets', () => {
      const breakupPlugin = new Breakup();
      const config = breakupPlugin.getSideMenuConfig();

      expect(config.html).toContain('hc-event-preset');
      expect(config.html).toContain('value="explosion"');
      expect(config.html).toContain('value="collision"');
      expect(config.html).toContain('value="asat_cosmos"');
      expect(config.html).toContain('value="asat_fy1c"');
      expect(config.html).toContain('value="venting"');
      expect(config.html).toContain('value="custom"');
    });

    it('applyPreset_ fills the delta-V fields (anisotropic ASAT) and ignores custom', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      breakupPlugin['applyPreset_']('asat_fy1c');
      expect((<HTMLInputElement>document.getElementById('hc-dv-radial')).value).toBe('230');
      expect((<HTMLInputElement>document.getElementById('hc-dv-intrack')).value).toBe('230');
      expect((<HTMLInputElement>document.getElementById('hc-dv-crosstrack')).value).toBe('90');

      breakupPlugin['applyPreset_']('custom');
      expect((<HTMLInputElement>document.getElementById('hc-dv-radial')).value).toBe('230');
    });

    it('should not have a count option whose value disagrees with its label', () => {
      const breakupPlugin = new Breakup();
      const config = breakupPlugin.getSideMenuConfig();

      // Regression: the old menu had `<option value="200">250</option>`.
      expect(config.html).not.toContain('value="200"');
      expect(config.html).toContain('<option value="250">250</option>');
    });

    it('should expose a Shift+B keyboard shortcut', () => {
      const breakupPlugin = new Breakup();
      const shortcuts = breakupPlugin.getKeyboardShortcuts();

      expect(shortcuts.some((s) => s.key === 'B' && s.shift === true)).toBe(true);
    });

    it('should expose create and clear command-palette commands', () => {
      const breakupPlugin = new Breakup();
      const commands = breakupPlugin.getCommandPaletteCommands();

      expect(commands.map((c) => c.id)).toEqual(['Breakup.create', 'Breakup.clear']);
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
      expect(formData.startNumWasInvalid).toBe(true);
    });

    it('should parse the delta-V inputs in getFormData', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      (<HTMLInputElement>document.getElementById('hc-dv-radial')).value = '15';
      (<HTMLInputElement>document.getElementById('hc-dv-intrack')).value = '60';
      (<HTMLInputElement>document.getElementById('hc-dv-crosstrack')).value = '15';

      const formData = Breakup['getFormData_'](ServiceLocator.getCatalogManager());

      expect(formData.radialDeltaV).toBe(15);
      expect(formData.inTrackDeltaV).toBe(60);
      expect(formData.crossTrackDeltaV).toBe(15);
    });

    it('should handle missing satellite in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);

      vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue(null);

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle an elliptical orbit in onSubmit (any regime)', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue(ellipticalSat());

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
    });

    it('should handle altitude check failure in onSubmit', () => {
      const breakupPlugin = new Breakup();

      websiteInit(breakupPlugin);
      standardSelectSat();

      vi.spyOn(SatMath, 'altitudeCheck').mockReturnValue(0 as Kilometers);

      expect(() => breakupPlugin['onSubmit_']()).not.toThrow();
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
