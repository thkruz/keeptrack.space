import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { settingsManager } from '@app/settings/settings';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { l } from './onboarding-t7e';
import type { TourStep } from './tour-engine';

const ISS_SCC_NUM = 25544;

/** Inactivity delay before a task step reveals its "Do it for me" rescue button. */
export const DO_IT_FOR_ME_HINT_MS = 15_000;

/**
 * Post-task dwell before advancing, so the user can SEE the result of what
 * they pressed (the shade lifts and the popover shows a done note). Generous
 * on purpose: there is a lot to take in, and Next skips the wait anytime.
 */
export const TASK_RESULT_DWELL_MS = 3_500;

/** Menus surface tables/lists that take longer to read than a toggled layer. */
const MENU_RESULT_DWELL_MS = 5_000;

// ---------------------------------------------------------------------------
// Target helpers
// ---------------------------------------------------------------------------

export const isVisible = (el: HTMLElement | null): el is HTMLElement => !!el && el.isConnected && globalThis.getComputedStyle(el).display !== 'none';

/**
 * Finds a loaded plugin by any of its known ids. Several plugins have a
 * different class name (= id) in Pro builds, e.g. WatchlistPlugin vs
 * WatchlistProPlugin, so lookups take candidate lists.
 */
export const findPlugin = (pluginIds: string | string[]) => {
  const ids = Array.isArray(pluginIds) ? pluginIds : [pluginIds];

  return PluginRegistry.plugins.find((plugin) => ids.includes(plugin.id));
};

/** True when the plugin is loaded but behind the login gate for this user. */
export const isPluginLocked = (pluginIds: string | string[]): boolean => {
  const plugin = findPlugin(pluginIds);

  return !!plugin?.isLoginRequired && !settingsManager.isDisableLoginGate && !document.body.classList.contains('user-logged-in');
};

export const isPluginUsable = (pluginIds: string | string[]): boolean => {
  const plugin = findPlugin(pluginIds);

  if (!plugin) {
    return false;
  }

  // A login-gated plugin is a dead end for a logged-out user; do not tour it.
  return !isPluginLocked(pluginIds);
};

/** Finds a plugin's row in the drawer content (data-plugin-id is the icon element name). */
export const drawerItemTarget = (pluginIds: string | string[]): HTMLElement | null => {
  const elementName = findPlugin(pluginIds)?.bottomIconElementName;

  if (!elementName) {
    return null;
  }

  return document.querySelector<HTMLElement>(`#drawer-content .drawer-item[data-plugin-id="${elementName}"]`);
};

/**
 * Finds a plugin's pinned utility-footer icon (layer/camera/settings toggles).
 * UTILITY_ONLY plugins have NO drawer item, so drawerItemTarget returns null
 * for them and a step anchored there would silently self-skip.
 */
export const utilityIconTarget = (pluginIds: string | string[]): HTMLElement | null => {
  const elementName = findPlugin(pluginIds)?.bottomIconElementName;

  if (!elementName) {
    return null;
  }

  return document.querySelector<HTMLElement>(`#drawer-utility-footer .drawer-utility-icon[data-plugin-id="${elementName}"]`);
};

/**
 * Pins the hover-expanded utility footer open. The footer is a collapsed pill
 * that expands on hover (300ms animation); spotlighting an icon inside it
 * while it hover-flaps makes the ring chase a moving rect and the popover
 * steal the hover, collapsing it again. Steps anchored in the footer pin it
 * open in beforeEnter and release it in afterExit.
 */
export const expandUtilityFooter = (): void => {
  getEl('drawer-utility-footer', true)?.classList.add('expanded');
};

export const collapseUtilityFooter = (): void => {
  getEl('drawer-utility-footer', true)?.classList.remove('expanded');
};

/** Finds the plugin's icon wherever it renders (drawer list or utility footer). */
export const pluginAnchorTarget = (pluginIds: string | string[]): HTMLElement | null => drawerItemTarget(pluginIds) ?? utilityIconTarget(pluginIds);

/** Opens/expands whichever container holds the plugin's icon. */
export const revealPluginAnchor = (pluginIds: string | string[]): void => {
  if (drawerItemTarget(pluginIds)) {
    openDrawerAt(pluginIds);
  } else if (utilityIconTarget(pluginIds)) {
    expandUtilityFooter();
  }
};

