import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { l } from '../onboarding-t7e';
import type { TourStep } from '../tour-engine';
import { advanceWhenMenuOpens, DO_IT_FOR_ME_HINT_MS, drawerItemTarget, isPluginUsable, isVisible, openDrawerAt, TASK_RESULT_DWELL_MS } from '../tour-steps';
import type { ChapterDefinition } from './chapter-types';

const SCENARIO_MENU_IDS = ['ScenarioManagementMenu'];

const step = (key: string) => ({
  title: l(`chapters.time.steps.${key}.title`),
  body: l(`chapters.time.steps.${key}.body`),
});

const timeControlsTarget = (): HTMLElement | null => {
  const vcr = getEl('vcr-play-pause-btn', true)?.parentElement ?? null;

  return isVisible(vcr) ? vcr : getEl('datetime', true);
};

/** Chapter 3: Time & Scenarios (~2.5 min, task-verified, no catalog needed). */
export const timeChapter: ChapterDefinition = {
  id: 'time',
  title: () => l('chapters.time.title'),
  description: () => l('chapters.time.description'),
  minutes: 2.5,
  buildSteps: (): TourStep[] => [
    {
      id: 't1-speed-up',
      kind: 'coachmark',
      ...step('speedUp'),
      target: () => getEl('datetime', true),
      placement: 'bottom',
      advanceOn: {
        event: EventBusEvent.propRateChanged,
        predicate: (...args: unknown[]) => (args[0] as number) > 1,
        timeoutHintMs: DO_IT_FOR_ME_HINT_MS,
        dwellMs: TASK_RESULT_DWELL_MS,
      },
      actionButton: {
        label: l('buttons.doItForMe'),
        action: () => ServiceLocator.getTimeManager().changePropRate(10),
      },
    },
    {
      id: 't2-pause-rewind',
      kind: 'coachmark',
      ...step('pauseRewind'),
      target: timeControlsTarget,
      placement: 'bottom',
      advanceOn: {
        event: EventBusEvent.propRateChanged,
        predicate: (...args: unknown[]) => (args[0] as number) <= 0,
        timeoutHintMs: DO_IT_FOR_ME_HINT_MS,
        dwellMs: TASK_RESULT_DWELL_MS,
      },
      actionButton: {
        label: l('buttons.doItForMe'),
        action: () => ServiceLocator.getTimeManager().changePropRate(0),
      },
    },
    {
      id: 't3-jump-to-moment',
      kind: 'coachmark',
      ...step('jumpToMoment'),
      target: () => getEl('datetime', true),
      placement: 'bottom',
      advanceOn: {
        event: EventBusEvent.staticOffsetChange,
        timeoutHintMs: DO_IT_FOR_ME_HINT_MS,
        dwellMs: TASK_RESULT_DWELL_MS,
      },
      actionButton: {
        label: l('buttons.doItForMe'),
        action: () => {
          const timeManager = ServiceLocator.getTimeManager();

          timeManager.changeStaticOffset(timeManager.staticOffset + 60 * 60 * 1000);
        },
      },
    },
    {
      id: 't4-time-slider',
      kind: 'coachmark',
      ...step('timeSlider'),
      isAvailable: () => isVisible(getEl('time-slider-container', true)),
      target: () => getEl('time-slider-container', true),
      placement: 'top',
      advanceOn: { event: EventBusEvent.staticOffsetChange, dwellMs: TASK_RESULT_DWELL_MS },
    },
    {
      id: 't5-scenarios',
      kind: 'coachmark',
      ...step('scenarios'),
      isAvailable: () => isPluginUsable(SCENARIO_MENU_IDS),
      beforeEnter: () => openDrawerAt(SCENARIO_MENU_IDS),
      target: () => drawerItemTarget(SCENARIO_MENU_IDS),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens(SCENARIO_MENU_IDS),
    },
    {
      id: 't6-back-to-now',
      kind: 'coachmark',
      ...step('backToNow'),
      target: () => getEl('datetime', true),
      placement: 'bottom',
      actionButton: {
        label: l('buttons.doItForMe'),
        action: () => {
          const timeManager = ServiceLocator.getTimeManager();

          timeManager.changeStaticOffset(0);
          timeManager.changePropRate(1);
        },
      },
    },
  ],
};
