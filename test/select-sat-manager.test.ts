import { keepTrackApi } from '@app/keepTrackApi';
import { satInfoBoxCorePlugin } from '@app/plugins/select-sat-manager/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('SatInfoBoxCore_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
  });

  standardPluginSuite(SelectSatManager, 'SelectSatManager');

  it('should be able to select a satellite', () => {
    keepTrackApi.getCatalogManager().satData = [defaultSat];
    keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    const selectSatManager = new SelectSatManager();
    selectSatManager.selectSat(0);
    expect(keepTrackApi.getCatalogManager().selectedSat).toBe(0);

    selectSatManager.checkIfSelectSatVisible();
  });

  it('should be able to select a sensor dot', () => {
    const selectSatManager = new SelectSatManager();
    websiteInit(satInfoBoxCorePlugin);
    keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getCatalogManager().satData = [defaultSensor as any];
    selectSatManager.selectSat(0);
  });
});
