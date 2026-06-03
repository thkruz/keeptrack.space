import { SoundNames } from '@app/engine/audio/sounds';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { settingsManager } from '@app/settings/settings';
import appsPng from '@public/img/icons/apps.png';
import leftPanelClosePng from '@public/img/icons/left-panel-close.png';
import leftPanelOpenPng from '@public/img/icons/left-panel-open.png';
import searchPng from '@public/img/icons/search.png';
import ktsOrangeLogoPng from '@public/img/kts-orange-logo.png';
import {
  type DrawerBadge, type DrawerGroup, type DrawerItemData,
  buildRecentGroupFromCache, collectDrawerItems, loadRecentPlugins, renderBadge,
  renderStatusFooter, renderUtilityFooter, saveRecentPlugins,
  syncBadgesFromEvents, syncInitialUtilityState, syncUtilityFooterState,
  trackRecentPlugin, updateConnectivityStatus,
} from './plugin-drawer-helpers';
import './plugin-drawer.css';


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

    // Only show the app-launcher button when the Launchpad plugin is loaded.
    const hasLauncher = !!PluginRegistry.getPluginByName('LaunchpadPlugin');
    const launcherHtml = hasLauncher
      ? [
        '    <div class="drawer-app-launcher" id="drawer-app-launcher" role="button" tabindex="0"',
        '      aria-label="Open app launcher" kt-tooltip="App Launcher (Shift+Z)">',
        `      <img class="drawer-app-launcher-icon" src="${appsPng}" alt="App Launcher" />`,
        '    </div>',
      ].join('')
      : '';

    drawer.id = 'plugin-drawer';
    drawer.className = `plugin-drawer ${modeClass}`;
    drawer.innerHTML = [
      '<div class="drawer-inner">',
      '  <div class="drawer-top-actions">',
      '    <div class="drawer-search" id="drawer-search-trigger" role="button" tabindex="0">',
      `      <img class="drawer-search-icon" src=${searchPng} alt="Search" />`,
      '      <span class="drawer-search-label">Search\u2026</span>',
      '      <span class="drawer-search-shortcut">Ctrl+\u21E7+K</span>',
      '    </div>',
      launcherHtml,
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
    const { menuGroups, utilityGroups } = collectDrawerItems();

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

    // App launcher trigger — opens the Launchpad grid
    const appLauncher = getEl('drawer-app-launcher', true);

    if (appLauncher) {
      appLauncher.addEventListener('click', () => {
        ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
        PluginDrawer.openAppLauncher_();
      });
      appLauncher.addEventListener('keydown', (evt: KeyboardEvent) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          PluginDrawer.openAppLauncher_();
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

  // ---- App Launcher ----

  private static openAppLauncher_(): void {
    // Dispatch the keyboard shortcut that the LaunchpadPlugin listens for
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyZ',
      key: 'Z',
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
