import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
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
    setupStandardEnvironment([TopMenu, SelectSatManager, SatInfoBox, DateTimeManager]);
  });

  standardPluginSuite(SelectSatManager, 'SelectSatManager');
});

describe('SatInfoBoxCore_class2', () => {
  it('should be able to select a satellite', () => {
    keepTrackApi.getCatalogManager().objectCache = [defaultSat];
    keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.isInitialized = true;
    const selectSatManager = new SelectSatManager();

    selectSatManager.init();
    keepTrackApi.emit(KeepTrackApiEvents.uiManagerInit);
    keepTrackApi.emit(KeepTrackApiEvents.uiManagerFinal);
    keepTrackApi.emit(KeepTrackApiEvents.uiManagerOnReady);
    selectSatManager.selectSat(0);
    expect(() => keepTrackApi.emit(KeepTrackApiEvents.updateSelectBox, defaultSat)).not.toThrow();

    keepTrackApi.emit(KeepTrackApiEvents.setSensor, defaultSensor, 2);
    keepTrackApi.getCatalogManager().isSensorManagerLoaded = true;
    selectSatManager.selectSat(0);
    expect(() => keepTrackApi.emit(KeepTrackApiEvents.updateSelectBox, defaultSat)).not.toThrow();
  });
});