/** Finds a plugin's side menu root element (only in the DOM once created). */
export const sideMenuTarget = (pluginIds: string | string[]): HTMLElement | null => {
  const elementName = findPlugin(pluginIds)?.sideMenuElementName;

  if (!elementName) {
    return null;
  }

  const el = getEl(elementName, true);

  return isVisible(el) ? el : null;
};

export const openDrawer = (): void => {
  ServiceLocator.getUiManager()?.pluginDrawer?.open();
};

/** Opens the drawer and expands the collapsed group containing the target row. */
export const openDrawerAt = (pluginIds: string | string[]): void => {
  openDrawer();
  drawerItemTarget(pluginIds)?.closest('.drawer-group')?.classList.remove('collapsed');
};

export const isCatalogLoaded = (): boolean => {
  try {
    return (ServiceLocator.getCatalogManager()?.getSats()?.length ?? 0) > 0;
  } catch {
    return false;
  }
};

export const isSatSelected = (): boolean => {
  const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

  return (selectSatManager?.selectedSat ?? -1) >= 0;
};

export const isSensorSelected = (): boolean => {
  try {
    return ServiceLocator.getSensorManager()?.isSensorSelected() ?? false;
  } catch {
    return false;
  }
};

export const selectIssForUser = (): void => {
  const catalogManager = ServiceLocator.getCatalogManager();

  if (!catalogManager) {
    return;
  }

  let id = catalogManager.sccNum2Id(ISS_SCC_NUM, false);

  if (typeof id !== 'number' || id < 0) {
    // ISS missing from this catalog: fall back to the first searchable satellite
    id = catalogManager.getSats().find((sat) => sat.sccNum)?.id ?? null;
  }

  if (typeof id === 'number' && id >= 0) {
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(id);
  }
};

export const openCommandPalette = (): void => {
  globalThis.dispatchEvent(
    new KeyboardEvent('keydown', {
      code: 'KeyK',
      key: 'K',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    })
  );
};

// ---------------------------------------------------------------------------
// Advance helpers
// ---------------------------------------------------------------------------

/**
 * advanceOn config that fires when one of the plugins' menus really opens.
 * The raw bottomMenuClick event fires BEFORE the base handler decides whether
 * to activate the menu (it bails with a toast when requirements are unmet), so
 * the isMenuButtonActive check runs via `verify` after the settle delay.
 */
export const advanceWhenMenuOpens = (pluginIds: string | string[]): NonNullable<TourStep['advanceOn']> => ({
  event: EventBusEvent.bottomMenuClick,
  predicate: (...args: unknown[]) => {
    const elementName = findPlugin(pluginIds)?.bottomIconElementName;

    return !!elementName && args[0] === elementName;
  },
  verify: () => findPlugin(pluginIds)?.isMenuButtonActive === true,
  dwellMs: MENU_RESULT_DWELL_MS,
});

/** advanceOn config for a toggle-style icon click (no side menu to verify). */
export const advanceOnIconClick = (pluginIds: string | string[]): NonNullable<TourStep['advanceOn']> => ({
  event: EventBusEvent.bottomMenuClick,
  predicate: (...args: unknown[]) => {
    const elementName = findPlugin(pluginIds)?.bottomIconElementName;

    return !!elementName && args[0] === elementName;
  },
  dwellMs: TASK_RESULT_DWELL_MS,
});

// ---------------------------------------------------------------------------
// Teaser steps (login-gated Pro features)
// ---------------------------------------------------------------------------

export interface TeaserCopy {
  /** Analytics feature id, e.g. 'bestPass'. */
  featureId: string;
  title: string;
  body: string;
}

const trackTeaser = (event: string, featureId: string): void => {
  keepTrackApi.analytics?.track?.(event, { featureId });
};

/**
 * A teaser is a normal coachmark on the locked drawer item (which already
 * renders with the pro tint): one sentence on what the feature does, one on
 * why it matters, and a sign-in CTA in the actionButton slot. Signing in
 * advances the step. Unavailable when the feature is not locked (real step
 * shows instead) or the build has no login gate (OSS advertises nothing it
 * cannot do).
 */
