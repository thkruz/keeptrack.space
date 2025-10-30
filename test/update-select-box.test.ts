import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';

describe('UpdateSatManager_class', () => {
  beforeEach(() => {
    // Mock DateTimeManager uiManagerFinal to prevent errors
    DateTimeManager.prototype.uiManagerFinal = jest.fn();
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([TopMenu, SelectSatManager, DateTimeManager]);
  });

  standardPluginSuite(SatInfoBox, 'SatInfoBox');
});

describe('SatInfoBoxCore_class2', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let satinfobox: SatInfoBox;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([TopMenu, SelectSatManager, DateTimeManager]);
    satinfobox = new SatInfoBox();
  });

  it('should be able to select a satellite', () => {
    ServiceLocator.getCatalogManager().objectCache = [defaultSat];
    ServiceLocator.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array as Float32Array<ArrayBuffer>;
    ServiceLocator.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    ServiceLocator.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    KeepTrack.getInstance().isInitialized = true;
    const selectSatManager = new SelectSatManager();

    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    EventBus.getInstance().emit(EventBusEvent.uiManagerOnReady);
    selectSatManager.selectSat(0);
    expect(() => EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat)).not.toThrow();

    EventBus.getInstance().emit(EventBusEvent.setSensor, defaultSensor, 2);
    ServiceLocator.getCatalogManager().isSensorManagerLoaded = true;
    selectSatManager.selectSat(0);
    expect(() => EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat)).not.toThrow();
  });
});
