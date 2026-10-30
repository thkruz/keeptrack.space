/**
 * Shared results-row behaviors for the Conjunctions family.
 *
 * These wrap the interactions every conjunction tool performs when a user
 * clicks an approach: jump the simulation clock to the event, and draw the line
 * between the two objects, plus selecting the pair. Centralizing them keeps the
 * behavior (and bug fixes) consistent across TOCA/POCA, Close Objects, and
 * Debris Screening.
 */

import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite } from '@ootk/src/main';

type LineObject = Satellite | MissileObject | OemSatellite | null;

/** Minimal handle to a LineManager line owned by a plugin (for removal). */
export interface RemovableLine {
  isGarbage: boolean;
}

/**
 * Jump the simulation clock to `leadMs` before a time of closest approach,
 * without changing the propagation rate (paused stays paused, running stays
 * running - per the secondary-menu convention). `tcaMs` is an absolute epoch
 * (ms); `leadMs` defaults to 0 (jump exactly to TCA).
 */
export const jumpToTca = (tcaMs: number, leadMs = 0): void => {
  ServiceLocator.getTimeManager().changeSimulationTime(tcaMs - leadMs);
};

/**
 * Draw (replacing any prior) a line between two objects and return the new
 * removable handle. Pass the previous handle so it is garbage-collected first;
 * returns null when either object is missing. Best-effort: callers should not
 * let a rendering failure break the time jump / selection.
 */
export const drawPairLine = (previous: RemovableLine | null, objA: LineObject, objB: LineObject, color = LineColors.YELLOW): RemovableLine | null => {
  if (previous) {
    previous.isGarbage = true;
  }

  if (!objA || !objB) {
    return null;
  }

  return ServiceLocator.getLineManager().createObjToObj(objA, objB, color);
};

/**
 * Select a conjunction pair: `primaryId` becomes the selected object and
 * `secondaryId` the secondary (catalog ids). The secondary toast is suppressed:
 * the row click itself, and the camera moving to the primary, are the feedback.
 * Returns false (selecting nothing) when either id is missing or both are the
 * same object.
 */
export const selectPair = (primaryId: number | null, secondaryId: number | null): boolean => {
  if (typeof primaryId !== 'number' || typeof secondaryId !== 'number' || primaryId < 0 || secondaryId < 0 || primaryId === secondaryId) {
    return false;
  }

  const selection = PluginRegistry.getPlugin(SelectSatManager);

  if (!selection) {
    return false;
  }

  selection.selectSat(primaryId);
  selection.setSecondarySat(secondaryId, true);

  return true;
};
