/* eslint-disable dot-notation */
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SatelliteFov } from '@app/plugins/satellite-fov/satellite-fov';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const mkCone = (id: number, name: string, targetObj?: { id: number; name: string }) => ({
  id,
  obj: { id, name },
  targetObj,
  editSettings: vi.fn(),
});

/** A coneFactory double that mirrors the real ConeMeshFactory surface used by SatelliteFov. */
const installFactory = () => {
  const factory = {
    earthCenterMeshes: [] as ReturnType<typeof mkCone>[],
    satToSatMeshes: [] as ReturnType<typeof mkCone>[],
    checkCacheForMesh_: vi.fn().mockReturnValue(null),
    generateMesh: vi.fn(),
    remove: vi.fn(),
    removeByObjectId: vi.fn(),
    removeBySourceAndTarget: vi.fn(),
    editSettings: vi.fn(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ServiceLocator.getScene() as any).coneFactory = factory;

  return factory;
};

describe('SatelliteFov cone management', () => {
  let plugin: SatelliteFov;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  let factory: ReturnType<typeof installFactory>;
  let sm: SelectSatManager;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new SatelliteFov();
    websiteInit(plugin);
    factory = installFactory();
    sm = PluginRegistry.getPlugin(SelectSatManager)!;
    sm.getSelectedSat = () => defaultSat as never;
  });

  afterEach(() => vi.restoreAllMocks());

  describe('toggleFovCone_ (C shortcut)', () => {
    it('creates a cone when none is cached', () => {
      factory.checkCacheForMesh_.mockReturnValue(null);

      p().toggleFovCone_();

      expect(factory.generateMesh).toHaveBeenCalledWith(defaultSat);
    });

    it('removes the cone when one is cached', () => {
      factory.checkCacheForMesh_.mockReturnValue({ id: 42 });

      p().toggleFovCone_();

      expect(factory.remove).toHaveBeenCalledWith(42);
    });

    it('does nothing when no satellite is selected', () => {
      sm.getSelectedSat = () => null as never;

      p().toggleFovCone_();

      expect(factory.generateMesh).not.toHaveBeenCalled();
    });
  });

  describe('toggleSatToSatCone_ (V shortcut)', () => {
    it('returns early without a secondary satellite', () => {
      sm.secondarySatObj = null;

      p().toggleSatToSatCone_();

      expect(factory.generateMesh).not.toHaveBeenCalled();
    });

    it('removes an existing sat-to-sat cone', () => {
      sm.secondarySatObj = { id: 1 } as never;
      factory.checkCacheForMesh_.mockReturnValue({ id: 7 });

      p().toggleSatToSatCone_();

      expect(factory.removeBySourceAndTarget).toHaveBeenCalledWith(defaultSat.id, 1);
    });

    it('generates a sat-to-sat cone toward the secondary satellite', () => {
      sm.secondarySatObj = { id: 1 } as never;
      factory.checkCacheForMesh_.mockReturnValue(null);

      p().toggleSatToSatCone_();

      expect(factory.generateMesh).toHaveBeenCalledWith(defaultSat, expect.objectContaining({ targetObj: { id: 1 } }));
    });
  });

  describe('handleUseSecondarySat_', () => {
    it('toasts when no secondary satellite is selected', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);

      sm.secondarySatObj = null;
      p().handleUseSecondarySat_();

      expect(toast).toHaveBeenCalled();
    });

    it('populates the target field with the secondary sccNum', () => {
      sm.secondarySatObj = { sccNum5: null, sccNum: '25544' } as never;

      p().handleUseSecondarySat_();

      expect((getEl('sat-fov-s2s-target-scc') as HTMLInputElement).value).toBe('25544');
    });
  });

  describe('handleCreateSatToSat_', () => {
    const setScc = (v: string) => {
      (getEl('sat-fov-s2s-target-scc') as HTMLInputElement).value = v;
    };

    it('toasts when no source satellite is selected', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);

      sm.getSelectedSat = () => null as never;
      p().handleCreateSatToSat_();

      expect(toast).toHaveBeenCalled();
      expect(factory.generateMesh).not.toHaveBeenCalled();
    });

    it('toasts when the target catalog number is empty', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);

      setScc('');
      p().handleCreateSatToSat_();

      expect(toast).toHaveBeenCalled();
    });

    it('toasts when the target is not found in the catalog', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);
      const catalog = ServiceLocator.getCatalogManager();

      catalog.sccNum2Id = vi.fn().mockReturnValue(null);
      setScc('99999');
      p().handleCreateSatToSat_();

      expect(toast).toHaveBeenCalled();
      expect(factory.generateMesh).not.toHaveBeenCalled();
    });

    it('toasts when the target equals the source', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);
      const catalog = ServiceLocator.getCatalogManager();

      catalog.sccNum2Id = vi.fn().mockReturnValue(0);
      catalog.getObject = vi.fn().mockReturnValue({ id: defaultSat.id }) as never;
      setScc('00005');
      p().handleCreateSatToSat_();

      expect(toast).toHaveBeenCalled();
      expect(factory.generateMesh).not.toHaveBeenCalled();
    });

    it('toasts when the FOV angle is out of range', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);
      const catalog = ServiceLocator.getCatalogManager();

      catalog.sccNum2Id = vi.fn().mockReturnValue(1);
      catalog.getObject = vi.fn().mockReturnValue({ id: 1 }) as never;
      setScc('25544');
      (getEl('sat-fov-s2s-fov-angle') as HTMLInputElement).value = '500';
      p().handleCreateSatToSat_();

      expect(toast).toHaveBeenCalled();
      expect(factory.generateMesh).not.toHaveBeenCalled();
    });

    it('generates a cone for a valid target', () => {
      const catalog = ServiceLocator.getCatalogManager();

      catalog.sccNum2Id = vi.fn().mockReturnValue(1);
      catalog.getObject = vi.fn().mockReturnValue({ id: 1 }) as never;
      setScc('25544');
      (getEl('sat-fov-s2s-fov-angle') as HTMLInputElement).value = '3';
      p().handleCreateSatToSat_();

      expect(factory.generateMesh).toHaveBeenCalledWith(defaultSat, expect.objectContaining({ targetObj: { id: 1 } }));
    });
  });

  describe('readS2sColor_', () => {
    it('reads the four sat-to-sat color inputs', () => {
      (getEl('sat-fov-s2s-red') as HTMLInputElement).value = '0.4';
      (getEl('sat-fov-s2s-green') as HTMLInputElement).value = '0.6';
      (getEl('sat-fov-s2s-blue') as HTMLInputElement).value = '0.8';
      (getEl('sat-fov-s2s-opacity') as HTMLInputElement).value = '0.9';

      expect(p().readS2sColor_()).toEqual([0.4, 0.6, 0.8, 0.9]);
    });
  });

  describe('handleFormChange_', () => {
    it('edits the cached cone with the parsed settings', () => {
      const cone = mkCone(0, 'ISS');

      factory.checkCacheForMesh_.mockReturnValue(cone);
      (getEl('sat-fov-fov-angle') as HTMLInputElement).value = '5';

      p().handleFormChange_();

      expect(cone.editSettings).toHaveBeenCalledWith(expect.objectContaining({ fieldOfView: 5 }));
    });
  });

  describe('handleDefaultFormChange_', () => {
    it('rejects an out-of-range FOV and resets the field', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);

      (getEl('sat-fov-default-fov-angle') as HTMLInputElement).value = '999';
      p().handleDefaultFormChange_();

      expect(toast).toHaveBeenCalled();
      expect((getEl('sat-fov-default-fov-angle') as HTMLInputElement).value).toBe('3');
      expect(factory.editSettings).not.toHaveBeenCalled();
    });

    it('applies valid default settings to the factory', () => {
      (getEl('sat-fov-default-fov-angle') as HTMLInputElement).value = '4';
      (getEl('sat-fov-default-red') as HTMLInputElement).value = '0.2';
      (getEl('sat-fov-default-green') as HTMLInputElement).value = '0.5';
      (getEl('sat-fov-default-blue') as HTMLInputElement).value = '0.7';
      (getEl('sat-fov-default-opacity') as HTMLInputElement).value = '0.3';

      p().handleDefaultFormChange_();

      expect(factory.editSettings).toHaveBeenCalledWith(expect.objectContaining({ fieldOfView: 4 }));
    });
  });

  describe('cone list rendering', () => {
    // setInnerHtml defers the DOM write via requestIdleCallback (polyfilled as setTimeout);
    // the suite runs on fake timers, so advance them to flush the pending write.
    const flush = () => vi.advanceTimersByTimeAsync(1);

    it('disables the reset button and renders nothing when there are no earth-center cones', async () => {
      factory.earthCenterMeshes = [];

      p().updateEarthCenterConesList_();
      await flush();

      expect(getEl('reset-sat-fov-cones-button')!.getAttribute('disabled')).toBe('true');
      expect(getEl('sat-fov-active-cones')!.innerHTML).toBe('');
    });

    it('enables the reset button and renders a row per earth-center cone', async () => {
      factory.earthCenterMeshes = [mkCone(0, 'ISS'), mkCone(2, 'HST')];

      p().updateEarthCenterConesList_();
      await flush();

      expect(getEl('reset-sat-fov-cones-button')!.hasAttribute('disabled')).toBe(false);
      expect(getEl('sat-fov-active-cones')!.innerHTML).toContain('ISS');
      expect(getEl('sat-fov-active-cones')!.innerHTML).toContain('HST');
    });

    it('renders sat-to-sat cone rows with a source → target label', async () => {
      factory.satToSatMeshes = [mkCone(0, 'ISS', { id: 1, name: 'HST' })];

      p().updateSatToSatConesList_();
      await flush();

      expect(getEl('sat-fov-s2s-active-cones')!.innerHTML).toContain('ISS');
      expect(getEl('sat-fov-s2s-active-cones')!.innerHTML).toContain('HST');
    });
  });

  describe('getKeyboardShortcuts', () => {
    it('wires C to the FOV cone toggle and V to the sat-to-sat toggle', () => {
      const fov = vi.spyOn(plugin as never, 'toggleFovCone_' as never).mockImplementation(() => undefined);
      const s2s = vi.spyOn(plugin as never, 'toggleSatToSatCone_' as never).mockImplementation(() => undefined);
      const shortcuts = plugin.getKeyboardShortcuts();

      shortcuts.find((s) => s.key === 'C')!.callback();
      shortcuts.find((s) => s.key === 'V')!.callback();

      expect(fov).toHaveBeenCalled();
      expect(s2s).toHaveBeenCalled();
    });
  });
});
