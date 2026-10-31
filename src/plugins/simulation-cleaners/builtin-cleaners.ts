import { SimulationCleaners } from '@app/engine/simulation/simulation-cleaners';
import { t7e } from '@app/locales/keys';
import { missileManager } from '@app/plugins/missile/missile-manager';
import { clearAnalystSats, getActiveAnalystSats } from './analyst-slots';

export const MISSILE_CLEANER_ID = 'missiles';
export const BREAKUP_CLEANER_ID = 'breakup-debris';
export const CREATED_SATS_CLEANER_ID = 'created-satellites';

/** Clear a class of analyst satellites (see analyst-slots.ts for the classification). */
const analystCleaner = (kind: 'breakup' | 'created') => ({
  count: () => getActiveAnalystSats(kind).length,
  clear: () => clearAnalystSats(getActiveAnalystSats(kind).map((s) => s.id)),
});

/**
 * Register the cleaners that live in the open-source build. Idempotent. Pro plugins register their
 * own (interceptors, maneuver clones) when they load. Pro cleaners use a lower `order` so they run
 * first: interceptors share the missile slot block, so their own state is torn down before the
 * missile slots are wiped.
 */
export const registerBuiltInSimulationCleaners = (): void => {
  SimulationCleaners.register({
    id: MISSILE_CLEANER_ID,
    label: () => t7e('simulationCleaners.categories.missiles'),
    order: 60,
    count: () => missileManager.missilesInUse,
    clear: () => missileManager.clearMissiles(),
  });
  SimulationCleaners.register({
    id: BREAKUP_CLEANER_ID,
    label: () => t7e('simulationCleaners.categories.breakup'),
    order: 70,
    ...analystCleaner('breakup'),
  });
  SimulationCleaners.register({
    id: CREATED_SATS_CLEANER_ID,
    label: () => t7e('simulationCleaners.categories.created'),
    order: 80,
    ...analystCleaner('created'),
  });
};
