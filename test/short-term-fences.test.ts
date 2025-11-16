/* eslint-disable dot-notation */
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { ShortTermFences } from '@app/plugins/short-term-fences/short-term-fences';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';
import { KeepTrack } from '@app/keeptrack';

describe('ShortTermFences_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  standardPluginSuite(ShortTermFences, 'ShortTermFences');
  //   standardPluginMenuButtonTests(ShortTermFences, 'ShortTermFences');

  it('should be able to closeAndDisable', () => {
    const stf = new ShortTermFences();

    websiteInit(stf);
    expect(() => stf['closeAndDisable_']()).not.toThrow();
  });

  it('should be able to handle setSensor', () => {
    const stf = new ShortTermFences();

    websiteInit(stf);
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, null, null)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, defaultSensor, 1)).not.toThrow();
  });

  // test stfFormOnSubmit static method
  describe('stfFormOnSubmit', () => {
    it('should call the stfFormOnSubmit method on the ShortTermFences instance', () => {
      const stf = new ShortTermFences();

      websiteInit(stf);
      expect(() => stf['onSubmit_']()).not.toThrow();

      ServiceLocator.getSensorManager().setCurrentSensor(null);
      expect(() => stf['onSubmit_']()).not.toThrow();
    });
  });

  // test stfOnObjectLinkClick method
  describe('stfOnObjectLinkClick', () => {
    it('should call the stfOnObjectLinkClick method on the ShortTermFences instance', () => {
      const stf = new ShortTermFences();

      websiteInit(stf);
      expect(() => stf['stfOnObjectLinkClick_']()).not.toThrow();

      ServiceLocator.getSensorManager().setCurrentSensor(null);
      expect(() => stf['stfOnObjectLinkClick_']()).not.toThrow();

      ServiceLocator.getCatalogManager().getObject = jest.fn().mockReturnValue(defaultSat);
      PluginRegistry.getPlugin(SelectSatManager).selectSat(0);
      expect(() => stf['stfOnObjectLinkClick_']()).not.toThrow();
    });
  });
});
