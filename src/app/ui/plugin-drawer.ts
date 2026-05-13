import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { TopMenuPlugin } from '@app/engine/plugins/top-menu-plugin';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { settingsManager } from '@app/settings/settings';
import leftPanelClosePng from '@public/img/icons/left-panel-close.png';
import leftPanelOpenPng from '@public/img/icons/left-panel-open.png';
import searchPng from '@public/img/icons/search.png';
import ktsOrangeLogoPng from '@public/img/kts-orange-logo.png';
import {
  type DrawerBadge, type DrawerGroup, type DrawerItemData,
  buildRecentGroupFromCache, loadRecentPlugins, renderBadge,
  renderStatusFooter, renderUtilityFooter, saveRecentPlugins,
  syncBadgesFromEvents, syncInitialUtilityState, syncUtilityFooterState,
  trackRecentPlugin, updateConnectivityStatus,
} from './plugin-drawer-helpers';
import './plugin-drawer.css';

type DrawerKey_ = Parameters<typeof t7e>[0];

const MODE_LABEL_KEYS: Record<number, DrawerKey_> = {
  [MenuMode.CATALOG]: 'pluginDrawer.modeCatalog' as DrawerKey_,
  [MenuMode.SENSORS]: 'pluginDrawer.modeSensors' as DrawerKey_,
  [MenuMode.EVENTS]: 'pluginDrawer.modeEvents' as DrawerKey_,
  [MenuMode.CREATE]: 'pluginDrawer.modeCreate' as DrawerKey_,
  [MenuMode.ANALYSIS]: 'pluginDrawer.modeAnalysis' as DrawerKey_,
  [MenuMode.DISPLAY]: 'pluginDrawer.modeDisplay' as DrawerKey_,
  [MenuMode.TOOLS]: 'pluginDrawer.modeTools' as DrawerKey_,
  [MenuMode.SETTINGS]: 'pluginDrawer.modeSettings' as DrawerKey_,
  [MenuMode.EXPERIMENTAL]: 'pluginDrawer.modeExperimental' as DrawerKey_,
};

/** Nav item IDs that should appear in the utility footer instead of Quick Actions */
const UTILITY_NAV_ITEM_IDS = new Set(['sound-btn', 'layers-menu-btn']);


export class PluginDrawer {
  private isOpen_ = false;
  private isMobileMode_ = false;
  private drawerEl_: HTMLElement | null = null;
  private overlayEl_: HTMLElement | null = null;
  private hamburgerEl_: HTMLElement | null = null;
  private groupStates_: Record<string, boolean> = {};
  private recentPluginIds_: string[] = [];
  private readonly allDrawerItems_: Map<string, DrawerItemData> = new Map();
  private isRailMode_ = false;
  private readonly badges_: Map<string, DrawerBadge> = new Map();
  private hasItems_ = false;

