import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SimulationCleaners } from '@app/engine/simulation/simulation-cleaners';
import { ModalConfirm } from '@app/engine/ui/modal-confirm';
import { t7e } from '@app/locales/keys';
import { registerBuiltInSimulationCleaners } from './builtin-cleaners';

/** Remove everything the registered cleaners own, then toast the result. Returns the total removed. */
export const clearAllSimulations = (): number => {
  registerBuiltInSimulationCleaners();
  const cleared = SimulationCleaners.clearAll();
  const total = cleared.reduce((sum, c) => sum + c.count, 0);

  ServiceLocator.getUiManager().doSearch('');
  ServiceLocator.getUiManager().toast(
    total > 0 ? t7e('simulationCleaners.cleared').replace('{count}', total.toString()) : t7e('simulationCleaners.nothingToClear'),
    total > 0 ? ToastMsgType.normal : ToastMsgType.standby
  );

  return total;
};

/** Confirmation text: one line per category with its count. */
export const buildClearAllMessage = (): string => {
  const lines = SimulationCleaners.getActive()
    .map((c) => `<li>${c.label}: ${c.count}</li>`)
    .join('');

  return `${t7e('simulationCleaners.confirmMessage')}<ul>${lines}</ul>`;
};

/** Entry point for the command palette command and menu buttons. */
export const confirmAndClearAllSimulations = (): void => {
  registerBuiltInSimulationCleaners();

  if (SimulationCleaners.totalCount() === 0) {
    ServiceLocator.getUiManager().toast(t7e('simulationCleaners.nothingToClear'), ToastMsgType.standby);

    return;
  }

  ModalConfirm.getInstance().open(() => clearAllSimulations(), {
    title: t7e('simulationCleaners.confirmTitle'),
    message: buildClearAllMessage(),
    confirmText: t7e('simulationCleaners.confirmButton'),
    cancelText: t7e('modalConfirm.cancel'),
    isDestructive: true,
  });
};
