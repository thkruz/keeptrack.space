import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { adviceManagerInstance } from '@app/engine/utils/adviceManager';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class WithHelp extends KeepTrackPlugin {
  readonly id = 'MenuHelpBtnWith';
  dependencies_: string[] = [];
  helpTitle = 'Title';
  helpBody = 'Body';

  getBottomIconConfig(): IBottomIconConfig {
    return { elementName: 'menu-help-with-icon', label: 'H', image: 'icon.png', menuMode: [MenuMode.ALL] };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return { elementName: 'menu-help-with-menu', title: 'H', html: '<div>x</div>' };
  }
}

class WithHelp2 extends WithHelp {
  readonly id = 'MenuHelpBtnTwo';
  helpTitle = 'Title2';
  helpBody = 'Body2';

  getBottomIconConfig(): IBottomIconConfig {
    return { elementName: 'menu-help-two-icon', label: 'H', image: 'icon.png', menuMode: [MenuMode.ALL] };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return { elementName: 'menu-help-two-menu', title: 'H', html: '<div>x</div>' };
  }
}

class WithoutHelp extends WithHelp {
  readonly id = 'MenuHelpBtnWithout';
  helpTitle = '';
  helpBody = '';

  getBottomIconConfig(): IBottomIconConfig {
    return { elementName: 'menu-help-without-icon', label: 'H', image: 'icon.png', menuMode: [MenuMode.ALL] };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return { elementName: 'menu-help-without-menu', title: 'H', html: '<div>x</div>' };
  }
}

describe('side menu help button', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is visible, labelled and opens the context help when the plugin has help', () => {
    const spy = vi.spyOn(adviceManagerInstance, 'showAdvice').mockImplementation(() => undefined);

    websiteInit(new WithHelp());
    const btn = getEl('menu-help-with-menu-help-btn')!;

    expect(btn.hidden).toBe(false);
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-label')).toBeTruthy();
    expect(btn.getAttribute('kt-tooltip')).toBeTruthy();
    expect(btn.hasAttribute('title')).toBe(false);
    btn.click();
    expect(spy).toHaveBeenCalledWith('Title', 'Body');
  });

  it('opens the help of the menu that owns the button, not the first open menu', () => {
    const spy = vi.spyOn(adviceManagerInstance, 'showAdvice').mockImplementation(() => undefined);
    const a = new WithHelp();
    const b = new WithHelp2();

    websiteInit(a);
    websiteInit(b);
    a.isMenuButtonActive = true;
    b.isMenuButtonActive = true;
    getEl('menu-help-two-menu-help-btn')!.click();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Title2', 'Body2');
  });

  it('stays hidden when the plugin has no help', () => {
    websiteInit(new WithoutHelp());

    expect(getEl('menu-help-without-menu-help-btn')!.hidden).toBe(true);
  });
});
