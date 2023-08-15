import { keepTrackApi } from '@app/js/keepTrackApi';
import { SatInfoBoxCore } from '@app/js/plugins/select-sat-manager/satInfoboxCore';
import { SelectSatManager } from '@app/js/plugins/select-sat-manager/select-sat-manager';
import { ShortTermFences } from '@app/js/plugins/short-term-fences/short-term-fences';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('ShortTermFences_class', () => {
  beforeAll(() => {
    document.body.innerHTML = '';
    setupStandardEnvironment([SelectSatManager, SatInfoBoxCore]);
  });

  standardPluginSuite(ShortTermFences, 'ShortTermFences');
  //   standardPluginMenuButtonTests(ShortTermFences, 'ShortTermFences');

  it('should be able to closeAndDisable', () => {
    const stf = new ShortTermFences();
    websiteInit(stf);
    expect(() => stf.closeAndDisable()).not.toThrow();
  });

  // test stfFormOnSubmit static method
  describe('stfFormOnSubmit', () => {
    it('should call the stfFormOnSubmit method on the ShortTermFences instance', () => {
      const stf = new ShortTermFences();
      websiteInit(stf);
      expect(() => stf.onSubmit()).not.toThrow();

      keepTrackApi.getSensorManager().setCurrentSensor([defaultSensor]);
      expect(() => stf.onSubmit()).not.toThrow();
    });
  });

  // test stfOnObjectLinkClick method
  describe('stfOnObjectLinkClick', () => {
    it('should call the stfOnObjectLinkClick method on the ShortTermFences instance', () => {
      const stf = new ShortTermFences();
      websiteInit(stf);
      expect(() => stf.stfOnObjectLinkClick()).not.toThrow();

      keepTrackApi.getSensorManager().setCurrentSensor([defaultSensor]);
      expect(() => stf.stfOnObjectLinkClick()).not.toThrow();

      keepTrackApi.getCatalogManager().getSat = jest.fn().mockReturnValue(defaultSat);
      keepTrackApi.getCatalogManager().selectedSat = 0;
      expect(() => stf.stfOnObjectLinkClick()).not.toThrow();
    });
  });

  it('should be able to handle setSensor', () => {
    const stf = new ShortTermFences();
    websiteInit(stf);
    expect(() => keepTrackApi.methods.setSensor(null, null)).not.toThrow();
    expect(() => keepTrackApi.methods.setSensor(defaultSensor, 1)).not.toThrow();
  });
});
