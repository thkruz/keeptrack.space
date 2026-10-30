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
 * A composition plugin (getBottomIconConfig + getSideMenuConfig) must get onBottomIconDeselect
 * exactly once per close, whichever path closes its menu.
 */
class CompositionPlugin extends KeepTrackPlugin {
  readonly id: string;
  dependencies_: string[] = [];
  deselectSpy = vi.fn();
  private readonly slug_: string;

  constructor(slug = 'deselect') {
    super();
    this.slug_ = slug;
    this.id = `Composition-${slug}`;
  }

  getBottomIconConfig(): IBottomIconConfig {
    return { elementName: `composition-${this.slug_}-icon`, label: this.slug_, image: 'icon.png', menuMode: [MenuMode.CATALOG, MenuMode.ALL] };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return { elementName: `composition-${this.slug_}-menu`, title: this.slug_, html: '<div>content</div>' };
  }

  onBottomIconDeselect(): void {
    this.deselectSpy();
  }
}

const open = (plugin: KeepTrackPlugin): void => {
  EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, plugin.bottomIconElementName);
};

describe('KeepTrackPlugin onBottomIconDeselect for composition plugins', () => {
  let plugin: CompositionPlugin;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
    // Mirror the real UiManager.hideSideMenus, which broadcasts to every plugin.
    vi.spyOn(ServiceLocator.getUiManager(), 'hideSideMenus').mockImplementation(() => {
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
    });
    plugin = new CompositionPlugin();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires once when the bottom icon is clicked again', () => {
    open(plugin);
    expect(plugin.isMenuButtonActive).toBe(true);

    open(plugin);

    expect(plugin.isMenuButtonActive).toBe(false);
    expect(plugin.deselectSpy).toHaveBeenCalledTimes(1);
  });

  it('fires once when the side menu close button is clicked', () => {
    open(plugin);
    getEl('composition-deselect-menu-close-btn')!.click();

    expect(plugin.isMenuButtonActive).toBe(false);
    expect(plugin.deselectSpy).toHaveBeenCalledTimes(1);
  });

  it('fires once when another plugin opens', () => {
    const other = new CompositionPlugin('other');

    other.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    open(plugin);
    open(other);

    expect(plugin.isMenuButtonActive).toBe(false);
    expect(other.isMenuButtonActive).toBe(true);
    expect(plugin.deselectSpy).toHaveBeenCalledTimes(1);
  });

  it('fires once for setBottomIconToUnselected, including after setBottomIconToSelected', () => {
    plugin.setBottomIconToSelected();
    plugin.setBottomIconToUnselected();
    plugin.setBottomIconToUnselected();

    expect(plugin.deselectSpy).toHaveBeenCalledTimes(1);
  });

  it('does not fire when a menu closes while this plugin was never open', () => {
    EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
    plugin.setBottomIconToUnselected();

    expect(plugin.deselectSpy).not.toHaveBeenCalled();
  });

  it('fires again on each later open/close cycle', () => {
    open(plugin);
    open(plugin);
    open(plugin);
    EventBus.getInstance().emit(EventBusEvent.hideSideMenus);

    expect(plugin.deselectSpy).toHaveBeenCalledTimes(2);
  });
});
