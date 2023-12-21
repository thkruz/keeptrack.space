import { keepTrackApi } from '@app/keepTrackApi';
import { SatInfoBox } from '@app/plugins/select-sat-manager/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { ShortTermFences } from '@app/plugins/short-term-fences/short-term-fences';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('ShortTermFences_class', () => {
  beforeAll(() => {
    keepTrackApi.containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
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
