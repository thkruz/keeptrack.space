/* eslint-disable dot-notation */
import { MenuMode } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { FindSatPlugin } from '@app/plugins/find-sat/find-sat';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { KeepTrack } from '@app/keeptrack';

// eslint-disable-next-line max-lines-per-function
describe('FindSatPlugin_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
    window.M.AutoInit = jest.fn();
  });

  standardPluginSuite(FindSatPlugin);
  standardPluginMenuButtonTests(FindSatPlugin);

  // =========================================================================
  // Composition config method tests
  // =========================================================================

  describe('getBottomIconConfig', () => {
    it('should return correct bottom icon configuration', () => {
      const plugin = new FindSatPlugin();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('find-satellite-bottom-icon');
      expect(config.label).toBe('Find Satellite');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.ADVANCED);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });
  });

  describe('getSideMenuConfig', () => {
    it('should return correct side menu configuration', () => {
      const plugin = new FindSatPlugin();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('findByLooks-menu');
      expect(config.title).toBe('Find Satellite');
      expect(config.html).toContain('findByLooks-menu');
      expect(config.dragOptions).toBeDefined();
      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(500);
      expect(config.dragOptions?.maxWidth).toBe(700);
    });
  });

  describe('getHelpConfig', () => {
    it('should return help configuration with title and body', () => {
      const plugin = new FindSatPlugin();
      const config = plugin.getHelpConfig();

      expect(config.title).toBeDefined();
      expect(config.body).toBeDefined();
    });
  });

  describe('getKeyboardShortcuts', () => {
    it('should return keyboard shortcuts with Ctrl+F', () => {
      const plugin = new FindSatPlugin();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('F');
      expect(shortcuts[0].ctrl).toBe(true);
      expect(shortcuts[0].callback).toBeInstanceOf(Function);
    });

    it('should call bottomMenuClicked when shortcut callback is executed', () => {
      const plugin = new FindSatPlugin();
      const shortcuts = plugin.getKeyboardShortcuts();
      const spy = jest.spyOn(plugin, 'bottomMenuClicked').mockImplementation();

      shortcuts[0].callback();

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // =========================================================================
  // onDownload tests
  // =========================================================================

  describe('onDownload', () => {
    it('should warn if no search has been run', () => {
      const plugin = new FindSatPlugin();
      const warnSpy = jest.spyOn(errorManagerInstance, 'warn').mockImplementation();

      plugin.onDownload();

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should not warn if search has been run', () => {
      const plugin = new FindSatPlugin();

      websiteInit(plugin);

      // Run a search first
      const incInput = getEl('fbl-inc') as HTMLInputElement;

      incInput.value = '50';
      plugin['findByLooksSubmit_']();

      const warnSpy = jest.spyOn(errorManagerInstance, 'warn').mockImplementation();

      plugin.onDownload();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // printLastResults tests
  // =========================================================================

  describe('printLastResults', () => {
    it('should call errorManagerInstance.info', () => {
      const plugin = new FindSatPlugin();
      const infoSpy = jest.spyOn(errorManagerInstance, 'info').mockImplementation();

      plugin.printLastResults();

      expect(infoSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
    });
  });

  // =========================================================================
  // Search filter tests
  // =========================================================================

  it('should find satellites with all inputs set to 0', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const azimuthInput = getEl('fbl-azimuth') as HTMLInputElement;

    azimuthInput.value = '0';
    const elInput = getEl('fbl-elevation') as HTMLInputElement;

    elInput.value = '0';
    const rangeInput = getEl('fbl-range') as HTMLInputElement;

    rangeInput.value = '0';
    const incInput = getEl('fbl-inc') as HTMLInputElement;

    incInput.value = '0';
    const periodInput = getEl('fbl-period') as HTMLInputElement;

    periodInput.value = '0';
    const rcsInput = getEl('fbl-rcs') as HTMLInputElement;

    rcsInput.value = '0';
    const azMargInput = getEl('fbl-azimuth-margin') as HTMLInputElement;

    azMargInput.value = '0';
    const elMargInput = getEl('fbl-elevation-margin') as HTMLInputElement;

    elMargInput.value = '0';
    const rngMargInput = getEl('fbl-range-margin') as HTMLInputElement;

    rngMargInput.value = '0';
    const incMargInput = getEl('fbl-inc-margin') as HTMLInputElement;

    incMargInput.value = '0';
    const periodMargInput = getEl('fbl-period-margin') as HTMLInputElement;

    periodMargInput.value = '0';
    const rcsMargInput = getEl('fbl-rcs-margin') as HTMLInputElement;

    rcsMargInput.value = '0';
    const objTypeInput = getEl('fbl-type') as HTMLInputElement;

    objTypeInput.value = '0';
    const raanInput = getEl('fbl-raan') as HTMLInputElement;

    raanInput.value = '0';
    const raanMargInput = getEl('fbl-raan-margin') as HTMLInputElement;

    raanMargInput.value = '0';
    const argPeInput = getEl('fbl-argPe') as HTMLInputElement;

    argPeInput.value = '0';
    const argPeMargInput = getEl('fbl-argPe-margin') as HTMLInputElement;

    argPeMargInput.value = '0';
    const countryCodeInput = getEl('fbl-country') as HTMLInputElement;

    countryCodeInput.value = '';
    const busInput = getEl('fbl-bus') as HTMLInputElement;

    busInput.value = '';
    const payloadInput = getEl('fbl-payload') as HTMLInputElement;

    payloadInput.value = '';
    const shapeInput = getEl('fbl-shape') as HTMLInputElement;

    shapeInput.value = '';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with all inputs set to 1', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const azimuthInput = getEl('fbl-azimuth') as HTMLInputElement;

    azimuthInput.value = '1';
    const elInput = getEl('fbl-elevation') as HTMLInputElement;

    elInput.value = '1';
    const rangeInput = getEl('fbl-range') as HTMLInputElement;

    rangeInput.value = '1';
    const incInput = getEl('fbl-inc') as HTMLInputElement;

    incInput.value = '1';
    const periodInput = getEl('fbl-period') as HTMLInputElement;

    periodInput.value = '1';
    const rcsInput = getEl('fbl-rcs') as HTMLInputElement;

    rcsInput.value = '1';
    const azMargInput = getEl('fbl-azimuth-margin') as HTMLInputElement;

    azMargInput.value = '1';
    const elMargInput = getEl('fbl-elevation-margin') as HTMLInputElement;

    elMargInput.value = '1';
    const rngMargInput = getEl('fbl-range-margin') as HTMLInputElement;

    rngMargInput.value = '1';
    const incMargInput = getEl('fbl-inc-margin') as HTMLInputElement;

    incMargInput.value = '1';
    const periodMargInput = getEl('fbl-period-margin') as HTMLInputElement;

    periodMargInput.value = '1';
    const rcsMargInput = getEl('fbl-rcs-margin') as HTMLInputElement;

    rcsMargInput.value = '1';
    const objTypeInput = getEl('fbl-type') as HTMLInputElement;

    objTypeInput.value = '1';
    const raanInput = getEl('fbl-raan') as HTMLInputElement;

    raanInput.value = '1';
    const raanMargInput = getEl('fbl-raan-margin') as HTMLInputElement;

    raanMargInput.value = '1';
    const argPeInput = getEl('fbl-argPe') as HTMLInputElement;

    argPeInput.value = '1';
    const argPeMargInput = getEl('fbl-argPe-margin') as HTMLInputElement;

    argPeMargInput.value = '1';
    const countryCodeInput = getEl('fbl-country') as HTMLInputElement;

    countryCodeInput.value = 'US';
    const busInput = getEl('fbl-bus') as HTMLInputElement;

    busInput.value = 'A';
    const payloadInput = getEl('fbl-payload') as HTMLInputElement;

    payloadInput.value = 'B';
    const shapeInput = getEl('fbl-shape') as HTMLInputElement;

    shapeInput.value = 'C';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with all inputs set to their maximum values', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const azimuthInput = getEl('fbl-azimuth') as HTMLInputElement;

    azimuthInput.value = '360';
    const elInput = getEl('fbl-elevation') as HTMLInputElement;

    elInput.value = '90';
    const rangeInput = getEl('fbl-range') as HTMLInputElement;

    rangeInput.value = '1000000';
    const incInput = getEl('fbl-inc') as HTMLInputElement;

    incInput.value = '180';
    const periodInput = getEl('fbl-period') as HTMLInputElement;

    periodInput.value = '1440';
    const rcsInput = getEl('fbl-rcs') as HTMLInputElement;

    rcsInput.value = '100';
    const azMargInput = getEl('fbl-azimuth-margin') as HTMLInputElement;

    azMargInput.value = '360';
    const elMargInput = getEl('fbl-elevation-margin') as HTMLInputElement;

    elMargInput.value = '90';
    const rngMargInput = getEl('fbl-range-margin') as HTMLInputElement;

    rngMargInput.value = '1000000';
    const incMargInput = getEl('fbl-inc-margin') as HTMLInputElement;

    incMargInput.value = '180';
    const periodMargInput = getEl('fbl-period-margin') as HTMLInputElement;

    periodMargInput.value = '1440';
    const rcsMargInput = getEl('fbl-rcs-margin') as HTMLInputElement;

    rcsMargInput.value = '100';
    const objTypeInput = getEl('fbl-type') as HTMLInputElement;

    objTypeInput.value = '5';
    const raanInput = getEl('fbl-raan') as HTMLInputElement;

    raanInput.value = '360';
    const raanMargInput = getEl('fbl-raan-margin') as HTMLInputElement;

    raanMargInput.value = '360';
    const argPeInput = getEl('fbl-argPe') as HTMLInputElement;

    argPeInput.value = '360';
    const argPeMargInput = getEl('fbl-argPe-margin') as HTMLInputElement;

    argPeMargInput.value = '360';
    const countryCodeInput = getEl('fbl-country') as HTMLInputElement;

    countryCodeInput.value = 'US';
    const busInput = getEl('fbl-bus') as HTMLInputElement;

    busInput.value = 'A';
    const payloadInput = getEl('fbl-payload') as HTMLInputElement;

    payloadInput.value = 'B';
    const shapeInput = getEl('fbl-shape') as HTMLInputElement;

    shapeInput.value = 'C';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with random inputs', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const azimuthInput = getEl('fbl-azimuth') as HTMLInputElement;

    azimuthInput.value = '45';
    const elInput = getEl('fbl-elevation') as HTMLInputElement;

    elInput.value = '30';
    const rangeInput = getEl('fbl-range') as HTMLInputElement;

    rangeInput.value = '500000';
    const incInput = getEl('fbl-inc') as HTMLInputElement;

    incInput.value = '60';
    const periodInput = getEl('fbl-period') as HTMLInputElement;

    periodInput.value = '720';
    const rcsInput = getEl('fbl-rcs') as HTMLInputElement;

    rcsInput.value = '50';
    const azMargInput = getEl('fbl-azimuth-margin') as HTMLInputElement;

    azMargInput.value = '10';
    const elMargInput = getEl('fbl-elevation-margin') as HTMLInputElement;

    elMargInput.value = '5';
    const rngMargInput = getEl('fbl-range-margin') as HTMLInputElement;

    rngMargInput.value = '100000';
    const incMargInput = getEl('fbl-inc-margin') as HTMLInputElement;

    incMargInput.value = '10';
    const periodMargInput = getEl('fbl-period-margin') as HTMLInputElement;

    periodMargInput.value = '60';
    const rcsMargInput = getEl('fbl-rcs-margin') as HTMLInputElement;

    rcsMargInput.value = '10';
    const objTypeInput = getEl('fbl-type') as HTMLInputElement;

    objTypeInput.value = '2';
    const raanInput = getEl('fbl-raan') as HTMLInputElement;

    raanInput.value = '180';
    const raanMargInput = getEl('fbl-raan-margin') as HTMLInputElement;

    raanMargInput.value = '180';
    const argPeInput = getEl('fbl-argPe') as HTMLInputElement;

    argPeInput.value = '180';
    const argPeMargInput = getEl('fbl-argPe-margin') as HTMLInputElement;

    argPeMargInput.value = '180';
    const countryCodeInput = getEl('fbl-country') as HTMLInputElement;

    countryCodeInput.value = 'RU';
    const busInput = getEl('fbl-bus') as HTMLInputElement;

    busInput.value = 'B';
    const payloadInput = getEl('fbl-payload') as HTMLInputElement;

    payloadInput.value = 'C';
    const shapeInput = getEl('fbl-shape') as HTMLInputElement;

    shapeInput.value = 'D';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with only minimal inputs', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const rangeInput = getEl('fbl-inc') as HTMLInputElement;

    rangeInput.value = '50';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with only country code', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const countryCodeInput = getEl('fbl-country') as HTMLInputElement;

    countryCodeInput.value = 'US';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with only bus', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);
    const busInput = getEl('fbl-bus') as HTMLInputElement;

    busInput.value = 'A';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with only mandatory inputs and payload', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const azimuthInput = getEl('fbl-azimuth') as HTMLInputElement;

    azimuthInput.value = '0';
    const elInput = getEl('fbl-elevation') as HTMLInputElement;

    elInput.value = '5';
    const rangeInput = getEl('fbl-range') as HTMLInputElement;

    rangeInput.value = '500';
    const payloadInput = getEl('fbl-payload') as HTMLInputElement;

    payloadInput.value = 'A';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with only mandatory inputs and shape', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const azimuthInput = getEl('fbl-azimuth') as HTMLInputElement;

    azimuthInput.value = '0';
    const elInput = getEl('fbl-elevation') as HTMLInputElement;

    elInput.value = '0';
    const rangeInput = getEl('fbl-range') as HTMLInputElement;

    rangeInput.value = '0';
    const shapeInput = getEl('fbl-shape') as HTMLInputElement;

    shapeInput.value = 'A';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with only mandatory inputs and all optional inputs', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const azimuthInput = getEl('fbl-azimuth') as HTMLInputElement;

    azimuthInput.value = '0';
    const elInput = getEl('fbl-elevation') as HTMLInputElement;

    elInput.value = '0';
    const rangeInput = getEl('fbl-range') as HTMLInputElement;

    rangeInput.value = '0';
    const objTypeInput = getEl('fbl-type') as HTMLInputElement;

    objTypeInput.value = '1';
    const raanInput = getEl('fbl-raan') as HTMLInputElement;

    raanInput.value = '0';
    const argPeInput = getEl('fbl-argPe') as HTMLInputElement;

    argPeInput.value = '0';
    const countryCodeInput = getEl('fbl-country') as HTMLInputElement;

    countryCodeInput.value = 'US';
    const busInput = getEl('fbl-bus') as HTMLInputElement;

    busInput.value = 'A';
    const payloadInput = getEl('fbl-payload') as HTMLInputElement;

    payloadInput.value = 'B';
    const shapeInput = getEl('fbl-shape') as HTMLInputElement;

    shapeInput.value = 'C';

    plugin['findByLooksSubmit_']();
  });

  // =========================================================================
  // Additional filter tests
  // =========================================================================

  it('should find satellites with TLE age filter', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const tleAgeInput = getEl('fbl-tleAge') as HTMLInputElement;

    tleAgeInput.value = '24';
    const tleAgeMargInput = getEl('fbl-tleAge-margin') as HTMLInputElement;

    tleAgeMargInput.value = '12';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with source filter', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const sourceInput = getEl('fbl-source') as HTMLInputElement;

    sourceInput.value = 'AFSPC';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with period filter', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const periodInput = getEl('fbl-period') as HTMLInputElement;

    periodInput.value = '90';
    const periodMargInput = getEl('fbl-period-margin') as HTMLInputElement;

    periodMargInput.value = '5';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with RCS filter', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const rcsInput = getEl('fbl-rcs') as HTMLInputElement;

    rcsInput.value = '5';
    const rcsMargInput = getEl('fbl-rcs-margin') as HTMLInputElement;

    rcsMargInput.value = '2';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with RAAN filter', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const raanInput = getEl('fbl-raan') as HTMLInputElement;

    raanInput.value = '180';
    const raanMargInput = getEl('fbl-raan-margin') as HTMLInputElement;

    raanMargInput.value = '10';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with argument of perigee filter', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const argPeInput = getEl('fbl-argPe') as HTMLInputElement;

    argPeInput.value = '90';
    const argPeMargInput = getEl('fbl-argPe-margin') as HTMLInputElement;

    argPeMargInput.value = '5';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with object type Payload', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const objTypeInput = getEl('fbl-type') as HTMLInputElement;

    objTypeInput.value = '1';
    const incInput = getEl('fbl-inc') as HTMLInputElement;

    incInput.value = '50';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with object type Rocket Body', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const objTypeInput = getEl('fbl-type') as HTMLInputElement;

    objTypeInput.value = '2';
    const incInput = getEl('fbl-inc') as HTMLInputElement;

    incInput.value = '50';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with object type Debris', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const objTypeInput = getEl('fbl-type') as HTMLInputElement;

    objTypeInput.value = '3';
    const incInput = getEl('fbl-inc') as HTMLInputElement;

    incInput.value = '50';

    plugin['findByLooksSubmit_']();
  });

  it('should find satellites with multiple country codes', () => {
    const plugin = new FindSatPlugin();

    websiteInit(plugin);

    const countryCodeInput = getEl('fbl-country') as HTMLInputElement;

    countryCodeInput.value = 'US|RU';

    plugin['findByLooksSubmit_']();
  });

  // =========================================================================
  // Side menu HTML tests
  // =========================================================================

  describe('buildSideMenuHtml_', () => {
    it('should include all form elements', () => {
      const plugin = new FindSatPlugin();
      const config = plugin.getSideMenuConfig();
      const html = config.html;

      expect(html).toContain('fbl-type');
      expect(html).toContain('fbl-country');
      expect(html).toContain('fbl-bus');
      expect(html).toContain('fbl-payload');
      expect(html).toContain('fbl-shape');
      expect(html).toContain('fbl-source');
      expect(html).toContain('fbl-azimuth');
      expect(html).toContain('fbl-elevation');
      expect(html).toContain('fbl-range');
      expect(html).toContain('fbl-inc');
      expect(html).toContain('fbl-period');
      expect(html).toContain('fbl-tleAge');
      expect(html).toContain('fbl-rcs');
      expect(html).toContain('fbl-raan');
      expect(html).toContain('fbl-argPe');
      expect(html).toContain('findByLooks-submit');
      expect(html).toContain('findByLooks-export');
    });
  });
});
