import { MenuMode } from '@app/engine/core/interfaces';
import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { migrateLegacyBottomIconId } from '@app/engine/plugins/bottom-icon-id';
import { IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { TopMenuPlugin } from '@app/engine/plugins/top-menu-plugin';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { shake } from '@app/engine/utils/shake';
import { TranslationKey, t7e } from '@app/locales/keys';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { settingsManager } from '@app/settings/settings';

type DrawerKey_ = Parameters<typeof t7e>[0];

export interface DrawerBadge {
  type: 'active' | 'count';
  value?: string | number;
}

export interface DrawerItemData {
  id: string;
  pluginId?: string;
  label: string;
  imgSrc: string;
  isTopMenu: boolean;
  isDisabled?: boolean;
  isLoginRequired?: boolean;
  order: number;
  shortcutHint?: string;
  /** Kept out of the Recent group (see KeepTrackPlugin.isExcludedFromDrawerRecent). */
  isExcludedFromRecent?: boolean;
}

export interface DrawerGroup {
  label: string;
  items: DrawerItemData[];
}

const MAX_RECENT_PLUGINS_ = 8;

/**
 * Every plugin row in the drawer content. Rows in a plugin's own group carry
 * data-plugin-id; the copies in the Recent group carry data-recent-plugin-id and the
 * copies in the Pro Favorites group carry data-favorite-plugin-id, so a
 * `.drawer-item[data-plugin-id="x"]` selector matches exactly one row per plugin.
 */
export const ALL_DRAWER_PLUGIN_ITEMS_SELECTOR = '.drawer-item[data-plugin-id], .drawer-item[data-recent-plugin-id], .drawer-item[data-favorite-plugin-id]';

/** Selector for every row (own group, Recent and Favorites) of one plugin. */
export function drawerItemsForPluginSelector(pluginId: string): string {
  return `.drawer-item[data-plugin-id="${pluginId}"], .drawer-item[data-recent-plugin-id="${pluginId}"], .drawer-item[data-favorite-plugin-id="${pluginId}"]`;
}

/** The plugin (bottom-icon element) id behind a drawer row, from any of the three attributes. */
export function drawerItemPluginId(el: HTMLElement): string | undefined {
  return el.dataset.pluginId ?? el.dataset.recentPluginId ?? el.dataset.favoritePluginId;
}

/** Mirror the live bottom-icon selected/disabled classes onto a drawer row. */
export function syncDrawerItemState(el: HTMLElement): void {
  const pluginId = drawerItemPluginId(el);
  const bottomIcon = pluginId ? getEl(pluginId, true) : null;
  const isSelected = bottomIcon?.classList.contains('bmenu-item-selected') ?? false;
  const isDisabled = bottomIcon?.classList.contains('bmenu-item-disabled') ?? false;

  el.classList.toggle('active', isSelected);
  el.classList.toggle('disabled', isDisabled);
}

// ---- Shared Item Collection ----

/** The collected drawer items, split into scrollable menu groups and the pinned utility groups. */
export interface CollectedDrawerItems {
  menuGroups: Record<string, DrawerGroup>;
  utilityGroups: Record<string, DrawerGroup>;
}

const MODE_LABEL_KEYS: Record<number, DrawerKey_> = {
  [MenuMode.CATALOG]: 'pluginDrawer.modeCatalog' as DrawerKey_,
  [MenuMode.SENSORS]: 'pluginDrawer.modeSensors' as DrawerKey_,
  [MenuMode.EVENTS]: 'pluginDrawer.modeEvents' as DrawerKey_,
  [MenuMode.CREATE]: 'pluginDrawer.modeCreate' as DrawerKey_,
  [MenuMode.ANALYSIS]: 'pluginDrawer.modeAnalysis' as DrawerKey_,
  [MenuMode.CONJUNCTIONS]: 'pluginDrawer.modeConjunctions' as DrawerKey_,
  [MenuMode.DISPLAY]: 'pluginDrawer.modeDisplay' as DrawerKey_,
  [MenuMode.TOOLS]: 'pluginDrawer.modeTools' as DrawerKey_,
  [MenuMode.SETTINGS]: 'pluginDrawer.modeSettings' as DrawerKey_,
  [MenuMode.EXPERIMENTAL]: 'pluginDrawer.modeExperimental' as DrawerKey_,
};

/** Nav item IDs that should appear in the utility footer instead of Quick Actions */
const UTILITY_NAV_ITEM_IDS = new Set(['sound-btn', 'layers-menu-btn']);

/**
 * Resolve a plugin's bottom icon image source — preferring the already-rendered
 * DOM element (which may have a resolved or delayed src) over the raw module.
 */
export function resolveImgSrc(plugin: KeepTrackPlugin): string {
  const iconEl = getEl(plugin.bottomIconElementName, true);
  const img = iconEl?.querySelector('img') as HTMLImageElement | null;

  if (img) {
    return img.src || img.getAttribute('delayedsrc') || String(plugin.bottomIconImg);
  }

  return String(plugin.bottomIconImg);
}

/**
 * Look up the first registered keyboard shortcut for a plugin and return a display string.
 */
export function getShortcutHint(pluginId: string): string | undefined {
  const allShortcuts = KeyboardShortcutRegistry.getAll();

  for (const entry of allShortcuts) {
    if (entry.pluginId === pluginId) {
      return KeyboardShortcutRegistry.formatShortcut(entry.shortcut);
    }
  }

  return undefined;
}

/**
 * Collect every menu item that should appear in the plugin drawer, grouped by
 * MenuMode (scrollable content) and utility category (pinned footer). This is the
 * single source of truth shared by the {@link PluginDrawer} and the Launchpad grid
 * so the two never drift apart.
 */
export function collectDrawerItems(): CollectedDrawerItems {
  const plugins = PluginRegistry.plugins;
  const menuGroups: Record<string, DrawerGroup> = {};
  const utilityGroups: Record<string, DrawerGroup> = {};

  // Initialize MenuMode groups (scrollable content)
  for (const [mode, key] of Object.entries(MODE_LABEL_KEYS)) {
    menuGroups[`mode-${mode}`] = { label: t7e(key), items: [] };
  }

  // Initialize utility groups (pinned footer)
  utilityGroups['utility-camera'] = { label: t7e('pluginDrawer.groupCameraModes' as DrawerKey_), items: [] };
  utilityGroups['utility-layers'] = { label: t7e('pluginDrawer.groupLayerToggles' as DrawerKey_), items: [] };
  utilityGroups['utility-settings'] = { label: t7e('pluginDrawer.groupSettingsToggles' as DrawerKey_), items: [] };

  // Development Tools group (Plugin Manager, Debug) — inserted just before About
  // so it renders as the second-to-last category.
  menuGroups['dev-tools'] = { label: t7e('pluginDrawer.groupDevTools' as DrawerKey_), items: [] };

  // About group for TopMenuPlugin instances (e.g., GithubLink)
  menuGroups.about = { label: t7e('pluginDrawer.groupAbout' as DrawerKey_), items: [] };

  for (const plugin of plugins) {
    // CompanionLinkPlugin is surfaced as an inline icon next to the status footer, not a drawer entry.
    if (plugin.id === 'CompanionLinkPlugin') {
      continue;
    }

    // Handle TopMenuPlugins — put in About group
    if (plugin instanceof TopMenuPlugin) {
      const btnEl = getEl(`${plugin.id}-btn`, true);
      const imgEl = btnEl?.querySelector('img') as HTMLImageElement | null;
      const tooltip = btnEl?.getAttribute('kt-tooltip') || plugin.id;

      if (imgEl) {
        menuGroups.about.items.push({
          id: plugin.id,
          label: tooltip,
          imgSrc: imgEl.src || imgEl.getAttribute('delayedsrc') || '',
          isTopMenu: true,
          order: 0,
        });
      }
      continue;
    }

    // Handle bottom icon plugins
    if (!plugin.bottomIconElementName || !plugin.bottomIconImg || plugin.isBottomIconHidden) {
      continue;
    }

    const order = plugin.bottomIconOrder ?? KeepTrackPlugin.MAX_BOTTOM_ICON_ORDER;

    // Resolve the image source — it may be a webpack module or a string
    const imgSrc = resolveImgSrc(plugin);

    // Put in utility group if applicable
    if (plugin.iconPlacement === IconPlacement.UTILITY_ONLY || plugin.iconPlacement === IconPlacement.BOTH) {
      let utilityKey: string;

      if (plugin.utilityGroup === UtilityGroup.CAMERA_MODE) {
        utilityKey = 'utility-camera';
      } else if (plugin.utilityGroup === UtilityGroup.SETTINGS_TOGGLE) {
        utilityKey = 'utility-settings';
      } else {
        utilityKey = 'utility-layers';
      }

      utilityGroups[utilityKey].items.push({
        id: plugin.bottomIconElementName,
        pluginId: plugin.id,
        label: plugin.bottomIconLabel,
        imgSrc,
        isTopMenu: false,
        // Use the live disabled state, not the load-time default: a sensor/satellite
        // selection (e.g. restored from persistence or account sync) can flip this
        // before the footer renders. Rendering from isIconDisabledOnLoad here would
        // desync the DOM from the plugin's guarded setBottomIconToEnabled(), leaving
        // the icon permanently grayed and unclickable.
        isDisabled: plugin.isIconDisabled,
        isLoginRequired: plugin.isLoginRequired,
        order,
      });
    }

    // Put in first matching MenuMode group (only if not in the utility footer).
    // A plugin can override its group via drawerGroupKey (e.g. 'about').
    if (plugin.iconPlacement === IconPlacement.BOTTOM_ONLY) {
      const primaryMode = plugin.menuMode.find((m) => m !== MenuMode.ALL) ?? MenuMode.CATALOG;
      const groupKey = plugin.drawerGroupKey && menuGroups[plugin.drawerGroupKey] ? plugin.drawerGroupKey : `mode-${primaryMode}`;

      menuGroups[groupKey]?.items.push({
        id: plugin.bottomIconElementName,
        label: plugin.bottomIconLabel,
        imgSrc,
        isTopMenu: false,
        isDisabled: plugin.isIconDisabled,
        isLoginRequired: plugin.isLoginRequired,
        order,
        shortcutHint: getShortcutHint(plugin.id),
        isExcludedFromRecent: plugin.isExcludedFromDrawerRecent,
      });
    }
  }

  // Add TopMenu navItems (sound, layers, tutorial, etc.) to appropriate groups
  const topMenu = PluginRegistry.getPlugin(TopMenu);

  if (topMenu) {
    for (const navItem of topMenu.navItems) {
      const btnEl = getEl(navItem.id, true);
      const imgEl = btnEl?.querySelector('img') as HTMLImageElement | null;
      const imgSrc = imgEl?.src || imgEl?.getAttribute('delayedsrc') || String(navItem.icon);
      const tooltip = btnEl?.getAttribute('kt-tooltip') || navItem.tooltip || navItem.id;
      const isDisabled = btnEl?.classList.contains('bmenu-item-disabled') ?? false;

      const item: DrawerItemData = {
        id: navItem.id,
        label: tooltip,
        imgSrc,
        isTopMenu: true,
        isDisabled,
        order: navItem.order,
      };

      if (UTILITY_NAV_ITEM_IDS.has(navItem.id)) {
        utilityGroups['utility-settings'].items.push(item);
      }
    }
  }

  return { menuGroups, utilityGroups };
}

// ---- Utility Footer Rendering ----

/** Render the utility footer icons grouped by category. */
export function renderUtilityFooter(groups: Record<string, DrawerGroup>): void {
  const footerEl = getEl('drawer-utility-footer', true);

  if (!footerEl) {
    return;
  }

  let html = '';

  for (const [, group] of Object.entries(groups)) {
    if (group.items.length === 0) {
      continue;
    }

    group.items.sort((a, b) => a.order - b.order);

    html += '<div class="drawer-utility-section">';
    html += `<div class="drawer-utility-section-label">${group.label}</div>`;
    html += '<div class="drawer-utility-icons">';

    for (const item of group.items) {
      const disabledClass = item.isDisabled ? ' bmenu-item-disabled' : '';
      const proAttr = item.isLoginRequired ? ' data-pro-gated' : '';
      const proClass = item.isLoginRequired && !settingsManager.isDisableLoginGate ? ' bmenu-item-pro' : '';
      const dataAttr = item.isTopMenu ? `data-top-menu-id="${item.id}"` : `data-plugin-id="${item.id}"`;
      const idAttr = item.pluginId ? ` id="${item.pluginId}-utility-icon"` : '';

      html += `<div class="drawer-utility-icon${disabledClass}${proClass}"${idAttr} ${dataAttr}${proAttr} kt-tooltip="${item.label}">`;
      html += `<img src="${item.imgSrc}" alt="${item.label}" />`;
      html += '</div>';
    }

    html += '</div>';
    html += '</div>';
  }

  footerEl.innerHTML = html;
}

// ---- Status Footer ----

/** Whether the user is signed in (required before the phone link is usable). */
function isCompanionSignedIn_(): boolean {
  const userPlugin = PluginRegistry.getPluginByName('UserAccountPlugin') as (KeepTrackPlugin & { cachedUser?: { id?: string } | null }) | null;

  return Boolean(userPlugin?.cachedUser?.id);
}

function phoneLinkTooltip_(signedIn: boolean): string {
  return signedIn ? t7e('pluginDrawer.phoneLink' as TranslationKey) : t7e('pluginDrawer.phoneLinkSignIn' as TranslationKey);
}

function connectivityLabel_(isOnline: boolean): string {
  return isOnline ? t7e('pluginDrawer.connected' as TranslationKey) : t7e('pluginDrawer.offline' as TranslationKey);
}

/**
 * Reflect the current sign-in state on the phone-link icon: yellow + disabled
 * when signed out, red (active) when signed in. Safe to call repeatedly.
 */
export function updatePhoneLinkState(): void {
  const phoneLinkEl = getEl('drawer-phone-link', true);

  if (!phoneLinkEl) {
    return;
  }

  const signedIn = isCompanionSignedIn_();

  phoneLinkEl.classList.toggle('drawer-phone-link--disabled', !signedIn);
  phoneLinkEl.setAttribute('aria-disabled', String(!signedIn));
  phoneLinkEl.setAttribute('kt-tooltip', phoneLinkTooltip_(signedIn));
}

/** Render the status footer showing connectivity and version. */
export function renderStatusFooter(): void {
  const footerEl = getEl('drawer-status-footer', true);

  if (!footerEl) {
    return;
  }

  const isOnline = navigator.onLine;
  const hasCompanionLink = Boolean(PluginRegistry.getPluginByName('CompanionLinkPlugin'));
  const signedIn = isCompanionSignedIn_();
  const phoneLinkIcon = hasCompanionLink
    ? [
        `    <div class="drawer-phone-link${signedIn ? '' : ' drawer-phone-link--disabled'}" id="drawer-phone-link"`,
        `      role="button" tabindex="0" aria-disabled="${String(!signedIn)}"`,
        `      kt-tooltip="${phoneLinkTooltip_(signedIn)}">`,
        '      <svg class="drawer-phone-link-icon" viewBox="0 0 24 24" aria-hidden="true">',
        '        <path fill="currentColor" d="M7 18v-8H3v8zm-4.5 2q-.625 0-1.062-.437T1 18.5v-9q0-.625.438-1.062T2.5 8h5q.625 0 1.063.438T9 9.5v9q0 .625-.437 1.063T7.5 20zM5 12.5q.325 0 .538-.225t.212-.525q0-.325-.213-.537T5 11q-.3 0-.525.213t-.225.537q0 .3.225.525T5 12.5M15.75 22v-5q-.225-.2-.363-.462T15.25 16q0-.525.375-.888t.875-.362q.525 0 .888.363t.362.887q0 .275-.112.55t-.388.45v5zm-2.075-3.175q-.55-.575-.862-1.3T12.5 16q0-1.675 1.175-2.838T16.5 12q1.675 0 2.838 1.163T20.5 16q0 .775-.288 1.5t-.862 1.3l-1.075-1.05q.35-.35.538-.8T19 16q0-1.05-.725-1.775T16.5 13.5t-1.775.725T14 16q0 .5.2.95t.55.8zM11.9 20.6q-.875-.95-1.388-2.138T10 16q0-2.725 1.9-4.612T16.5 9.5q2.725 0 4.613 1.888T23 16q0 1.275-.475 2.463t-1.4 2.112L20.05 19.5q.725-.725 1.088-1.625T21.5 16q0-2.1-1.45-3.55T16.5 11q-2.075 0-3.537 1.45T11.5 16q0 .975.388 1.888t1.087 1.637zM2 6q0-.825.588-1.412T4 4h15q.825 0 1.413.588T21 6v2.8q-.475-.275-.975-.513T19 7.876V6zm3 8"></path>',
        '      </svg>',
        '    </div>',
      ].join('')
    : '';

  footerEl.innerHTML = [
    '<div class="drawer-status-footer">',
    '  <div class="drawer-status-connectivity">',
    `    <span class="drawer-status-dot${isOnline ? '' : ' drawer-status-dot--offline'}"></span>`,
    `    <span class="drawer-status-connectivity-label${isOnline ? '' : ' drawer-status-connectivity-label--offline'}">${connectivityLabel_(isOnline)}</span>`,
    phoneLinkIcon,
    '  </div>',
    `  <span class="drawer-status-version">KeepTrack v${__VERSION__}</span>`,
    '</div>',
  ].join('');
}

/** Update the connectivity status indicator in the drawer footer. */
export function updateConnectivityStatus(_drawerEl: HTMLElement | null, isOnline: boolean): void {
  const statusFooter = getEl('drawer-status-footer', true);
  const dot = statusFooter?.querySelector('.drawer-status-dot');
  const label = statusFooter?.querySelector('.drawer-status-connectivity-label');

  if (dot) {
    dot.classList.toggle('drawer-status-dot--offline', !isOnline);
  }
  if (label) {
    label.classList.toggle('drawer-status-connectivity-label--offline', !isOnline);
    label.textContent = connectivityLabel_(isOnline);
  }
}

// ---- Badges ----

/** Render a badge on a plugin's drawer item. */
export function renderBadge(pluginId: string, badges: Map<string, DrawerBadge>): void {
  const contentEl = getEl('drawer-content', true);

  if (!contentEl) {
    return;
  }

  const badge = badges.get(pluginId);

  contentEl.querySelectorAll(drawerItemsForPluginSelector(pluginId)).forEach((itemEl) => {
    const badgeEl = itemEl.querySelector('.drawer-item-badge');

    if (!badgeEl) {
      return;
    }

    if (!badge) {
      badgeEl.className = 'drawer-item-badge';
      badgeEl.textContent = '';
    } else if (badge.type === 'active') {
      badgeEl.className = 'drawer-item-badge drawer-item-badge--active';
      badgeEl.textContent = '';
    } else {
      badgeEl.className = 'drawer-item-badge drawer-item-badge--count';
      badgeEl.textContent = String(badge.value ?? '');
    }
  });
}

/** Sync badge state from bottom icon events. */
export function syncBadgesFromEvents(updateBadgeFn: (id: string, badge: DrawerBadge | null) => void): void {
  const sensorPluginIds = ['sensor-list-menu', 'sensor-info-menu', 'sensor-fov-menu', 'sensor-surv-menu'];

  for (const id of sensorPluginIds) {
    const bottomIcon = getEl(id, true);

    if (bottomIcon && !bottomIcon.classList.contains('bmenu-item-disabled')) {
      updateBadgeFn(id, { type: 'active' });
    } else {
      updateBadgeFn(id, null);
    }
  }
}

// ---- Disabled Utility Icons ----

/**
 * Explain a click on a disabled utility icon instead of swallowing it.
 *
 * The icon shakes, and when its plugin is disabled because it needs a selection
 * (`isRequireSensorSelected` / `isRequireSatelliteSelected`) the plugin's own
 * verify method shows the matching "Select a ... first!" toast. Nothing is
 * emitted, so the action itself never runs from a disabled icon.
 * @returns true when a "needs selection" message was shown.
 */
export function explainDisabledUtilityIcon(iconEl: HTMLElement): boolean {
  shake(iconEl);

  const bottomIconId = iconEl.dataset.pluginId;

  if (!bottomIconId) {
    return false;
  }

  const plugin = PluginRegistry.plugins.find((p) => p.bottomIconElementName === bottomIconId);

  if (!plugin) {
    return false;
  }

  // Same order as the base bottomMenuClick handler: sensor first, then satellite.
  if (plugin.isRequireSensorSelected && !plugin.verifySensorSelected()) {
    return true;
  }

  if (plugin.isRequireSatelliteSelected && !plugin.verifySatelliteSelected()) {
    return true;
  }

  return false;
}

// ---- Utility Footer Sync ----

/** Sync utility footer icon selection state with bottom menu. */
export function syncUtilityFooterState(): void {
  const footerEl = getEl('drawer-utility-footer', true);

  footerEl?.querySelectorAll('.drawer-utility-icon[data-plugin-id]').forEach((el) => {
    const pluginId = (el as HTMLElement).dataset.pluginId;
    const bottomIcon = pluginId ? getEl(pluginId, true) : null;

    if (!bottomIcon) {
      return;
    }
    const isSelected = bottomIcon.classList.contains('bmenu-item-selected');

    el.classList.toggle('bmenu-item-selected', isSelected);
  });

  footerEl?.querySelectorAll('.drawer-utility-icon[data-top-menu-id]').forEach((el) => {
    const topMenuId = (el as HTMLElement).dataset.topMenuId;
    const navBtn = topMenuId ? getEl(topMenuId, true) : null;
    const isSelected = navBtn?.classList.contains('bmenu-item-selected') ?? false;
    const isDisabled = navBtn?.classList.contains('bmenu-item-disabled') ?? false;

    el.classList.toggle('bmenu-item-selected', isSelected);
    el.classList.toggle('bmenu-item-disabled', isDisabled);
  });
}

/** Set initial selected/disabled state on utility footer icons. */
export function syncInitialUtilityState(): void {
  for (const plugin of PluginRegistry.plugins) {
    const utilityIcon = getEl(`${plugin.id}-utility-icon`, true);

    if (!utilityIcon) {
      continue;
    }
    if (plugin.isMenuButtonActive) {
      utilityIcon.classList.add('bmenu-item-selected');
    }
    if (plugin.isIconDisabled) {
      utilityIcon.classList.add('bmenu-item-disabled');
    }
  }

  const footerEl = getEl('drawer-utility-footer', true);

  footerEl?.querySelectorAll('.drawer-utility-icon[data-top-menu-id]').forEach((el) => {
    const topMenuId = (el as HTMLElement).dataset.topMenuId;
    const navBtn = topMenuId ? getEl(topMenuId, true) : null;
    const isSelected = navBtn?.classList.contains('bmenu-item-selected') || !!navBtn?.querySelector('.bmenu-item-selected');

    el.classList.toggle('bmenu-item-selected', !!isSelected);
  });
}

// ---- Recent Items (shared by the drawer and the Launchpad) ----

/** Maximum number of recent activations persisted to storage. */
const RECENTS_MAX_STORED_ = 20;

/** One persisted recents entry: an item id plus the activation timestamp (epoch ms). */
export interface RecentEntry {
  id: string;
  t: number;
}

/**
 * Read the shared recents list (newest first), tolerating malformed data and
 * migrating the legacy plain-string-array format to timestamped entries. This is
 * the single source of truth for both the {@link PluginDrawer} "Recent" group and
 * the Launchpad "Recent" row, so activations from either surface stay in sync.
 */
export function loadRecents(): RecentEntry[] {
  try {
    const stored = PersistenceManager.getInstance().getItem(StorageKey.DRAWER_RECENT_PLUGINS);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry): RecentEntry | null => {
        // Legacy format: a bare string[] of plugin ids with no timestamps.
        if (typeof entry === 'string') {
          return { id: migrateLegacyBottomIconId(entry), t: 0 };
        }
        if (typeof entry === 'object' && entry !== null && typeof (entry as RecentEntry).id === 'string' && typeof (entry as RecentEntry).t === 'number') {
          return { id: migrateLegacyBottomIconId((entry as RecentEntry).id), t: (entry as RecentEntry).t };
        }

        return null;
      })
      .filter((entry): entry is RecentEntry => entry !== null);
  } catch {
    return [];
  }
}

