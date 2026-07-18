import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { l } from '../onboarding-t7e';
import type { TourStep } from '../tour-engine';
import {
  advanceOnIconClick,
  advanceWhenMenuOpens,
  collapseUtilityFooter,
  DO_IT_FOR_ME_HINT_MS,
  drawerItemTarget,
  expandUtilityFooter,
  findPlugin,
  gatedStep,
  isPluginUsable,
  openDrawerAt,
  TASK_RESULT_DWELL_MS,
  utilityIconTarget,
} from '../tour-steps';
import type { ChapterDefinition } from './chapter-types';

const FLAT_MAP_IDS = ['FlatMapView'];
const POLAR_VIEW_IDS = ['PolarView'];

const step = (key: string) => ({
  title: l(`chapters.visualization.steps.${key}.title`),
  body: l(`chapters.visualization.steps.${key}.body`),
});

/** Emits the icon activation event for a plugin (same path as clicking it). */
const clickPluginIcon = (pluginIds: string | string[]): void => {
  const elementName = findPlugin(pluginIds)?.bottomIconElementName;

  if (elementName) {
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, elementName);
  }
};

/** Chapter 5: Visualization & Sharing (~2.5 min, mixed). */
export const visualizationChapter: ChapterDefinition = {
  id: 'visualization',
  title: () => l('chapters.visualization.title'),
  description: () => l('chapters.visualization.description'),
  minutes: 2.5,
  buildSteps: (): TourStep[] => [
    {
      id: 'v1-color-schemes',
      kind: 'coachmark',
      ...step('colorSchemes'),
      isAvailable: () => isPluginUsable('ColorMenu'),
      beforeEnter: () => openDrawerAt('ColorMenu'),
      target: () => drawerItemTarget('ColorMenu'),
      placement: 'right',
      advanceOn: { event: EventBusEvent.colorSchemeChanged, dwellMs: TASK_RESULT_DWELL_MS },
    },
    // Flat map, polar view, and the night toggle are UTILITY_ONLY plugins:
    // their icons live in the hover-expanded utility footer, so these steps
    // pin the footer open and anchor to the footer icon (a drawer-item anchor
    // would be null and the step would silently self-skip).
    gatedStep(
      FLAT_MAP_IDS,
      {
        id: 'v2-flat-map',
        kind: 'coachmark',
        ...step('flatMap'),
        isAvailable: () => isPluginUsable(FLAT_MAP_IDS) && utilityIconTarget(FLAT_MAP_IDS) !== null,
        beforeEnter: expandUtilityFooter,
        afterExit: collapseUtilityFooter,
        target: () => utilityIconTarget(FLAT_MAP_IDS),
        placement: 'top',
        advanceOn: {
          ...advanceOnIconClick(FLAT_MAP_IDS),
          timeoutHintMs: DO_IT_FOR_ME_HINT_MS,
        },
        actionButton: {
          label: l('buttons.doItForMe'),
          action: () => clickPluginIcon(FLAT_MAP_IDS),
        },
      },
      {
        featureId: 'flatMap',
        title: l('teasers.flatMap.title'),
        body: l('teasers.flatMap.body'),
      }
    ),
    gatedStep(
      POLAR_VIEW_IDS,
      {
        id: 'v3-polar-view',
        kind: 'coachmark',
        ...step('polarView'),
        isAvailable: () => isPluginUsable(POLAR_VIEW_IDS) && utilityIconTarget(POLAR_VIEW_IDS) !== null,
        beforeEnter: expandUtilityFooter,
        afterExit: collapseUtilityFooter,
        target: () => utilityIconTarget(POLAR_VIEW_IDS),
        placement: 'top',
        advanceOn: advanceOnIconClick(POLAR_VIEW_IDS),
      },
      {
        featureId: 'polarView',
        title: l('teasers.polarView.title'),
        body: l('teasers.polarView.body'),
      }
    ),
    {
      id: 'v4-back-to-3d',
      kind: 'coachmark',
      ...step('backTo3d'),
      isAvailable: () => isPluginUsable('NightToggle') && utilityIconTarget('NightToggle') !== null,
      beforeEnter: expandUtilityFooter,
      afterExit: collapseUtilityFooter,
      target: () => utilityIconTarget('NightToggle'),
      placement: 'top',
      advanceOn: { event: EventBusEvent.cameraTypeChanged, dwellMs: TASK_RESULT_DWELL_MS },
    },
    {
      id: 'v5-screenshots',
      kind: 'coachmark',
      ...step('screenshots'),
      isAvailable: () => isPluginUsable('Screenshot'),
      beforeEnter: () => openDrawerAt('Screenshot'),
      target: () => drawerItemTarget('Screenshot'),
      placement: 'right',
    },
    {
      id: 'v6-share',
      kind: 'coachmark',
      ...step('share'),
      isAvailable: () => isPluginUsable('ShareMenuPlugin'),
      beforeEnter: () => openDrawerAt('ShareMenuPlugin'),
      target: () => drawerItemTarget('ShareMenuPlugin'),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens('ShareMenuPlugin'),
    },
  ],
};
