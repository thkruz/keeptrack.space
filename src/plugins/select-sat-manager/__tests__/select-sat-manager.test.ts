/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { Satellite, Kilometers, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { defaultSat, defaultSensor } from '../../../../test/environment/apiMocks';
import { setupStandardEnvironment } from '../../../../test/environment/standard-env';
import { standardPluginSuite, websiteInit } from '../../../../test/generic-tests';

describe('SelectSatManager_dots', () => {
  let selectSatManager: SelectSatManager;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
    selectSatManager = new SelectSatManager();
  });

  standardPluginSuite(SelectSatManager, 'SelectSatManager');

  it('should be able to select a satellite', () => {
    ServiceLocator.getCatalogManager().objectCache = [
      {
        ...defaultSat, position: {
          x: 10000,
          y: 10000,
          z: 10000,
        },
      } as Satellite,
    ];
    ServiceLocator.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array<ArrayBuffer>;
    ServiceLocator.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    ServiceLocator.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;

    selectSatManager.selectSat(0);
    expect(selectSatManager.selectedSat).toBe(0);

    selectSatManager.checkIfSelectSatVisible();
  });

  it('should be able to select a sensor dot', () => {
    selectSatManager.init();

    websiteInit(new SatInfoBox());
    ServiceLocator.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array<ArrayBuffer>;
    ServiceLocator.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    ServiceLocator.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    ServiceLocator.getCatalogManager().objectCache = [defaultSensor as DetailedSensor];
    selectSatManager.selectSat(0);
  });
});
describe('SelectSatManager_class', () => {
  let selectSatManager: SelectSatManager;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
    selectSatManager = new SelectSatManager();

    ServiceLocator.getCatalogManager().objectCache = [
      new Satellite(defaultSat),
      new Satellite({ ...defaultSat, id: 1 }),
    ];
    // Set all satellites to active
    ServiceLocator.getCatalogManager().objectCache.forEach((sat) => {
      sat.active = true;
      (sat as unknown as { position: TemeVec3 }).position = {
        x: 10000 as Kilometers,
        y: 10000 as Kilometers,
        z: 10000 as Kilometers,
      } as TemeVec3;
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
    ServiceLocator.getCatalogManager().getObject = jest.fn().mockReturnValue(null);

    selectSatManager.selectSat(999);
    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should update dot size and color when a satellite is selected', () => {
    const updateDotSizeAndColorSpy = jest.spyOn(selectSatManager as any, 'updateDotSizeAndColor_');

    ServiceLocator.getCatalogManager().objectCache = [new Satellite({ ...defaultSat, ...{ id: 0, type: SpaceObjectType.PAYLOAD } })];
    ServiceLocator.getCatalogManager().objectCache.forEach((sat) => {
      sat.active = true;
      (sat as unknown as { position: TemeVec3 }).position = {
        x: 10000 as Kilometers,
        y: 10000 as Kilometers,
        z: 10000 as Kilometers,
      } as TemeVec3;
    });

    selectSatManager.selectSat(0);

    expect(updateDotSizeAndColorSpy).toHaveBeenCalledWith(0);
  });

  it('should not select a satellite inside the Earth', () => {
    ServiceLocator.getCatalogManager().objectCache = [{ id: 0, position: { x: 0, y: 0, z: 0 }, type: SpaceObjectType.PAYLOAD } as Satellite];

    const toastSpy = jest.spyOn(ServiceLocator.getUiManager(), 'toast');

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
    (ServiceLocator.getCatalogManager().objectCache[0] as unknown as { position: TemeVec3 }).position = {
      x: 10000 as Kilometers,
      y: 10000 as Kilometers,
      z: 10000 as Kilometers,
    } as TemeVec3;
    const clearSelectOrbitSpy = jest.spyOn(ServiceLocator.getOrbitManager(), 'clearSelectOrbit');

    selectSatManager.selectSat(0);

    expect(selectSatManager.lastSelectedSat()).toBe(0);

    selectSatManager.selectSat(-1);
    expect(selectSatManager.lastSelectedSat()).toBe(-1);

    expect(clearSelectOrbitSpy).toHaveBeenCalled();
  });

  it('should handle satellite selection with no active satellites', () => {
    ServiceLocator.getCatalogManager().objectCache.forEach((sat) => {
      sat.active = false;
    });

    selectSatManager.selectSat(0);

    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should handle satellite selection with no satellites in cache', () => {
    ServiceLocator.getCatalogManager().objectCache = [];

    selectSatManager.selectSat(0);

    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should handle selectPrevSat wrapping to last satellite', () => {
    const activeSats = ServiceLocator.getCatalogManager().getActiveSats();
    const lastSatId = activeSats[activeSats.length - 1].id;

    selectSatManager.selectSat(0);
    selectSatManager.selectPrevSat();

    expect(selectSatManager.selectedSat).toBe(lastSatId);
  });

  it('should handle selectNextSat wrapping to first satellite', () => {
    const activeSats = ServiceLocator.getCatalogManager().getActiveSats();
    const lastSatId = activeSats[activeSats.length - 1].id;

    selectSatManager.selectSat(lastSatId);
    selectSatManager.selectNextSat();

    expect(selectSatManager.selectedSat).toBe(0);
  });

  it('should return correct keyboard shortcuts', () => {
    const shortcuts = selectSatManager.getKeyboardShortcuts();

    expect(shortcuts).toHaveLength(4);
    expect(shortcuts[0].key).toBe('[');
    expect(shortcuts[1].key).toBe(']');
    expect(shortcuts[2].key).toBe('{');
    expect(shortcuts[3].key).toBe('}');
  });

  it('should not select satellite when isDisableSelectSat is true', () => {
    settingsManager.isDisableSelectSat = true;

    selectSatManager.selectSat(0);

    expect(selectSatManager.selectedSat).toBe(-1);

    settingsManager.isDisableSelectSat = false;
  });

  it('should not set secondary satellite when isDisableSelectSat is true', () => {
    settingsManager.isDisableSelectSat = true;

    selectSatManager.setSecondarySat(1);

    expect(selectSatManager.secondarySat).toBe(-1);

    settingsManager.isDisableSelectSat = false;
  });

  it('should clear secondary satellite when selecting same as primary', () => {
    selectSatManager.selectSat(0);
    selectSatManager.setSecondarySat(1);

    expect(selectSatManager.secondarySat).toBe(1);

    selectSatManager.setSecondarySat(0);

    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should clear primary satellite when setting secondary to same value', () => {
    selectSatManager.selectSat(1);
    selectSatManager.setSecondarySat(0);

    expect(selectSatManager.selectedSat).toBe(1);

    selectSatManager.setSecondarySat(1);

    expect(selectSatManager.selectedSat).toBe(-1);
  });

  it('should handle getSelectedSat method', () => {
    selectSatManager.selectSat(0);

    const selectedSat = selectSatManager.getSelectedSat();

    expect(selectedSat).toBeDefined();
    expect(selectedSat.id).toBe(0);
  });

  it('should update lastSelectedSat when value is provided', () => {
    selectSatManager.lastSelectedSat(5);

    expect(selectSatManager.lastSelectedSat()).toBe(5);
  });

  it('should return lastSelectedSat without updating when no value provided', () => {
    selectSatManager.lastSelectedSat(3);

    const result = selectSatManager.lastSelectedSat();

    expect(result).toBe(3);
  });

  it('should handle invalid covariance matrix for primary satellite', () => {
    const invalidSat = new Satellite({
      ...defaultSat,
      id: 0,
      type: SpaceObjectType.PAYLOAD,
    });

    ServiceLocator.getCatalogManager().objectCache = [invalidSat];
    invalidSat.active = true;
    invalidSat.position = { x: 10000 as Kilometers, y: 10000 as Kilometers, z: 10000 as Kilometers };

    selectSatManager.selectSat(0);

    expect(selectSatManager.primarySatCovMatrix).toBeDefined();
  });
});