export const buildTeaserStep = (pluginIds: string | string[], copy: TeaserCopy): TourStep => {
  let isShownTracked = false;

  return {
    id: `teaser-${copy.featureId}`,
    kind: 'coachmark',
    title: copy.title,
    body: copy.body,
    isAvailable: () => typeof KeepTrackPlugin.loginGateOpenModal === 'function' && !!findPlugin(pluginIds) && isPluginLocked(pluginIds) && pluginAnchorTarget(pluginIds) !== null,
    beforeEnter: () => revealPluginAnchor(pluginIds),
    afterExit: collapseUtilityFooter,
    target: () => pluginAnchorTarget(pluginIds),
    // Drawer items sit on the left edge; utility icons on the bottom edge
    placement: drawerItemTarget(pluginIds) ? 'right' : 'top',
    advanceOn: { event: EventBusEvent.userLogin },
    actionButton: {
      label: l('teasers.signInCta'),
      action: () => {
        trackTeaser('onboarding_teaser_cta_clicked', copy.featureId);
        KeepTrackPlugin.loginGateOpenModal?.();
      },
    },
    onRender: () => {
      if (!isShownTracked) {
        isShownTracked = true;
        trackTeaser('onboarding_teaser_shown', copy.featureId);
      }
    },
  };
};

/**
 * Returns the real task step when the feature is usable, or its teaser when it
 * is login-locked. Decided when the chapter's steps are built (chapter start);
 * a mid-chapter sign-in advances the active teaser via userLogin and later
 * steps re-evaluate availability on entry.
 */
export const gatedStep = (pluginIds: string | string[], realStep: TourStep, teaser: TeaserCopy): TourStep =>
  isPluginLocked(pluginIds) ? buildTeaserStep(pluginIds, teaser) : realStep;

// ---------------------------------------------------------------------------
// Tier 1: Basics (B1-B7)
// ---------------------------------------------------------------------------

export const buildBasicsSteps = (): TourStep[] => [
  {
    id: 'b1-globe',
    kind: 'coachmark',
    title: l('steps.b1Globe.title'),
    body: l('steps.b1Globe.body'),
    target: () => getEl('keeptrack-canvas', true),
    placement: 'bottom',
    advanceOn: { event: EventBusEvent.canvasMouseDown },
  },
  {
    id: 'b2-zoom',
    kind: 'coachmark',
    title: l('steps.b2Zoom.title'),
    body: l('steps.b2Zoom.body'),
    target: () => getEl('keeptrack-canvas', true),
    placement: 'bottom',
  },
  {
    id: 'b3-search',
    kind: 'coachmark',
    title: l('steps.b3Search.title'),
    body: l('steps.b3Search.body'),
    target: () => getEl('search-holder', true) ?? getEl('search-icon', true) ?? getEl('search', true),
    placement: 'bottom',
    isAvailable: isCatalogLoaded,
    advanceOn: {
      event: EventBusEvent.searchUpdated,
      predicate: (...args: unknown[]) => (args[1] as number) > 0,
    },
  },
  {
    id: 'b4-select',
    kind: 'coachmark',
    title: l('steps.b4Select.title'),
    body: l('steps.b4Select.body'),
    target: () => getEl('search-results', true) ?? getEl('search-holder', true),
    placement: 'bottom',
    isAvailable: isCatalogLoaded,
    advanceOn: { event: EventBusEvent.selectSatData },
    actionButton: {
      label: l('buttons.doItForMe'),
      action: selectIssForUser,
    },
  },
  {
    id: 'b5-infobox',
    kind: 'coachmark',
    title: l('steps.b5Infobox.title'),
    body: l('steps.b5Infobox.body'),
    target: () => {
      const el = getEl('sat-infobox', true);

      return isVisible(el) ? el : null;
    },
    placement: 'left',
    isAvailable: () => isCatalogLoaded() && isSatSelected(),
  },
  {
    id: 'b6-time',
    kind: 'coachmark',
    title: l('steps.b6Time.title'),
    body: l('steps.b6Time.body'),
    target: () => getEl('datetime', true),
    placement: 'bottom',
    advanceOn: { event: EventBusEvent.propRateChanged },
  },
  {
    id: 'b7-drawer',
    kind: 'coachmark',
    title: l('steps.b7Drawer.title'),
    body: l('steps.b7Drawer.body'),
    target: () => getEl('drawer-hamburger', true),
    placement: 'right',
  },
];
