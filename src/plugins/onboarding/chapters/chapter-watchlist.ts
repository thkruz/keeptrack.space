import { sensors } from '@app/app/data/catalogs/sensors';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { SelectSatManager } from '../../select-sat-manager/select-sat-manager';
import { l } from '../onboarding-t7e';
import type { TourStep } from '../tour-engine';
import {
  advanceWhenMenuOpens,
  DO_IT_FOR_ME_HINT_MS,
  drawerItemTarget,
  gatedStep,
  isCatalogLoaded,
  isPluginUsable,
  isSensorSelected,
  openDrawerAt,
  selectIssForUser,
  sideMenuTarget,
  TASK_RESULT_DWELL_MS,
} from '../tour-steps';
import type { ChapterDefinition } from './chapter-types';

/** Watchlist has a different class name (= plugin id) in Pro builds. */
export const WATCHLIST_IDS = ['WatchlistPlugin', 'WatchlistProPlugin'];
const BEST_PASS_IDS = ['BestPassPlugin', 'BestPassPro'];

/** Adds the selected satellite (or the ISS) to the watchlist for the user. */
const addSelectedSatToWatchlist = (): void => {
  const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

  if ((selectSatManager?.selectedSat ?? -1) < 0) {
    selectIssForUser();
  }

  const id = selectSatManager?.selectedSat ?? -1;
  const watchlist = PluginRegistry.plugins.find((plugin) => WATCHLIST_IDS.includes(plugin.id)) as { addSat?: (id: number) => void } | undefined;

  if (id >= 0) {
    watchlist?.addSat?.(id);
  }
};

/** The overlay and pass tools need a sensor; auto-select one when missing. */
const ensureSensorSelected = (): void => {
  if (!isSensorSelected()) {
    const sensorManager = ServiceLocator.getSensorManager();

    sensorManager.clearSecondarySensors();
    sensorManager.setSensor(sensors.CODSFS);
  }
};

const step = (key: string) => ({
  title: l(`chapters.watchlist.steps.${key}.title`),
  body: l(`chapters.watchlist.steps.${key}.body`),
});

/** Chapter 2: Watchlist & Passes (~3 min, task-verified, needs catalog). */
export const watchlistChapter: ChapterDefinition = {
  id: 'watchlist',
  title: () => l('chapters.watchlist.title'),
  description: () => l('chapters.watchlist.description'),
  minutes: 3,
  needsCatalog: true,
  isAvailable: () => PluginRegistry.plugins.some((plugin) => WATCHLIST_IDS.includes(plugin.id)),
  buildSteps: (): TourStep[] => [
    {
      id: 'w1-pick-target',
      kind: 'coachmark',
      ...step('pickTarget'),
      target: () => getEl('search-holder', true) ?? getEl('search-icon', true) ?? getEl('search', true),
      placement: 'bottom',
      isAvailable: isCatalogLoaded,
      advanceOn: {
        event: EventBusEvent.selectSatData,
        timeoutHintMs: DO_IT_FOR_ME_HINT_MS,
        dwellMs: TASK_RESULT_DWELL_MS,
      },
      actionButton: {
        label: l('buttons.doItForMe'),
        action: selectIssForUser,
      },
    },
    {
      id: 'w2-add-watchlist',
      kind: 'coachmark',
      ...step('addToWatchlist'),
      isAvailable: () => isPluginUsable(WATCHLIST_IDS) && isCatalogLoaded(),
      beforeEnter: () => openDrawerAt(WATCHLIST_IDS),
      target: () => sideMenuTarget(WATCHLIST_IDS) ?? drawerItemTarget(WATCHLIST_IDS),
      placement: 'right',
      advanceOn: {
        event: EventBusEvent.onWatchlistUpdated,
        predicate: (...args: unknown[]) => Array.isArray(args[0]) && args[0].length > 0,
        timeoutHintMs: DO_IT_FOR_ME_HINT_MS,
        dwellMs: TASK_RESULT_DWELL_MS,
      },
      actionButton: {
        label: l('buttons.doItForMe'),
        action: addSelectedSatToWatchlist,
      },
    },
    {
      id: 'w3-overlay',
      kind: 'coachmark',
      ...step('overlay'),
      isAvailable: () => isPluginUsable('WatchlistOverlay'),
      beforeEnter: () => {
        ensureSensorSelected();
        openDrawerAt('WatchlistOverlay');
      },
      target: () => drawerItemTarget('WatchlistOverlay'),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens('WatchlistOverlay'),
    },
    {
      id: 'w4-look-angles',
      kind: 'coachmark',
      ...step('lookAngles'),
      isAvailable: () => isPluginUsable('LookAnglesPlugin'),
      beforeEnter: () => {
        ensureSensorSelected();
        openDrawerAt('LookAnglesPlugin');
      },
      target: () => drawerItemTarget('LookAnglesPlugin'),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens('LookAnglesPlugin'),
    },
    gatedStep(
      BEST_PASS_IDS,
      {
        id: 'w5-best-passes',
        kind: 'coachmark',
        ...step('bestPasses'),
        isAvailable: () => isPluginUsable(BEST_PASS_IDS),
        beforeEnter: () => {
          ensureSensorSelected();
          openDrawerAt(BEST_PASS_IDS);
        },
        target: () => drawerItemTarget(BEST_PASS_IDS),
        placement: 'right',
        advanceOn: advanceWhenMenuOpens(BEST_PASS_IDS),
      },
      {
        featureId: 'bestPass',
        title: l('teasers.bestPass.title'),
        body: l('teasers.bestPass.body'),
      }
    ),
    {
      id: 'w6-timelines',
      kind: 'coachmark',
      ...step('timelines'),
      isAvailable: () => isPluginUsable('SensorTimeline'),
      beforeEnter: () => {
        ensureSensorSelected();
        openDrawerAt('SensorTimeline');
      },
      target: () => drawerItemTarget('SensorTimeline'),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens('SensorTimeline'),
    },
  ],
};