/**
 * Record an item activation: move it to the front of the shared recents list,
 * stamp the time, cap the persisted list, and return the updated entries.
 */
export function recordRecent(id: string): RecentEntry[] {
  const entries = loadRecents().filter((entry) => entry.id !== id);

  entries.unshift({ id, t: Date.now() });
  const capped = entries.slice(0, RECENTS_MAX_STORED_);

  try {
    PersistenceManager.getInstance().saveItem(StorageKey.DRAWER_RECENT_PLUGINS, JSON.stringify(capped));
  } catch {
    // Ignore storage errors
  }

  return capped;
}

/**
 * Build a DrawerGroup from recent item IDs, resolving only ids present in the
 * supplied cache and capping the resolved result to {@link maxItems}.
 */
export function buildRecentGroupFromCache(recentIds: string[], allItems: Map<string, DrawerItemData>, maxItems = MAX_RECENT_PLUGINS_): DrawerGroup {
  const recentItems: DrawerItemData[] = [];

  for (const pluginId of recentIds) {
    const item = allItems.get(pluginId);

    if (item && !item.isExcludedFromRecent) {
      recentItems.push({ ...item, order: recentItems.length });
    }
    if (recentItems.length >= maxItems) {
      break;
    }
  }

  return {
    label: t7e('pluginDrawer.modeRecent' as DrawerKey_),
    items: recentItems,
  };
}
