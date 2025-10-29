import { getEl } from '@app/engine/utils/get-el';
import { DebrisScreening } from '@app/plugins/debris-screening/debris-screening';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('DebrisScreening_class', () => {
  // let debrisScreeningPlugin: DebrisScreening;
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    window.M = {
      AutoInit: () => {
        // Mock the M.AutoInit function
      },
    } as unknown as typeof window.M;
    // debrisScreeningPlugin = new DebrisScreening();
  });

  standardPluginSuite(DebrisScreening, 'DebrisScreening');
  standardPluginMenuButtonTests(DebrisScreening, 'DebrisScreening');
});

describe('DebrisScreening_form', () => {
  let debrisScreeningPlugin: DebrisScreening;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    window.M = {
      AutoInit: () => {
        // Mock the M.AutoInit function
      },
    } as unknown as typeof window.M;
    debrisScreeningPlugin = new DebrisScreening();
  });

  it('should have a form and buttons', () => {
    websiteInit(debrisScreeningPlugin);
    expect(getEl(`${debrisScreeningPlugin.sideMenuElementName}-form`)).toBeDefined();
    expect(getEl(`${debrisScreeningPlugin.sideMenuElementName}-vis`)).toBeDefined();
    expect(getEl(`${debrisScreeningPlugin.sideMenuElementName}-clear-vis`)).toBeDefined();
  });

  it('should have working buttons', () => {
    websiteInit(debrisScreeningPlugin);
    expect(() => getEl(`${debrisScreeningPlugin.sideMenuElementName}-vis`)!.click()).not.toThrow();
    jest.advanceTimersByTime(1000);
    expect(() => getEl(`${debrisScreeningPlugin.sideMenuElementName}-clear-vis`)!.click()).not.toThrow();
    jest.advanceTimersByTime(1000);
    expect(() => getEl(`${debrisScreeningPlugin.sideMenuElementName}-form`)!.dispatchEvent(new Event('submit'))).not.toThrow();
    jest.advanceTimersByTime(1000);
  });
});
