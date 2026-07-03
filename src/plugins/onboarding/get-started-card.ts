import { getEl } from '@app/engine/utils/get-el';
import type { ChecklistMission } from './checklist';
import type { OnboardingState } from './onboarding-state';
import { l } from './onboarding-t7e';

export interface GetStartedCardOptions {
  getMissions: () => ChecklistMission[];
  getState: () => OnboardingState;
  onLaunch: (missionId: string) => void;
  onDismiss: () => void;
}

const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The Storybook-style "Get started" card pinned at the top of the plugin
 * drawer: header with a progress ring, mission rows that deep-link and check
 * themselves off, a persisted dismiss X, and self-removal at 100 percent.
 * Renders into the dedicated #drawer-getting-started-slot (outside
 * #drawer-content, which the drawer rebuilds with innerHTML).
 */
export class GetStartedCard {
  private readonly options_: GetStartedCardOptions;

  constructor(options: GetStartedCardOptions) {
    this.options_ = options;
  }

  /** Rebuilds the card to match current state. Safe to call repeatedly. */
  render(): void {
    const slot = getEl('drawer-getting-started-slot', true);

    if (!slot) {
      return;
    }

    const state = this.options_.getState();

    if (state.isCardDismissed || state.status === 'not-started' || state.status === 'in-progress') {
      slot.innerHTML = '';

      return;
    }

    const missions = this.options_.getMissions().filter((mission) => mission.isVisible?.(state) !== false);
    const doneCount = missions.filter((mission) => state.checklist[mission.id] === true).length;
    const percent = missions.length === 0 ? 100 : Math.round((doneCount / missions.length) * 100);

    if (percent >= 100) {
      slot.innerHTML =
        '<div class="kt-get-started-card kt-get-started-complete">' +
        `<span class="kt-get-started-title">${l('card.allSet')}</span>` +
        `<button type="button" class="kt-get-started-dismiss" aria-label="${l('card.dismiss')}">&#x2715;</button>` +
        '</div>';
      slot.querySelector('.kt-get-started-dismiss')?.addEventListener('click', () => this.options_.onDismiss());

      return;
    }

    const offset = RING_CIRCUMFERENCE * (1 - percent / 100);
    const rows = missions
      .map((mission) => {
        const isDone = state.checklist[mission.id] === true;
        const doneClass = isDone ? ' kt-get-started-row-done' : '';

        return (
          `<button type="button" class="kt-get-started-row${doneClass}" data-mission-id="${mission.id}">` +
          `<span class="kt-get-started-check">${isDone ? '&#x2713;' : ''}</span>` +
          `<span class="kt-get-started-row-label">${mission.label()}</span>` +
          '</button>'
        );
      })
      .join('');

    slot.innerHTML =
      '<div class="kt-get-started-card">' +
      '<div class="kt-get-started-header">' +
      `<span class="kt-get-started-title">${l('card.title')}</span>` +
      '<span class="kt-get-started-progress">' +
      '<svg class="kt-get-started-ring" viewBox="0 0 24 24" aria-hidden="true">' +
      `<circle class="kt-get-started-ring-bg" cx="12" cy="12" r="${RING_RADIUS}"></circle>` +
      `<circle class="kt-get-started-ring-fg" cx="12" cy="12" r="${RING_RADIUS}"` +
      ` stroke-dasharray="${RING_CIRCUMFERENCE.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>` +
      '</svg>' +
      `<span class="kt-get-started-percent">${percent}%</span>` +
      '</span>' +
      `<button type="button" class="kt-get-started-dismiss" aria-label="${l('card.dismiss')}">&#x2715;</button>` +
      '</div>' +
      `<div class="kt-get-started-rows">${rows}</div>` +
      '</div>';

    slot.querySelector('.kt-get-started-dismiss')?.addEventListener('click', () => this.options_.onDismiss());
    slot.querySelectorAll('[data-mission-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const missionId = (el as HTMLElement).dataset.missionId;

        if (missionId) {
          this.options_.onLaunch(missionId);
        }
      });
    });
  }
}
