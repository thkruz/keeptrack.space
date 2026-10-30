import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { sensorsChapter } from './chapters/chapter-sensors';
import type { ChapterDefinition } from './chapters/chapter-types';
import { visualizationChapter } from './chapters/chapter-visualization';
import { watchlistChapter } from './chapters/chapter-watchlist';
import type { OnboardingPersona, OnboardingState } from './onboarding-state';
import { l } from './onboarding-t7e';
import type { TourStep } from './tour-engine';
import { isCatalogLoaded, isPluginUsable, isSatSelected } from './tour-steps';

export interface ChecklistMission {
  id: string;
  label: () => string;
  /** Opens the relevant feature directly; used when the mission has no guided steps to run. */
  launch: () => void;
  /** Guided steps run when the mission row is clicked, reused from the power tour chapters. */
  buildSteps?: (persona: OnboardingPersona | null) => TourStep[];
  /** Login-gated plugins the mission needs; a signed-out user sees a sign-in card first. */
  gatedBy?: string[];
  isVisible?: (state: OnboardingState) => boolean;
}

export const MISSION_POWER_TOUR = 'powerTour';

/** Watchlist has a different class name (= plugin id) in Pro builds. */
const WATCHLIST_IDS = ['WatchlistPlugin', 'WatchlistProPlugin'];

const findPluginByIds = (pluginIds: string[]) => PluginRegistry.plugins.find((plugin) => pluginIds.includes(plugin.id));

/** Emits the drawer/bottom-menu activation event for a plugin by id. */
export const openPluginMenu = (pluginIds: string[]): void => {
  const elementName = findPluginByIds(pluginIds)?.bottomIconElementName;

  if (elementName) {
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, elementName);
  }
};

/** The named steps of a chapter, in the order given. */
const pickSteps = (chapter: ChapterDefinition, persona: OnboardingPersona | null, stepIds: string[]): TourStep[] => {
  const steps = chapter.buildSteps(persona);

  return stepIds.map((id) => steps.find((step) => step.id === id)).filter((step): step is TourStep => !!step);
};

/** Closes the watchlist mission: one satellite is in, the mission checks off at three. */
const addMoreSatsStep = (): TourStep => ({
  id: 'm-watchlist-add-more',
  kind: 'card',
  title: l('missions.addMore.title'),
  body: l('missions.addMore.body'),
  // Only after the add step, which needs the same conditions
  isAvailable: () => isPluginUsable(WATCHLIST_IDS) && isCatalogLoaded(),
});

/**
 * The 3-5 getting-started missions (Appcues guidance: keep it short). Persona
 * only affects ordering; every mission auto-checks off real usage events.
 */
export const buildMissions = (startPowerTour: () => void): ChecklistMission[] => [
  {
    id: MISSION_POWER_TOUR,
    label: () => l('checklist.powerTour'),
    launch: startPowerTour,
    isVisible: (state) => state.tiers.power !== 'done',
  },
  {
    id: 'watchlist3',
    label: () => l('checklist.watchlist3'),
    launch: () => openPluginMenu(WATCHLIST_IDS),
    buildSteps: (persona) => [...pickSteps(watchlistChapter, persona, ['w1-pick-target', 'w2-add-watchlist']), addMoreSatsStep()],
    gatedBy: WATCHLIST_IDS,
    isVisible: () => !!findPluginByIds(WATCHLIST_IDS),
  },
  {
    id: 'selectSensor',
    label: () => l('checklist.selectSensor'),
    launch: () => openPluginMenu(['SensorListPlugin']),
    buildSteps: (persona) => pickSteps(sensorsChapter, persona, ['s1-sensor-list', 's2-select-sensor', 's3-coverage']),
    gatedBy: ['SensorListPlugin'],
    isVisible: () => !!findPluginByIds(['SensorListPlugin']),
  },
  {
    id: 'lookAngles',
    label: () => l('checklist.lookAngles'),
    launch: () => openPluginMenu(['LookAnglesPlugin']),
    // Look angles need a satellite and a sensor: pick one if none is selected, then the
    // look-angles step selects a demo sensor itself before pointing at the menu.
    buildSteps: (persona) =>
      pickSteps(watchlistChapter, persona, ['w1-pick-target', 'w4-look-angles']).map((step) =>
        step.id === 'w1-pick-target' ? { ...step, isAvailable: () => step.isAvailable?.() !== false && !isSatSelected() } : step
      ),
    gatedBy: ['LookAnglesPlugin'],
    isVisible: () => !!findPluginByIds(['LookAnglesPlugin']),
  },
  {
    id: 'colorScheme',
    label: () => l('checklist.colorScheme'),
    launch: () => openPluginMenu(['ColorMenu']),
    buildSteps: (persona) => pickSteps(visualizationChapter, persona, ['v1-color-schemes']),
    gatedBy: ['ColorMenu'],
  },
];

/** Persona-preferred mission order; missions not listed keep declaration order. */
const PERSONA_ORDER: Record<OnboardingPersona, string[]> = {
  explorer: [MISSION_POWER_TOUR, 'watchlist3', 'colorScheme', 'selectSensor', 'lookAngles'],
  student: [MISSION_POWER_TOUR, 'colorScheme', 'watchlist3', 'selectSensor', 'lookAngles'],
  operator: [MISSION_POWER_TOUR, 'selectSensor', 'lookAngles', 'watchlist3', 'colorScheme'],
  developer: [MISSION_POWER_TOUR, 'lookAngles', 'selectSensor', 'watchlist3', 'colorScheme'],
};

export const sortMissionsForPersona = (missions: ChecklistMission[], persona: OnboardingPersona | null): ChecklistMission[] => {
  if (!persona) {
    return missions;
  }

  const order = PERSONA_ORDER[persona];

  return [...missions].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);

    return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
  });
};

/**
 * Subscribes the real product events that auto-complete missions ("small wins"
 * pattern: the checkbox ticks itself when the user actually does the thing).
 */
export const wireMissionAutoChecks = (markDone: (missionId: string) => void): void => {
  const eventBus = EventBus.getInstance();

  eventBus.on(EventBusEvent.onWatchlistUpdated, (watchlist: { id: number; inView: boolean }[]) => {
    if (watchlist.length >= 3) {
      markDone('watchlist3');
    }
  });

  eventBus.on(EventBusEvent.setSensor, (sensor) => {
    if (sensor !== null) {
      markDone('selectSensor');
    }
  });

  eventBus.on(EventBusEvent.bottomMenuClick, (iconName: string) => {
    const lookAngles = findPluginByIds(['LookAnglesPlugin']);

    if (!lookAngles?.bottomIconElementName || iconName !== lookAngles.bottomIconElementName) {
      return;
    }

    // The base handler bails with a "select a satellite/sensor first" toast
    // BEFORE activating the menu when requirements are unmet, but this raw
    // event has already fired. Only count clicks where the menu really opened,
    // checked after all bottomMenuClick listeners have run.
    setTimeout(() => {
      if (lookAngles.isMenuButtonActive) {
        markDone('lookAngles');
      }
    }, 0);
  });

  eventBus.on(EventBusEvent.colorSchemeChanged, () => {
    markDone('colorScheme');
  });
};
