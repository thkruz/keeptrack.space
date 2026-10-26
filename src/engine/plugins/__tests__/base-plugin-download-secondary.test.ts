import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ISecondaryMenuConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A plugin with both onDownload and getSecondaryMenuConfig used to get its download wiring only
 * from the never-initialised SecondaryMenuComponent, so no download icon was ever rendered.
 */
class DownloadPlugin extends KeepTrackPlugin {
  readonly id = 'CompositionDownloadPlugin';
  dependencies_: string[] = [];
  downloadSpy = vi.fn();

  getBottomIconConfig(): IBottomIconConfig {
    return { elementName: 'composition-download-icon', label: 'Download', image: 'icon.png', menuMode: [MenuMode.CATALOG, MenuMode.ALL] };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return { elementName: 'composition-download-menu', title: 'Download', html: '<div>content</div>' };
  }

  getSecondaryMenuConfig(): ISecondaryMenuConfig {
    return { html: '<div>settings</div>' };
  }

  onDownload(): void {
    this.downloadSpy();
  }
}

describe('KeepTrackPlugin onDownload with a secondary menu', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
  });

  it('renders the title-bar download icon and wires it to onDownload', () => {
    const plugin = new DownloadPlugin();

    websiteInit(plugin);

    const downloadBtn = getEl('composition-download-menu-download-btn');

    expect(downloadBtn).not.toBeNull();
    expect(getEl('composition-download-menu-secondary-btn')).not.toBeNull();

    downloadBtn!.click();

    expect(plugin.downloadSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps a download callback the plugin assigned itself', () => {
    const plugin = new DownloadPlugin();
    const custom = vi.fn();

    plugin.downloadIconCb = custom;
    websiteInit(plugin);
    getEl('composition-download-menu-download-btn')!.click();

    expect(custom).toHaveBeenCalledTimes(1);
    expect(plugin.downloadSpy).not.toHaveBeenCalled();
  });
});
