import { FindSatPlugin } from '@app/plugins/find-sat/find-sat';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('FindSatPlugin_class', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setupStandardEnvironment();
    window.M.AutoInit = jest.fn();
  });

  standardPluginSuite(FindSatPlugin);
  standardPluginMenuButtonTests(FindSatPlugin);

  it('should find satellites with all inputs set to 0', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const azimuthInput = document.getElementById('fbl-azimuth') as HTMLInputElement;
    azimuthInput.value = '0';
    const elInput = document.getElementById('fbl-elevation') as HTMLInputElement;
    elInput.value = '0';
    const rangeInput = document.getElementById('fbl-range') as HTMLInputElement;
    rangeInput.value = '0';
    const incInput = document.getElementById('fbl-inc') as HTMLInputElement;
    incInput.value = '0';
    const periodInput = document.getElementById('fbl-period') as HTMLInputElement;
    periodInput.value = '0';
    const rcsInput = document.getElementById('fbl-rcs') as HTMLInputElement;
    rcsInput.value = '0';
    const azMargInput = document.getElementById('fbl-azimuth-margin') as HTMLInputElement;
    azMargInput.value = '0';
    const elMargInput = document.getElementById('fbl-elevation-margin') as HTMLInputElement;
    elMargInput.value = '0';
    const rngMargInput = document.getElementById('fbl-range-margin') as HTMLInputElement;
    rngMargInput.value = '0';
    const incMargInput = document.getElementById('fbl-inc-margin') as HTMLInputElement;
    incMargInput.value = '0';
    const periodMargInput = document.getElementById('fbl-period-margin') as HTMLInputElement;
    periodMargInput.value = '0';
    const rcsMargInput = document.getElementById('fbl-rcs-margin') as HTMLInputElement;
    rcsMargInput.value = '0';
    const objTypeInput = document.getElementById('fbl-type') as HTMLInputElement;
    objTypeInput.value = '0';
    const raanInput = document.getElementById('fbl-raan') as HTMLInputElement;
    raanInput.value = '0';
    const raanMargInput = document.getElementById('fbl-raan-margin') as HTMLInputElement;
    raanMargInput.value = '0';
    const argPeInput = document.getElementById('fbl-argPe') as HTMLInputElement;
    argPeInput.value = '0';
    const argPeMargInput = document.getElementById('fbl-argPe-margin') as HTMLInputElement;
    argPeMargInput.value = '0';
    const countryCodeInput = document.getElementById('fbl-country') as HTMLInputElement;
    countryCodeInput.value = '';
    const busInput = document.getElementById('fbl-bus') as HTMLInputElement;
    busInput.value = '';
    const payloadInput = document.getElementById('fbl-payload') as HTMLInputElement;
    payloadInput.value = '';
    const shapeInput = document.getElementById('fbl-shape') as HTMLInputElement;
    shapeInput.value = '';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with all inputs set to 1', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const azimuthInput = document.getElementById('fbl-azimuth') as HTMLInputElement;
    azimuthInput.value = '1';
    const elInput = document.getElementById('fbl-elevation') as HTMLInputElement;
    elInput.value = '1';
    const rangeInput = document.getElementById('fbl-range') as HTMLInputElement;
    rangeInput.value = '1';
    const incInput = document.getElementById('fbl-inc') as HTMLInputElement;
    incInput.value = '1';
    const periodInput = document.getElementById('fbl-period') as HTMLInputElement;
    periodInput.value = '1';
    const rcsInput = document.getElementById('fbl-rcs') as HTMLInputElement;
    rcsInput.value = '1';
    const azMargInput = document.getElementById('fbl-azimuth-margin') as HTMLInputElement;
    azMargInput.value = '1';
    const elMargInput = document.getElementById('fbl-elevation-margin') as HTMLInputElement;
    elMargInput.value = '1';
    const rngMargInput = document.getElementById('fbl-range-margin') as HTMLInputElement;
    rngMargInput.value = '1';
    const incMargInput = document.getElementById('fbl-inc-margin') as HTMLInputElement;
    incMargInput.value = '1';
    const periodMargInput = document.getElementById('fbl-period-margin') as HTMLInputElement;
    periodMargInput.value = '1';
    const rcsMargInput = document.getElementById('fbl-rcs-margin') as HTMLInputElement;
    rcsMargInput.value = '1';
    const objTypeInput = document.getElementById('fbl-type') as HTMLInputElement;
    objTypeInput.value = '1';
    const raanInput = document.getElementById('fbl-raan') as HTMLInputElement;
    raanInput.value = '1';
    const raanMargInput = document.getElementById('fbl-raan-margin') as HTMLInputElement;
    raanMargInput.value = '1';
    const argPeInput = document.getElementById('fbl-argPe') as HTMLInputElement;
    argPeInput.value = '1';
    const argPeMargInput = document.getElementById('fbl-argPe-margin') as HTMLInputElement;
    argPeMargInput.value = '1';
    const countryCodeInput = document.getElementById('fbl-country') as HTMLInputElement;
    countryCodeInput.value = 'US';
    const busInput = document.getElementById('fbl-bus') as HTMLInputElement;
    busInput.value = 'A';
    const payloadInput = document.getElementById('fbl-payload') as HTMLInputElement;
    payloadInput.value = 'B';
    const shapeInput = document.getElementById('fbl-shape') as HTMLInputElement;
    shapeInput.value = 'C';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with all inputs set to their maximum values', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const azimuthInput = document.getElementById('fbl-azimuth') as HTMLInputElement;
    azimuthInput.value = '360';
    const elInput = document.getElementById('fbl-elevation') as HTMLInputElement;
    elInput.value = '90';
    const rangeInput = document.getElementById('fbl-range') as HTMLInputElement;
    rangeInput.value = '1000000';
    const incInput = document.getElementById('fbl-inc') as HTMLInputElement;
    incInput.value = '180';
    const periodInput = document.getElementById('fbl-period') as HTMLInputElement;
    periodInput.value = '1440';
    const rcsInput = document.getElementById('fbl-rcs') as HTMLInputElement;
    rcsInput.value = '100';
    const azMargInput = document.getElementById('fbl-azimuth-margin') as HTMLInputElement;
    azMargInput.value = '360';
    const elMargInput = document.getElementById('fbl-elevation-margin') as HTMLInputElement;
    elMargInput.value = '90';
    const rngMargInput = document.getElementById('fbl-range-margin') as HTMLInputElement;
    rngMargInput.value = '1000000';
    const incMargInput = document.getElementById('fbl-inc-margin') as HTMLInputElement;
    incMargInput.value = '180';
    const periodMargInput = document.getElementById('fbl-period-margin') as HTMLInputElement;
    periodMargInput.value = '1440';
    const rcsMargInput = document.getElementById('fbl-rcs-margin') as HTMLInputElement;
    rcsMargInput.value = '100';
    const objTypeInput = document.getElementById('fbl-type') as HTMLInputElement;
    objTypeInput.value = '5';
    const raanInput = document.getElementById('fbl-raan') as HTMLInputElement;
    raanInput.value = '360';
    const raanMargInput = document.getElementById('fbl-raan-margin') as HTMLInputElement;
    raanMargInput.value = '360';
    const argPeInput = document.getElementById('fbl-argPe') as HTMLInputElement;
    argPeInput.value = '360';
    const argPeMargInput = document.getElementById('fbl-argPe-margin') as HTMLInputElement;
    argPeMargInput.value = '360';
    const countryCodeInput = document.getElementById('fbl-country') as HTMLInputElement;
    countryCodeInput.value = 'US';
    const busInput = document.getElementById('fbl-bus') as HTMLInputElement;
    busInput.value = 'A';
    const payloadInput = document.getElementById('fbl-payload') as HTMLInputElement;
    payloadInput.value = 'B';
    const shapeInput = document.getElementById('fbl-shape') as HTMLInputElement;
    shapeInput.value = 'C';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with random inputs', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const azimuthInput = document.getElementById('fbl-azimuth') as HTMLInputElement;
    azimuthInput.value = '45';
    const elInput = document.getElementById('fbl-elevation') as HTMLInputElement;
    elInput.value = '30';
    const rangeInput = document.getElementById('fbl-range') as HTMLInputElement;
    rangeInput.value = '500000';
    const incInput = document.getElementById('fbl-inc') as HTMLInputElement;
    incInput.value = '60';
    const periodInput = document.getElementById('fbl-period') as HTMLInputElement;
    periodInput.value = '720';
    const rcsInput = document.getElementById('fbl-rcs') as HTMLInputElement;
    rcsInput.value = '50';
    const azMargInput = document.getElementById('fbl-azimuth-margin') as HTMLInputElement;
    azMargInput.value = '10';
    const elMargInput = document.getElementById('fbl-elevation-margin') as HTMLInputElement;
    elMargInput.value = '5';
    const rngMargInput = document.getElementById('fbl-range-margin') as HTMLInputElement;
    rngMargInput.value = '100000';
    const incMargInput = document.getElementById('fbl-inc-margin') as HTMLInputElement;
    incMargInput.value = '10';
    const periodMargInput = document.getElementById('fbl-period-margin') as HTMLInputElement;
    periodMargInput.value = '60';
    const rcsMargInput = document.getElementById('fbl-rcs-margin') as HTMLInputElement;
    rcsMargInput.value = '10';
    const objTypeInput = document.getElementById('fbl-type') as HTMLInputElement;
    objTypeInput.value = '2';
    const raanInput = document.getElementById('fbl-raan') as HTMLInputElement;
    raanInput.value = '180';
    const raanMargInput = document.getElementById('fbl-raan-margin') as HTMLInputElement;
    raanMargInput.value = '180';
    const argPeInput = document.getElementById('fbl-argPe') as HTMLInputElement;
    argPeInput.value = '180';
    const argPeMargInput = document.getElementById('fbl-argPe-margin') as HTMLInputElement;
    argPeMargInput.value = '180';
    const countryCodeInput = document.getElementById('fbl-country') as HTMLInputElement;
    countryCodeInput.value = 'RU';
    const busInput = document.getElementById('fbl-bus') as HTMLInputElement;
    busInput.value = 'B';
    const payloadInput = document.getElementById('fbl-payload') as HTMLInputElement;
    payloadInput.value = 'C';
    const shapeInput = document.getElementById('fbl-shape') as HTMLInputElement;
    shapeInput.value = 'D';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with only minimal inputs', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const rangeInput = document.getElementById('fbl-inc') as HTMLInputElement;
    rangeInput.value = '50';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with only country code', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const countryCodeInput = document.getElementById('fbl-country') as HTMLInputElement;
    countryCodeInput.value = 'US';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with only bus', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);
    const busInput = document.getElementById('fbl-bus') as HTMLInputElement;
    busInput.value = 'A';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with only mandatory inputs and payload', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const azimuthInput = document.getElementById('fbl-azimuth') as HTMLInputElement;
    azimuthInput.value = '0';
    const elInput = document.getElementById('fbl-elevation') as HTMLInputElement;
    elInput.value = '5';
    const rangeInput = document.getElementById('fbl-range') as HTMLInputElement;
    rangeInput.value = '500';
    const payloadInput = document.getElementById('fbl-payload') as HTMLInputElement;
    payloadInput.value = 'A';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with only mandatory inputs and shape', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const azimuthInput = document.getElementById('fbl-azimuth') as HTMLInputElement;
    azimuthInput.value = '0';
    const elInput = document.getElementById('fbl-elevation') as HTMLInputElement;
    elInput.value = '0';
    const rangeInput = document.getElementById('fbl-range') as HTMLInputElement;
    rangeInput.value = '0';
    const shapeInput = document.getElementById('fbl-shape') as HTMLInputElement;
    shapeInput.value = 'A';

    plugin.findByLooksSubmit();
  });

  it('should find satellites with only mandatory inputs and all optional inputs', () => {
    const plugin = new FindSatPlugin();
    websiteInit(plugin);

    const azimuthInput = document.getElementById('fbl-azimuth') as HTMLInputElement;
    azimuthInput.value = '0';
    const elInput = document.getElementById('fbl-elevation') as HTMLInputElement;
    elInput.value = '0';
    const rangeInput = document.getElementById('fbl-range') as HTMLInputElement;
    rangeInput.value = '0';
    const objTypeInput = document.getElementById('fbl-type') as HTMLInputElement;
    objTypeInput.value = '1';
    const raanInput = document.getElementById('fbl-raan') as HTMLInputElement;
    raanInput.value = '0';
    const argPeInput = document.getElementById('fbl-argPe') as HTMLInputElement;
    argPeInput.value = '0';
    const countryCodeInput = document.getElementById('fbl-country') as HTMLInputElement;
    countryCodeInput.value = 'US';
    const busInput = document.getElementById('fbl-bus') as HTMLInputElement;
    busInput.value = 'A';
    const payloadInput = document.getElementById('fbl-payload') as HTMLInputElement;
    payloadInput.value = 'B';
    const shapeInput = document.getElementById('fbl-shape') as HTMLInputElement;
    shapeInput.value = 'C';

    plugin.findByLooksSubmit();
  });
});
