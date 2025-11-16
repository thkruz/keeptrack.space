/* eslint-disable dot-notation */
import { getEl } from '@app/engine/utils/get-el';
import { FindSatPlugin } from '@app/plugins/find-sat/find-sat';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
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
});
