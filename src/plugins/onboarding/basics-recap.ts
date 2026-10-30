import { l } from './onboarding-t7e';
import { isCatalogLoaded } from './tour-steps';

/**
 * The Basics task steps the bridge recap reports on. Informational steps
 * (zoom, info panel, drawer) have no action to verify, so they are not listed.
 */
export const BASICS_RECAP_TASKS: { stepId: string; labelKey: string; needsCatalog?: boolean }[] = [
  { stepId: 'b1-globe', labelKey: 'bridge.tasks.spin' },
  { stepId: 'b3-search', labelKey: 'bridge.tasks.search', needsCatalog: true },
  { stepId: 'b4-select', labelKey: 'bridge.tasks.select', needsCatalog: true },
  { stepId: 'b6-time', labelKey: 'bridge.tasks.time' },
];

/**
 * Builds the bridge-card recap: tasks the user performed themselves are
 * checked off under "Done", the rest are listed under "Try next". A run with
 * only Next presses therefore claims nothing. Catalog-dependent tasks are left
 * out of "Try next" when no catalog is loaded (they could not work).
 */
export const buildBasicsRecapHtml = (doneStepIds: readonly string[]): string => {
  const hasCatalog = isCatalogLoaded();
  const done = BASICS_RECAP_TASKS.filter((task) => doneStepIds.includes(task.stepId));
  const todo = BASICS_RECAP_TASKS.filter((task) => !doneStepIds.includes(task.stepId) && (!task.needsCatalog || hasCatalog));

  const group = (kind: 'done' | 'todo', labelKey: string, tasks: typeof BASICS_RECAP_TASKS): string => {
    if (tasks.length === 0) {
      return '';
    }

    const items = tasks
      .map((task) => {
        const check = kind === 'done' ? '<span class="kt-tour-recap-check" aria-hidden="true">&#x2713;</span>' : '';

        return `<li class="kt-tour-recap-item" data-recap-step="${task.stepId}">${check}${l(task.labelKey)}</li>`;
      })
      .join('');

    return `<div class="kt-tour-recap-group kt-tour-recap-${kind}"><div class="kt-tour-recap-label">${l(labelKey)}</div><ul class="kt-tour-recap">${items}</ul></div>`;
  };

  return group('done', 'bridge.doneLabel', done) + group('todo', 'bridge.tryNextLabel', todo);
};
