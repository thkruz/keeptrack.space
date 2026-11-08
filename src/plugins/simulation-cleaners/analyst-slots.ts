import { AnalystSlotReservations } from '@app/app/data/analyst-slot-reservations';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { clearBreakupPieces } from '@app/plugins/breakup/breakup-runner';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite } from '@ootk/src/main';

/** Name prefix runBreakup gives every generated fragment (see breakup-runner.ts). */
export const BREAKUP_PIECE_NAME_PREFIX = 'Breakup Piece';

export type AnalystSatKind = 'breakup' | 'maneuver' | 'created';

/** Which tool made an active analyst satellite. Maneuver clones carry `derivedFromSccNum`. */
export const classifyAnalystSat = (sat: Satellite): AnalystSatKind => {
  if (sat.derivedFromSccNum) {
    return 'maneuver';
  }

  return sat.name.startsWith(BREAKUP_PIECE_NAME_PREFIX) ? 'breakup' : 'created';
};

/**
 * Every active satellite in the analyst slot block (NORAD 90000+), excluding slots another object
 * has reserved (a New Launch trajectory is a separate object that merely borrows the id).
 */
export const getActiveAnalystSats = (kind?: AnalystSatKind): Satellite[] => {
  const catalog = ServiceLocator.getCatalogManager();
  const first = catalog.sccNum2Id(CatalogManager.ANALYST_START_ID);
  const found: Satellite[] = [];

  if (first === null || first < 0) {
    return found;
  }

  for (let i = 0; i < settingsManager.maxAnalystSats; i++) {
    const obj = catalog.objectCache[first + i];

    if (!(obj instanceof Satellite) || !obj.active || AnalystSlotReservations.isReserved(obj.sccNum)) {
      continue;
    }
    if (!kind || classifyAnalystSat(obj) === kind) {
      found.push(obj);
    }
  }

  return found;
};

/**
 * Return analyst slots to their reserved, inactive state and bring the rest of the app in line:
 * the selection is dropped when it was one of them, orbit and position buffers are reset (via the
 * breakup clear path), the search box is emptied when it held a query, and the color worker is told.
 */
export const clearAnalystSats = (ids: number[]): void => {
  if (ids.length === 0) {
    return;
  }

  const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

  if (selectSatManager && ids.includes(selectSatManager.secondarySat)) {
    selectSatManager.setSecondarySat(-1, true);
  }
  if (selectSatManager && ids.includes(selectSatManager.selectedSat)) {
    selectSatManager.selectSat(-1);
  }

  clearBreakupPieces(ids);

  const searchInput = getEl('search', true) as HTMLInputElement | null;

  if (searchInput && searchInput.value.trim() !== '') {
    searchInput.value = '';
    ServiceLocator.getUiManager().doSearch('');
  }

  ServiceLocator.getColorSchemeManager().notifyObjectsChanged();
};
