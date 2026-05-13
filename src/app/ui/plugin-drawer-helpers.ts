import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
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
}

export interface DrawerGroup {
  label: string;
  items: DrawerItemData[];
}

const MAX_RECENT_PLUGINS_ = 8;

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
      const proClass = (item.isLoginRequired && !settingsManager.isDisableLoginGate) ? ' bmenu-item-pro' : '';
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

/** Render the status footer showing connectivity and version. */
export function renderStatusFooter(): void {
  const footerEl = getEl('drawer-status-footer', true);

  if (!footerEl) {
    return;
  }

  const isOnline = navigator.onLine;

  footerEl.innerHTML = [
    '<div class="drawer-status-footer">',
    '  <div class="drawer-status-connectivity">',
    `    <span class="drawer-status-dot${isOnline ? '' : ' drawer-status-dot--offline'}"></span>`,
    `    <span class="drawer-status-connectivity-label${isOnline ? '' : ' drawer-status-connectivity-label--offline'}">${isOnline ? 'Connected' : 'Offline'}</span>`,
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
    label.textContent = isOnline ? 'Connected' : 'Offline';
  }
}

// ---- Badges ----

/** Render a badge on a plugin's drawer item. */
export function renderBadge(pluginId: string, badges: Map<string, DrawerBadge>): void {
  const contentEl = getEl('drawer-content', true);

  if (!contentEl) {
    return;
  }

  contentEl.querySelectorAll(`.drawer-item[data-plugin-id="${pluginId}"] .drawer-item-badge`).forEach((badgeEl) => {
    const badge = badges.get(pluginId);

    if (!badge) {
      badgeEl.className = 'drawer-item-badge';
      badgeEl.textContent = '';

      return;
    }

    if (badge.type === 'active') {
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
    const isSelected = navBtn?.classList.contains('bmenu-item-selected') ||
      !!navBtn?.querySelector('.bmenu-item-selected');

    el.classList.toggle('bmenu-item-selected', !!isSelected);
  });
}

// ---- Recent Plugins ----

/** Load the list of recently-used plugin IDs from persistence. */
export function loadRecentPlugins(): string[] {
  try {
    const stored = PersistenceManager.getInstance().getItem(StorageKey.DRAWER_RECENT_PLUGINS);

    if (stored) {
      return JSON.parse(stored) as string[];
    }
  } catch {
    // Ignore parse errors
  }

  return [];
}

/** Persist the list of recently-used plugin IDs. */
export function saveRecentPlugins(ids: string[]): void {
  try {
    PersistenceManager.getInstance().saveItem(
      StorageKey.DRAWER_RECENT_PLUGINS,
      JSON.stringify(ids),
    );
  } catch {
    // Ignore storage errors
  }
}

/** Add a plugin to the front of the recent list, trimming to max size. */
export function trackRecentPlugin(recentIds: string[], pluginId: string): string[] {
  const updated = recentIds.filter((id) => id !== pluginId);

  updated.unshift(pluginId);

  if (updated.length > MAX_RECENT_PLUGINS_) {
    updated.length = MAX_RECENT_PLUGINS_;
  }

  return updated;
}

/** Build a DrawerGroup from cached recent plugin IDs. */
export function buildRecentGroupFromCache(recentIds: string[], allItems: Map<string, DrawerItemData>): DrawerGroup {
  const recentItems: DrawerItemData[] = [];

  for (const pluginId of recentIds) {
    const item = allItems.get(pluginId);

    if (item) {
      recentItems.push({ ...item, order: recentItems.length });
    }
  }

  return {
    label: t7e('pluginDrawer.modeRecent' as DrawerKey_),
    items: recentItems,
  };
}
