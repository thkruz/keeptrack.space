import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A legacy plugin (bottomIcon* / sideMenuElementHtml fields, no getSideMenuConfig) gets
 * onSideMenuOpen once per open too: openSideMenu() serves both kinds.
 */
class LegacyPlugin extends KeepTrackPlugin {
  readonly id = 'SideMenuOpenHookLegacy';
  dependencies_: string[] = [];
  openSpy = vi.fn();
  bottomIconElementName = 'side-open-legacy-icon';
  bottomIconLabel = 'Legacy';
  bottomIconImg = 'icon.png' as unknown as Module;
  sideMenuElementName = 'side-open-legacy-menu';
  sideMenuElementHtml = '<div>legacy</div>';

  onSideMenuOpen(): void {
    this.openSpy();
  }
}

describe('KeepTrackPlugin onSideMenuOpen (legacy fields)', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
    vi.spyOn(ServiceLocator.getUiManager(), 'hideSideMenus').mockImplementation(() => {
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires once per open', () => {
    const plugin = new LegacyPlugin();
    const click = (): void => {
      EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, plugin.bottomIconElementName);
    };

    websiteInit(plugin);
    click();
    click();
    click();

    expect(plugin.openSpy).toHaveBeenCalledTimes(2);
  });
});
