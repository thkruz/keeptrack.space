/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { DetailedSatellite, DetailedSensor, Kilometers, SpaceObjectType } from 'ootk';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('SelectSatManager_dots', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
  });

  standardPluginSuite(SelectSatManager, 'SelectSatManager');

  it('should be able to select a satellite', () => {
    keepTrackApi.getCatalogManager().objectCache = [
      {
        ...defaultSat, position: {
          x: 10000,
          y: 10000,
          z: 10000,
        },
      } as DetailedSatellite,
    ];
    keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    const selectSatManager = new SelectSatManager();

    selectSatManager.selectSat(0);
    expect(selectSatManager.selectedSat).toBe(0);

    selectSatManager.checkIfSelectSatVisible();
  });

  it('should be able to select a sensor dot', () => {
    const selectSatManager = new SelectSatManager();

    websiteInit(new SatInfoBox());
    keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getCatalogManager().objectCache = [defaultSensor as DetailedSensor];
    selectSatManager.selectSat(0);
  });
});
describe('SelectSatManager_class', () => {
  let selectSatManager: SelectSatManager;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
    selectSatManager = new SelectSatManager();

    keepTrackApi.getCatalogManager().objectCache = [
      new DetailedSatellite(defaultSat),
      new DetailedSatellite({ ...defaultSat, id: 1 }),
    ];
    // Set all satellites to active
    keepTrackApi.getCatalogManager().objectCache.forEach((sat) => {
      sat.active = true;
      sat.position = {
        x: 10000 as Kilometers,
        y: 10000 as Kilometers,
        z: 10000 as Kilometers,
      };
    });
  });

  it('should reset selected satellite when selectSatReset_ is called', () => {
    selectSatManager.selectSat(1);
    expect(selectSatManager.selectedSat).toBe(1);

    (selectSatManager as any).selectSatReset_();
    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should switch primary and secondary satellites', () => {
    selectSatManager.selectSat(1);
    selectSatManager.setSecondarySat(2);

    selectSatManager.switchPrimarySecondary();

    expect(selectSatManager.selectedSat).toBe(2);
    expect(selectSatManager.secondarySat).toBe(1);
  });

  it('should select the previous satellite', () => {
    selectSatManager.selectSat(1);
    expect(selectSatManager.lastSelectedSat()).toBe(1);
    selectSatManager.selectPrevSat();

    expect(selectSatManager.selectedSat).toBe(0);
  });

  it('should select the next satellite', () => {
    selectSatManager.selectSat(0);
    expect(selectSatManager.lastSelectedSat()).toBe(0);
    selectSatManager.selectNextSat();

    expect(selectSatManager.selectedSat).toBe(1);
  });

  it('should handle invalid satellite selection gracefully', () => {
    keepTrackApi.getCatalogManager().getObject = jest.fn().mockReturnValue(null);

    selectSatManager.selectSat(999);
    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should update dot size and color when a satellite is selected', () => {
    const updateDotSizeAndColorSpy = jest.spyOn(selectSatManager as any, 'updateDotSizeAndColor_');

    keepTrackApi.getCatalogManager().objectCache = [new DetailedSatellite({ ...defaultSat, ...{ id: 0, type: SpaceObjectType.PAYLOAD } })];
    keepTrackApi.getCatalogManager().objectCache.forEach((sat) => {
      sat.active = true;
      sat.position = {
        x: 10000 as Kilometers,
        y: 10000 as Kilometers,
        z: 10000 as Kilometers,
      };
    });

    selectSatManager.selectSat(0);

    expect(updateDotSizeAndColorSpy).toHaveBeenCalledWith(0);
  });

  it('should not select a satellite inside the Earth', () => {
    keepTrackApi.getCatalogManager().objectCache = [{ id: 0, position: { x: 0, y: 0, z: 0 }, type: SpaceObjectType.PAYLOAD } as DetailedSatellite];

    const toastSpy = jest.spyOn(keepTrackApi.getUiManager(), 'toast');

    selectSatManager.selectSat(0);

    expect(toastSpy).toHaveBeenCalledWith('Object is inside the Earth, cannot select it', ToastMsgType.caution);
    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should handle switching to a non-existent secondary satellite', () => {
    expect(selectSatManager.secondarySatObj).toBe(null);
    selectSatManager.setSecondarySat(0);
    expect(selectSatManager.secondarySatObj).not.toBe(null);
    selectSatManager.setSecondarySat(999);
    expect(selectSatManager.secondarySatObj).toBe(null);
  });

  it('should clear selected orbit when deselecting a satellite', () => {
    keepTrackApi.getCatalogManager().objectCache[0].position = {
      x: 10000 as Kilometers,
      y: 10000 as Kilometers,
      z: 10000 as Kilometers,
    };
    const clearSelectOrbitSpy = jest.spyOn(keepTrackApi.getOrbitManager(), 'clearSelectOrbit');

    selectSatManager.selectSat(0);

    expect(selectSatManager.lastSelectedSat()).toBe(0);

    selectSatManager.selectSat(-1);
    expect(selectSatManager.lastSelectedSat()).toBe(-1);

    expect(clearSelectOrbitSpy).toHaveBeenCalled();
  });

  it('should handle satellite selection with no active satellites', () => {
    keepTrackApi.getCatalogManager().objectCache.forEach((sat) => {
      sat.active = false;
    });

    selectSatManager.selectSat(0);

    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should handle satellite selection with no satellites in cache', () => {
    keepTrackApi.getCatalogManager().objectCache = [];

    selectSatManager.selectSat(0);

    expect(selectSatManager.selectedSat).toBe(-1);
  });
});
