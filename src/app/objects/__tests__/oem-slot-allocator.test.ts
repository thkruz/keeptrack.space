import { OemSlotAllocator } from '@app/app/objects/oem-slot-allocator';
import { Planet } from '@app/app/objects/planet';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('OemSlotAllocator', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    // settingsManager is a shared global; reset the slot count each test so a
    // prior test's override (e.g. 0) doesn't leak into the next.
    settingsManager.maxOemSatellites = 200;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Minimal OEM-satellite stand-in: free() only needs the id and the two orbit removers. */
  const makeOemSat = (id: number) => ({
    id,
    removeOrbitHistory: vi.fn(),
    removeFullOrbitPath: vi.fn(),
  });

  describe('allocate', () => {
    it('returns the first reserved slot when none are occupied by an OemSatellite', () => {
      const catalogManager = ServiceLocator.getCatalogManager();

      catalogManager.numSatellites = 5;

      expect(OemSlotAllocator.allocate()).toBe(5);
    });

    it('returns null when there are no reserved slots to scan', () => {
      const catalogManager = ServiceLocator.getCatalogManager();

      catalogManager.numSatellites = 5;
      settingsManager.maxOemSatellites = 0;

      expect(OemSlotAllocator.allocate()).toBeNull();
    });
  });

  describe('free', () => {
    it('resets the slot to a named Planet placeholder', () => {
      const catalogManager = ServiceLocator.getCatalogManager();

      catalogManager.numSatellites = 5;
      const satId = 7;

      OemSlotAllocator.free(makeOemSat(satId) as never);

      const placeholder = catalogManager.objectCache[satId];

      expect(placeholder).toBeInstanceOf(Planet);
      expect(placeholder.name).toBe(`OEM Satellite ${(satId - catalogManager.numSatellites + 1).toString()}`);
    });

    it('removes the orbit history and full-orbit path of the freed satellite', () => {
      ServiceLocator.getCatalogManager().numSatellites = 5;
      const oemSat = makeOemSat(6);

      OemSlotAllocator.free(oemSat as never);

      expect(oemSat.removeOrbitHistory).toHaveBeenCalled();
      expect(oemSat.removeFullOrbitPath).toHaveBeenCalled();
    });

    it('deselects the freed satellite when it is the current selection', () => {
      ServiceLocator.getCatalogManager().numSatellites = 5;
      const satId = 6;

      vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue({ id: satId } as never);
      const selectSpy = vi.spyOn(SelectSatManager.prototype, 'selectSat').mockImplementation(() => undefined as never);

      OemSlotAllocator.free(makeOemSat(satId) as never);

      expect(selectSpy).toHaveBeenCalledWith(-1);
    });

    it('leaves the selection alone when a different satellite is selected', () => {
      ServiceLocator.getCatalogManager().numSatellites = 5;

      vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue({ id: 999 } as never);
      const selectSpy = vi.spyOn(SelectSatManager.prototype, 'selectSat').mockImplementation(() => undefined as never);

      OemSlotAllocator.free(makeOemSat(6) as never);

      expect(selectSpy).not.toHaveBeenCalled();
    });

    it('makes the freed slot allocatable again', () => {
      const catalogManager = ServiceLocator.getCatalogManager();

      catalogManager.numSatellites = 5;

      OemSlotAllocator.free(makeOemSat(5) as never);

      // The slot now holds a Planet placeholder, so the allocator hands it back.
      expect(OemSlotAllocator.allocate()).toBe(5);
    });
  });
});
