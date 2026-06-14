import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import { OemSatellite } from './oem-satellite';
import { Planet } from './planet';

/**
 * Allocates object-cache slots for OEM-backed satellites.
 *
 * The catalog loader reserves `settingsManager.maxOemSatellites` placeholder slots
 * starting at `catalogManager.numSatellites`. Several plugins (OEM Reader, Deep Space
 * Missions, New Launch trajectories) create OemSatellite instances in these slots.
 * They must share one allocator: independent per-plugin counters hand out the same id
 * twice, and the second `objectCache[id] = sat` silently overwrites the first.
 *
 * A slot is occupied when its cache entry is an OemSatellite (PhasedOrbitSatellite
 * extends OemSatellite). Removing an OEM satellite resets the slot to its Planet
 * placeholder, which automatically frees it for reuse here.
 */
export class OemSlotAllocator {
  /**
   * Returns the id of the first free OEM slot, or null when every reserved slot is
   * already occupied. Callers must handle the null case (toast/throw) instead of
   * writing past the reserved range.
   */
  static allocate(): number | null {
    const catalogManager = ServiceLocator.getCatalogManager();
    const firstSlot = catalogManager.numSatellites;

    for (let i = 0; i < settingsManager.maxOemSatellites; i++) {
      if (!(catalogManager.objectCache[firstSlot + i] instanceof OemSatellite)) {
        return firstSlot + i;
      }
    }

    return null;
  }

  /**
   * Frees the slot occupied by an OEM-backed satellite, reversing {@link allocate}.
   *
   * Deselects the object first (so the mesh manager never dereferences a slot that
   * is about to be swapped out), removes its orbit history and full-orbit path, then
   * resets the slot to the unused Planet placeholder the catalog loader originally
   * reserved. Resetting to a Planet (not an OemSatellite) is what makes the slot
   * reusable by {@link allocate}.
   */
  static free(oemSat: OemSatellite): void {
    const catalogManager = ServiceLocator.getCatalogManager();
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

    // Deselect BEFORE swapping the cache entry to prevent the mesh manager from
    // accessing a null/replaced object.
    if (selectSatManager?.getSelectedSat()?.id === oemSat.id) {
      selectSatManager.selectSat(-1);
    }

    oemSat.removeOrbitHistory();
    oemSat.removeFullOrbitPath();

    // Reset the slot back to its original unused Planet placeholder
    const oemSlotNum = oemSat.id - catalogManager.numSatellites + 1;

    catalogManager.objectCache[oemSat.id] = new Planet({
      id: oemSat.id,
      name: `OEM Satellite ${oemSlotNum}`,
    });
  }
}