  init(): void {
    this.isMobileMode_ = settingsManager.isMobileModeEnabled;

    document.body.classList.add('drawer-mode');
    if (this.isMobileMode_) {
      document.body.classList.add('is-mobile-mode');
    }

    this.loadGroupStates_();
    this.recentPluginIds_ = loadRecentPlugins();

    // Rail mode is automatic on tablet+ (non-mobile)
    this.isRailMode_ = !this.isMobileMode_;

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.createDrawerDom_();
      this.createHamburgerButton_();
    });

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      this.populateDrawerItems_();
      this.wireEventListeners_();
    });

    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
      this.drawerEl_?.classList.add('ready');
    });

    EventBus.getInstance().on(EventBusEvent.hideSideMenus, () => {
      // Don't close the drawer if it's in rail mode — only close full open
      if (this.isOpen_) {
        this.close();
      }
    });

    EventBus.getInstance().on(EventBusEvent.selectSatData, () => {
      this.close();
      this.syncDisabledState_();
    });

    EventBus.getInstance().on(EventBusEvent.setSensor, () => {
      this.syncDisabledState_();
      this.syncBadgesFromEvents_();
    });

    EventBus.getInstance().on(EventBusEvent.resetSensor, () => {
      this.syncBadgesFromEvents_();
    });

    EventBus.getInstance().on(EventBusEvent.onWatchlistUpdated, (watchlist: { id: number; inView: boolean }[]) => {
      this.updateBadge_(
        'watchlist-overlay-menu',
        watchlist.length > 0 ? { type: 'count', value: watchlist.length } : null,
      );
    });

    EventBus.getInstance().on(EventBusEvent.connectivityChange, (isOnline: boolean) => {
      this.updateConnectivityStatus_(isOnline);
    });
  }

  open(): void {
    if (this.isOpen_) {
      return;
    }
    this.isOpen_ = true;
    this.exitRailMode_();
    this.syncActiveState_();
    this.drawerEl_?.classList.add('open');
    this.overlayEl_?.classList.add('open');
    this.hamburgerEl_?.classList.add('open');
  }

  close(): void {
    if (!this.isOpen_) {
      return;
    }
    this.isOpen_ = false;
    this.drawerEl_?.classList.remove('open');
    this.overlayEl_?.classList.remove('open');
    this.hamburgerEl_?.classList.remove('open');

    // Re-enter rail mode after closing on tablet+ (rail is always active)
    if (this.isRailMode_ && !this.isMobileMode_) {
      this.enterRailMode_();
    }
  }

  toggle(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    if (this.isOpen_) {
      this.close();
    } else {
      this.open();
    }
  }

  toggleRailMode(): void {
    if (this.isMobileMode_) {
      return;
    }

    // On tablet+, toggle between rail and locked-open
    this.toggle();
  }

  private createHamburgerButton_(): void {
    const btn = document.createElement('div');

    btn.id = 'drawer-hamburger';
    btn.className = 'drawer-hamburger';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'Open plugin menu');
    btn.innerHTML = [
      '<span class="drawer-hamburger-bar"></span>',
      '<span class="drawer-hamburger-bar"></span>',
      '<span class="drawer-hamburger-bar"></span>',
    ].join('');

    const logoEl = settingsManager.navBarLogoUrl
      ? document.createElement('a')
      : document.createElement('div');

    logoEl.id = 'nav-logo';
    logoEl.className = 'nav-logo';
    if (settingsManager.navBarLogoUrl && logoEl instanceof HTMLAnchorElement) {
      logoEl.href = 'https://keeptrack.space';
      logoEl.target = '_blank';
      logoEl.rel = 'noopener noreferrer';
      logoEl.innerHTML = `<img src="${settingsManager.navBarLogoUrl}" alt="KeepTrack" />`;
    }

    const navWrapper = getEl('nav-wrapper', true);

    if (this.isMobileMode_) {
      // Mobile: hamburger + compact logo in the nav bar (top-left)
      logoEl.innerHTML = `<img src="${ktsOrangeLogoPng}" alt="KeepTrack" />`;
      navWrapper?.prepend(logoEl);
      navWrapper?.prepend(btn);
    } else {
      // Desktop: hamburger + logo in the nav bar (top-left)
      navWrapper?.prepend(logoEl);
      navWrapper?.prepend(btn);
    }

    this.hamburgerEl_ = btn;
  }

  private createDrawerDom_(): void {
    const root = getEl('keeptrack-root', true);

    if (!root) {
      return;
    }

    const modeClass = this.isMobileMode_ ? 'mobile-mode' : 'desktop-mode';

    const overlay = document.createElement('div');

    overlay.id = 'drawer-overlay';
    overlay.className = 'drawer-overlay';

    const drawer = document.createElement('div');

    drawer.id = 'plugin-drawer';
    drawer.className = `plugin-drawer ${modeClass}`;
    drawer.innerHTML = [
      '<div class="drawer-inner">',
      '  <div class="drawer-search" id="drawer-search-trigger" role="button" tabindex="0">',
      `    <img class="drawer-search-icon" src=${searchPng} alt="Search" />`,
      '    <span class="drawer-search-label">Search\u2026</span>',
      '    <span class="drawer-search-shortcut">Ctrl+\u21E7+K</span>',
      '  </div>',
      '  <div id="drawer-content" class="drawer-content"></div>',
      '</div>',
      '<div id="drawer-user-account" class="drawer-user-account"></div>',
      '<div id="drawer-status-footer" class="drawer-status-footer-container"></div>',
      '<div id="drawer-rail-toggle" class="drawer-rail-toggle" role="button" aria-label="Toggle rail mode">',
      `  <img class="drawer-rail-toggle-icon" src="${leftPanelClosePng}" alt="" />`,
      '  <span class="drawer-rail-toggle-label">Collapse</span>',
      '  <span class="drawer-rail-toggle-shortcut">Tab</span>',
      '</div>',
    ].join('');

    // Utility footer inside ui-wrapper so it shares the same stacking context as side menus
    const utilityFooter = document.createElement('div');

    utilityFooter.id = 'drawer-utility-footer';
    utilityFooter.className = 'drawer-utility-footer';

    root.appendChild(overlay);
    root.appendChild(drawer);

    const uiWrapper = getEl('ui-wrapper', true);

    (uiWrapper ?? root).appendChild(utilityFooter);

    this.overlayEl_ = overlay;
    this.drawerEl_ = drawer;
  }

  private populateDrawerItems_(): void {
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

    // About group for TopMenuPlugin instances (e.g., GithubLink)
    menuGroups.about = { label: t7e('pluginDrawer.groupAbout' as DrawerKey_), items: [] };

    for (const plugin of plugins) {
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
      const imgSrc = this.resolveImgSrc_(plugin);

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
          isDisabled: plugin.isIconDisabledOnLoad,
          isLoginRequired: plugin.isLoginRequired,
          order,
        });
      }

      // Put in first matching MenuMode group (only if not in the utility footer)
      if (plugin.iconPlacement === IconPlacement.BOTTOM_ONLY) {
        const primaryMode = plugin.menuMode.find((m) => m !== MenuMode.ALL) ?? MenuMode.CATALOG;

        menuGroups[`mode-${primaryMode}`]?.items.push({
          id: plugin.bottomIconElementName,
          label: plugin.bottomIconLabel,
          imgSrc,
          isTopMenu: false,
          isDisabled: plugin.isIconDisabledOnLoad,
          isLoginRequired: plugin.isLoginRequired,
          order,
          shortcutHint: PluginDrawer.getShortcutHint_(plugin.id),
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

    // Build the "Recent" group from persisted recent plugin IDs
    const recentGroup = this.buildRecentGroup_(menuGroups);

    this.renderMenuGroups_(menuGroups, recentGroup);
    this.renderUtilityFooter_(utilityGroups);
    this.renderStatusFooter_();
    this.syncInitialUtilityState_();
    PluginDrawer.updateBottomMenuCssVars_();

    // Check if the drawer has any items at all
    this.hasItems_ = this.allDrawerItems_.size > 0;
    if (!this.hasItems_) {
      this.drawerEl_?.classList.add('drawer-empty');
      this.hamburgerEl_?.classList.add('drawer-empty');

      return;
    }

    // Apply rail mode if it was persisted (desktop only)
    if (this.isRailMode_ && !this.isMobileMode_) {
      this.enterRailMode_();
    }
  }

  private renderMenuGroups_(groups: Record<string, DrawerGroup>, recentGroup?: DrawerGroup): void {
    const contentEl = getEl('drawer-content', true);

    if (!contentEl) {
      return;
    }

    let html = '';

    // Render "Recent" group first if it has items
    if (recentGroup && recentGroup.items.length > 0) {
      html += PluginDrawer.renderGroupHtml_('recent', recentGroup, true);
    }

    for (const [key, group] of Object.entries(groups)) {
      if (group.items.length === 0) {
        continue;
      }

      group.items.sort((a, b) => a.order - b.order);

      const isExpanded = this.groupStates_[key] !== false;

      html += PluginDrawer.renderGroupHtml_(key, group, isExpanded);
    }

    contentEl.innerHTML = html;

    // Wire group header click handlers for collapsible behavior
    contentEl.querySelectorAll('.drawer-group-header').forEach((header) => {
      header.addEventListener('click', () => {
        const groupEl = header.parentElement;

        groupEl?.classList.toggle('collapsed');
        const key = groupEl?.getAttribute('data-group-key');

        if (key) {
          this.groupStates_[key] = !groupEl?.classList.contains('collapsed');
          this.saveGroupStates_();
        }
      });
    });
  }

  private renderUtilityFooter_(groups: Record<string, DrawerGroup>): void {
    renderUtilityFooter(groups);
  }

  private resolveImgSrc_(plugin: KeepTrackPlugin): string {
    // Try to get from the already-rendered bottom icon DOM element
    const iconEl = getEl(plugin.bottomIconElementName, true);
    const img = iconEl?.querySelector('img') as HTMLImageElement | null;

    if (img) {
      return img.src || img.getAttribute('delayedsrc') || String(plugin.bottomIconImg);
    }

    return String(plugin.bottomIconImg);
  }

  private wireEventListeners_(): void {
    const drawerContent = getEl('drawer-content', true);

    if (drawerContent) {
      drawerContent.addEventListener('click', (evt: Event) => {
        const itemEl = (evt.target as HTMLElement).closest('.drawer-item') as HTMLElement | null;

        if (!itemEl || itemEl.classList.contains('disabled')) {
          return;
        }

        const pluginId = itemEl.dataset.pluginId;
        const topMenuId = itemEl.dataset.topMenuId;

        if (pluginId) {
          ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
          this.trackRecentPlugin_(pluginId);
          // Collapse rail-hover so the side menu underneath is visible
          this.drawerEl_?.classList.remove('rail-hover');
          // Close drawer first so the side menu can animate cleanly
          this.close();
          // Small delay to let the drawer close before emitting the event
          setTimeout(() => {
            EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, pluginId);
          }, 100);
        } else if (topMenuId) {
          ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
          const btnEl = getEl(`${topMenuId}-btn`, true);

          btnEl?.click();
          // Collapse rail-hover so the side menu underneath is visible
          this.drawerEl_?.classList.remove('rail-hover');
          this.close();
        }
      });

      // Keyboard activation (Enter/Space) for drawer items
      drawerContent.addEventListener('keydown', (evt: KeyboardEvent) => {
        if (evt.key !== 'Enter' && evt.key !== ' ') {
          return;
        }
        const itemEl = evt.target as HTMLElement;

        if (!itemEl.classList.contains('drawer-item') || itemEl.classList.contains('disabled')) {
          return;
        }
        evt.preventDefault();
        itemEl.click();
      });
    }

    // Utility footer click handler
    const utilityFooter = getEl('drawer-utility-footer', true);

    if (utilityFooter) {
      utilityFooter.addEventListener('click', (evt: Event) => {
        // On mobile, first tap expands the footer; subsequent taps act on icons
        if (this.isMobileMode_ && !utilityFooter.classList.contains('expanded')) {
          utilityFooter.classList.add('expanded');

          return;
        }

        const iconEl = (evt.target as HTMLElement).closest('.drawer-utility-icon') as HTMLElement | null;

        if (!iconEl || iconEl.classList.contains('disabled')) {
          return;
        }

        const pluginId = iconEl.dataset.pluginId;
        const topMenuId = iconEl.dataset.topMenuId;

        if (pluginId) {
          ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
          EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, pluginId);
        } else if (topMenuId) {
          ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
          const btnEl = getEl(topMenuId, true);

          btnEl?.click();
          iconEl.classList.toggle('bmenu-item-selected');
        }
      });

      // On mobile, collapse utility footer when tapping outside it.
      // Use touchstart because the WebGL canvas swallows click events.
      if (this.isMobileMode_) {
        const collapseIfOutside = (evt: Event) => {
          if (utilityFooter.classList.contains('expanded') && !utilityFooter.contains(evt.target as Node)) {
            utilityFooter.classList.remove('expanded');
          }
        };

        document.addEventListener('touchstart', collapseIfOutside, { passive: true });
        document.addEventListener('click', collapseIfOutside);
      }
    }

    // Search trigger — opens command palette
    const searchTrigger = getEl('drawer-search-trigger', true);

    if (searchTrigger) {
      searchTrigger.addEventListener('click', () => {
        PluginDrawer.openCommandPalette_();
      });
      searchTrigger.addEventListener('keydown', (evt: KeyboardEvent) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          PluginDrawer.openCommandPalette_();
        }
      });
    }

    // Rail toggle button
    const railToggle = getEl('drawer-rail-toggle', true);

    if (railToggle) {
      railToggle.addEventListener('click', () => {
        ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
        this.toggleRailMode();
      });
    }

    // Rail hover expansion — entire drawer triggers expand except the toggle button
    if (!this.isMobileMode_ && this.drawerEl_) {
      const drawer = this.drawerEl_;

      drawer.addEventListener('mouseenter', () => {
        if (drawer.classList.contains('rail-mode')) {
          drawer.classList.add('rail-hover');
        }
      });
      drawer.addEventListener('mouseleave', () => {
        drawer.classList.remove('rail-hover');
      });

      // Prevent the toggle button from triggering hover expansion
      const railToggleEl = getEl('drawer-rail-toggle', true);

      if (railToggleEl) {
        railToggleEl.addEventListener('mouseenter', (evt) => {
          evt.stopPropagation();
          drawer.classList.remove('rail-hover');
        });
      }
    }

    // Hamburger button
    this.hamburgerEl_?.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      this.toggle();
    });

    // Overlay click closes drawer
    this.overlayEl_?.addEventListener('click', () => {
      this.close();
    });

    // Escape key closes drawer, Tab key toggles drawer
    window.addEventListener('keydown', (evt: KeyboardEvent) => {
      if (evt.key === 'Escape' && this.isOpen_) {
        this.close();
      }

      if (evt.key === 'Tab') {
        if (!this.hasItems_) {
          return;
        }

        // Don't toggle if user is typing in an input/textarea
        const activeEl = document.activeElement;

        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
          return;
        }

        evt.preventDefault();
        this.toggle();
      }
    });
  }

  private syncActiveState_(): void {
    // Sync menu items (both selected and disabled state)
    const contentEl = getEl('drawer-content', true);

    contentEl?.querySelectorAll('.drawer-item[data-plugin-id]').forEach((el) => {
      const pluginId = (el as HTMLElement).dataset.pluginId;
      const bottomIcon = pluginId ? getEl(pluginId, true) : null;
      const isSelected = bottomIcon?.classList.contains('bmenu-item-selected') ?? false;
      const isDisabled = bottomIcon?.classList.contains('bmenu-item-disabled') ?? false;

      el.classList.toggle('active', isSelected);
      el.classList.toggle('disabled', isDisabled);
    });

    this.syncUtilityFooterState_();
  }

  private syncUtilityFooterState_(): void {
    syncUtilityFooterState();
  }

  private syncInitialUtilityState_(): void {
    syncInitialUtilityState();
  }

  private syncDisabledState_(): void {
    const contentEl = getEl('drawer-content', true);

    contentEl?.querySelectorAll('.drawer-item[data-plugin-id]').forEach((el) => {
      const pluginId = (el as HTMLElement).dataset.pluginId;
      const bottomIcon = pluginId ? getEl(pluginId, true) : null;
      const isDisabled = bottomIcon?.classList.contains('bmenu-item-disabled') ?? false;

      el.classList.toggle('disabled', isDisabled);
    });

    this.syncUtilityFooterState_();
  }

  private static updateBottomMenuCssVars_(): void {
    // const footerEl = getEl('drawer-utility-footer', true);
    // const height = footerEl?.offsetHeight ?? 0;
    const height = 0;

    document.documentElement.style.setProperty('--bottom-menu-top', `${height}px`);
    document.documentElement.style.setProperty('--bottom-menu-height', `${height}px`);
  }

  private loadGroupStates_(): void {
    try {
      const stored = PersistenceManager.getInstance().getItem(StorageKey.DRAWER_GROUP_STATES);

      if (stored) {
        this.groupStates_ = JSON.parse(stored) as Record<string, boolean>;
      }
    } catch {
      // Ignore parse errors — use defaults (all expanded)
    }
  }

  private saveGroupStates_(): void {
    try {
      PersistenceManager.getInstance().saveItem(
        StorageKey.DRAWER_GROUP_STATES,
        JSON.stringify(this.groupStates_),
      );
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Look up the first registered keyboard shortcut for a plugin and return a display string.
   */
  private static getShortcutHint_(pluginId: string): string | undefined {
    const allShortcuts = KeyboardShortcutRegistry.getAll();

    for (const entry of allShortcuts) {
      if (entry.pluginId === pluginId) {
        return KeyboardShortcutRegistry.formatShortcut(entry.shortcut);
      }
    }

    return undefined;
  }

  /**
   * Render a single drawer group to HTML.
   */
  private static renderGroupHtml_(key: string, group: DrawerGroup, isExpanded: boolean): string {
    const collapsedClass = isExpanded ? '' : ' collapsed';
    let html = `<div class="drawer-group${collapsedClass}" data-group-key="${key}">`;

    html += '<div class="drawer-group-header">';
    html += `<span class="drawer-group-label">${group.label}</span>`;
    html += '<span class="drawer-group-chevron">&#x25BE;</span>';
    html += '</div>';
    html += '<div class="drawer-group-items">';

    for (const item of group.items) {
      const dataAttr = item.isTopMenu ? `data-top-menu-id="${item.id}"` : `data-plugin-id="${item.id}"`;
      const disabledClass = item.isDisabled ? ' disabled' : '';
      const proAttr = item.isLoginRequired ? ' data-pro-gated' : '';
      const proClass = (item.isLoginRequired && !settingsManager.isDisableLoginGate) ? ' bmenu-item-pro' : '';
      const tabIdx = item.isDisabled ? '' : ' tabindex="0"';
      const shortcutBadge = item.shortcutHint ? `<span class="drawer-item-shortcut">${item.shortcutHint}</span>` : '';

      html += `<div class="drawer-item${disabledClass}${proClass}" ${dataAttr}${proAttr}${tabIdx} role="button" kt-tooltip="${item.label}">`;
      html += `<img class="drawer-item-icon" src="${item.imgSrc}" alt="${item.label}" />`;
      html += `<span class="drawer-item-label">${item.label}</span>`;
      html += '<span class="drawer-item-badge"></span>';
      html += shortcutBadge;
      html += '</div>';
    }

    html += '</div>';
    html += '</div>';

    return html;
  }

  // ---- Command Palette ----

  private static openCommandPalette_(): void {
    // Dispatch the keyboard shortcut that the CommandPalettePlugin listens for
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyK',
      key: 'K',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    }));
  }

  // ---- Recent Plugins ----

  private trackRecentPlugin_(pluginId: string): void {
    this.recentPluginIds_ = trackRecentPlugin(this.recentPluginIds_, pluginId);
    saveRecentPlugins(this.recentPluginIds_);
    this.refreshRecentGroup_();
  }

  private buildRecentGroup_(menuGroups: Record<string, DrawerGroup>): DrawerGroup {
    this.allDrawerItems_.clear();
    for (const group of Object.values(menuGroups)) {
      for (const item of group.items) {
        if (!item.isTopMenu) {
          this.allDrawerItems_.set(item.id, item);
        }
      }
    }

    return buildRecentGroupFromCache(this.recentPluginIds_, this.allDrawerItems_);
  }

  private refreshRecentGroup_(): void {
    const contentEl = getEl('drawer-content', true);

    if (!contentEl) {
      return;
    }

    // Remove old recent group if present
    const oldRecent = contentEl.querySelector('.drawer-group[data-group-key="recent"]');

    oldRecent?.remove();

    const recentGroup = buildRecentGroupFromCache(this.recentPluginIds_, this.allDrawerItems_);

    if (recentGroup.items.length === 0) {
      return;
    }

    const html = PluginDrawer.renderGroupHtml_('recent', recentGroup, true);
    const template = document.createElement('template');

    template.innerHTML = html;
    const newGroupEl = template.content.firstElementChild;

    if (newGroupEl) {
      contentEl.prepend(newGroupEl);

      // Wire collapsible header for the new group
      const header = newGroupEl.querySelector('.drawer-group-header');

      header?.addEventListener('click', () => {
        newGroupEl.classList.toggle('collapsed');
        const key = (newGroupEl as HTMLElement).dataset.groupKey;

        if (key) {
          this.groupStates_[key] = !newGroupEl.classList.contains('collapsed');
          this.saveGroupStates_();
        }
      });
    }
  }

  // ---- Status Footer ----

  private renderStatusFooter_(): void {
    renderStatusFooter();
  }

  private updateConnectivityStatus_(isOnline: boolean): void {
    updateConnectivityStatus(this.drawerEl_, isOnline);
  }

  // ---- Badges ----

  updateBadge_(pluginId: string, badge: DrawerBadge | null): void {
    if (badge) {
      this.badges_.set(pluginId, badge);
    } else {
      this.badges_.delete(pluginId);
    }
    renderBadge(pluginId, this.badges_);
  }

  private syncBadgesFromEvents_(): void {
    syncBadgesFromEvents((id, badge) => this.updateBadge_(id, badge));
  }

  // ---- Rail Mode ----

  private enterRailMode_(): void {
    this.drawerEl_?.classList.remove('rail-hover');
    this.drawerEl_?.classList.add('rail-mode');
    document.documentElement.style.setProperty('--drawer-offset', '60px');
    this.updateRailToggleIcon_(true);
  }

  private exitRailMode_(): void {
    this.drawerEl_?.classList.remove('rail-hover', 'rail-mode');
    document.documentElement.style.setProperty('--drawer-offset', '0px');
    this.updateRailToggleIcon_(false);
  }

  private updateRailToggleIcon_(isRail: boolean): void {
    const icon = this.drawerEl_?.querySelector('.drawer-rail-toggle-icon') as HTMLImageElement | null;
    const label = this.drawerEl_?.querySelector('.drawer-rail-toggle-label');

    if (icon) {
      icon.src = isRail ? leftPanelOpenPng : leftPanelClosePng;
    }
    if (label) {
      label.textContent = isRail ? 'Expand' : 'Collapse';
    }
  }
}
