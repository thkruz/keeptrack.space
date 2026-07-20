import { sensors } from '@app/app/data/catalogs/sensors';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { l } from '../onboarding-t7e';
import type { TourStep } from '../tour-engine';
import {
  advanceWhenMenuOpens,
  drawerItemTarget,
  gatedStep,
  isCatalogLoaded,
  isPluginUsable,
  isSatSelected,
  isSensorSelected,
  openDrawerAt,
  selectIssForUser,
  TASK_RESULT_DWELL_MS,
} from '../tour-steps';
import type { ChapterDefinition } from './chapter-types';

const FIND_SAT_IDS = ['FindSatPlugin', 'FindSatPro'];
const DOPS_IDS = ['DopsPlugin', 'DopsPluginPro'];

const step = (key: string) => ({
  title: l(`chapters.analysis.steps.${key}.title`),
  body: l(`chapters.analysis.steps.${key}.body`),
});

/** Chapter 4: Analysis Tools (~3 min, mixed, needs catalog). */
export const analysisChapter: ChapterDefinition = {
  id: 'analysis',
  title: () => l('chapters.analysis.title'),
  description: () => l('chapters.analysis.description'),
  minutes: 3,
  needsCatalog: true,
  buildSteps: (): TourStep[] => [
    {
      id: 'a1-advanced-search',
      kind: 'coachmark',
      ...step('advancedSearch'),
      isAvailable: () => isPluginUsable(FIND_SAT_IDS) && isCatalogLoaded(),
      beforeEnter: () => openDrawerAt(FIND_SAT_IDS),
      target: () => drawerItemTarget(FIND_SAT_IDS),
      placement: 'right',
      advanceOn: {
        event: EventBusEvent.searchUpdated,
        predicate: (...args: unknown[]) => (args[1] as number) > 0,
        dwellMs: TASK_RESULT_DWELL_MS,
      },
    },
    {
      id: 'a2-filter-catalog',
      kind: 'coachmark',
      ...step('filterCatalog'),
      isAvailable: () => isPluginUsable('FilterMenuPlugin'),
      beforeEnter: () => openDrawerAt('FilterMenuPlugin'),
      target: () => drawerItemTarget('FilterMenuPlugin'),
      placement: 'right',
      advanceOn: { event: EventBusEvent.filterChanged, dwellMs: TASK_RESULT_DWELL_MS },
    },
    {
      id: 'a3-polar-plot',
      kind: 'coachmark',
      ...step('polarPlot'),
      isAvailable: () => isPluginUsable('PolarPlotPlugin') && isCatalogLoaded(),
      beforeEnter: () => {
        // The polar plot needs both a sensor and a satellite selected
        if (!isSatSelected()) {
          selectIssForUser();
        }
        if (!isSensorSelected()) {
          ServiceLocator.getSensorManager().setSensor(sensors.CODSFS);
        }
        openDrawerAt('PolarPlotPlugin');
      },
      target: () => drawerItemTarget('PolarPlotPlugin'),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens('PolarPlotPlugin'),
    },
    gatedStep(
      DOPS_IDS,
      {
        id: 'a4-dops',
        kind: 'coachmark',
        ...step('dops'),
        isAvailable: () => isPluginUsable(DOPS_IDS),
        beforeEnter: () => openDrawerAt(DOPS_IDS),
        target: () => drawerItemTarget(DOPS_IDS),
        placement: 'right',
        advanceOn: advanceWhenMenuOpens(DOPS_IDS),
      },
      {
        featureId: 'dops',
        title: l('teasers.dops.title'),
        body: l('teasers.dops.body'),
      }
    ),
    {
      id: 'a5-what-if',
      kind: 'coachmark',
      ...step('whatIf'),
      isAvailable: () => isPluginUsable('Breakup'),
      beforeEnter: () => openDrawerAt('Breakup'),
      target: () => drawerItemTarget('Breakup'),
      placement: 'right',
    },
  ],
};
