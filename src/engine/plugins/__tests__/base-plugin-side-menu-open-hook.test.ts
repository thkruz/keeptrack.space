import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * onSideMenuOpen must fire exactly once each time the side menu opens, by any path.
 * openSideMenu() is the only caller. The legacy sideMenuElementHtml case is in
 * base-plugin-side-menu-open-hook-legacy.test.ts.
 */
class CompositionPlugin extends KeepTrackPlugin {
  readonly id = 'SideMenuOpenHookComposition';
  dependencies_: string[] = [];
  openSpy = vi.fn();

  getBottomIconConfig(): IBottomIconConfig {
    return { elementName: 'side-open-hook-icon', label: 'Hook', image: 'icon.png', menuMode: [MenuMode.CATALOG, MenuMode.ALL] };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return { elementName: 'side-open-hook-menu', title: 'Hook', html: '<div>content</div>' };
  }

  getKeyboardShortcuts() {
    return [{ key: 'J', callback: () => this.bottomMenuClicked() }];
  }

  onSideMenuOpen(): void {
    this.openSpy();
  }
}

const click = (plugin: KeepTrackPlugin): void => {
  EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, plugin.bottomIconElementName);
};

describe('KeepTrackPlugin onSideMenuOpen', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
    // Mirror the real UiManager.hideSideMenus, which broadcasts to every plugin.
    vi.spyOn(ServiceLocator.getUiManager(), 'hideSideMenus').mockImplementation(() => {
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSideMenuConfig plugin', () => {
    let plugin: CompositionPlugin;

    beforeEach(() => {
      plugin = new CompositionPlugin();
      websiteInit(plugin);
    });

    it('fires once when the bottom icon opens the menu', () => {
      click(plugin);

      expect(plugin.isMenuButtonActive).toBe(true);
      expect(plugin.openSpy).toHaveBeenCalledTimes(1);
    });

    it('does not fire when the menu closes (close button or icon toggle)', () => {
      click(plugin);
      getEl('side-open-hook-menu-close-btn')!.click();
      click(plugin);
      click(plugin);

      expect(plugin.isMenuButtonActive).toBe(false);
      expect(plugin.openSpy).toHaveBeenCalledTimes(2);
    });

    it('fires again on each later open', () => {
      click(plugin);
      click(plugin);
      click(plugin);
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
      click(plugin);

      expect(plugin.openSpy).toHaveBeenCalledTimes(3);
    });

    it('fires once for the keyboard shortcut / palette path (bottomMenuClicked)', () => {
      plugin.bottomMenuClicked();

      expect(plugin.openSpy).toHaveBeenCalledTimes(1);
    });

    it('fires once for a direct openSideMenu() call', () => {
      plugin.openSideMenu();

      expect(plugin.openSpy).toHaveBeenCalledTimes(1);
    });

    it('does not fire when the icon is disabled', () => {
      plugin.setBottomIconToDisabled();
      click(plugin);

      expect(plugin.openSpy).not.toHaveBeenCalled();
    });
  });
});
