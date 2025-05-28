import { Constructor, KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { KeepTrackPlugin } from '@app/plugins/KeepTrackPlugin';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsManager } from '@app/settings/settings';
import { BottomMenu } from '@app/static/bottom-menu';
import { defaultSat, defaultSensor } from './environment/apiMocks';

export const standardPluginSuite = (Plugin: Constructor<KeepTrackPlugin>, pluginName?: string) => {
  pluginName ??= Plugin.name;

  // Tests that init method can be called without errors
  test(`${pluginName}_init`, () => {
    BottomMenu.createBottomMenu();
    standardPluginInit(Plugin);
  });

  test(`${pluginName}_process_init_twice`, () => {
    const plugin = new Plugin();

    expect(plugin.init).toBeDefined();
    expect(() => plugin.init()).not.toThrow();
    expect(() => plugin.init()).toThrow();
  });

  // Tests that html can be added to the DOM
  test(`${pluginName}_add_html`, () => {
    const plugin = new Plugin();

    expect(() => plugin.addHtml()).not.toThrow();
  });

  // Tests that addHtml throws an error if html is already added
  test(`${pluginName}_add_html_twice`, () => {
    const plugin = new Plugin();

    plugin.addHtml();
    expect(() => plugin.addHtml()).toThrow();
  });

  // Tests that js can be added to the DOM
  test(`${pluginName}_add_js`, () => {
    const plugin = new Plugin();

    expect(() => plugin.addJs()).not.toThrow();
  });

  // Tests that addJs throws an error if js is already added
  test(`${pluginName}_add_js_twice`, () => {
    const plugin = new Plugin();

    plugin.addJs();
    expect(() => plugin.addJs()).toThrow();
  });
};

/**
 * Initializes a standard plugin and tests its initialization.
 * @param pluginName - The name of the plugin being tested.
 * @param Plugin - The constructor function of the plugin being tested.
 */
export const standardPluginInit = (Plugin: Constructor<KeepTrackPlugin>) => {
  const plugin = new Plugin();

  expect(plugin.init).toBeDefined();
  expect(() => plugin.init()).not.toThrow();
  expect(() => keepTrackApi.emit(KeepTrackApiEvents.uiManagerInit)).not.toThrow();
  expect(() => keepTrackApi.emit(KeepTrackApiEvents.uiManagerFinal)).not.toThrow();

  if (plugin.bottomIconElementName) {
    expect(getEl(plugin.bottomIconElementName)).toBeDefined();
    expect(getEl(KeepTrackPlugin.bottomIconsContainerId)!.innerHTML).toContain(plugin.bottomIconElementName);
  }
};

export const websiteInit = (plugin: KeepTrackPlugin) => {
  const settingsManager = new SettingsManager();

  settingsManager.init();
  keepTrackApi.getColorSchemeManager().init();
  window.settingsManager = settingsManager;
  (global as unknown as Global).settingsManager = settingsManager;
  BottomMenu.createBottomMenu();
  // clearAllCallbacks();
  plugin.init();
  keepTrackApi.emit(KeepTrackApiEvents.uiManagerInit);
  keepTrackApi.emit(KeepTrackApiEvents.uiManagerFinal);
  keepTrackApi.emit(KeepTrackApiEvents.uiManagerOnReady);
  keepTrackApi.getCatalogManager().satCruncher = {
    addEventListener: jest.fn(),
    postMessage: jest.fn(),
  } as unknown as Worker;
};

export const standardPluginMenuButtonTests = (Plugin: Constructor<KeepTrackPlugin>, pluginName?: string) => {
  pluginName ??= Plugin.name;

  test(`${pluginName}_turned_off_by_default`, () => {
    const plugin = new Plugin();

    plugin.init();
    expect(plugin.isMenuButtonActive).toBe(false);
  });

  // Tests that other bottom icons being clicked are ignored
  test(`${pluginName}_other_bottom_icon_clicked`, () => {
    const plugin = new Plugin();

    websiteInit(plugin);

    const toggleButton = getEl(plugin.bottomIconElementName);

    expect(toggleButton).toBeDefined();
    expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, 'random-icon');
  });

  // Tests that clicking on the bottom icon toggles
  test(`${pluginName}_toggle`, () => {
    const plugin = new Plugin();

    websiteInit(plugin);

    const toggleButton = getEl(plugin.bottomIconElementName);

    expect(toggleButton).toBeDefined();
    expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);

    if (plugin.isIconDisabled || plugin.isRequireSatelliteSelected || plugin.isRequireSensorSelected) {
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    } else {
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeTruthy();
      keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    }
  });

  // Tests that clicking on the bottom icon toggles with sensor
  test(`${pluginName}_toggle_w_sensor`, () => {
    const plugin = new Plugin();

    websiteInit(plugin);
    keepTrackApi.getSensorManager().setSensor(defaultSensor, 0);

    const toggleButton = getEl(plugin.bottomIconElementName);

    expect(toggleButton).toBeDefined();

    if (plugin.isIconDisabled || plugin.isRequireSatelliteSelected) {
      if (plugin.id !== 'Screenshot') {
        expect(toggleButton!.classList.contains(KeepTrackPlugin.iconDisabledClassString)).toBeTruthy();
      }
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
      keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    } else {
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconDisabledClassString)).toBeFalsy();
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
      keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeTruthy();
      keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    }

    keepTrackApi.getSensorManager().setSensor(null);
  });

  // Tests that clicking on the bottom icon toggles with satellite
  test(`${pluginName}_toggle_w_satellite`, () => {
    const plugin = new Plugin();

    websiteInit(plugin);
    keepTrackApi.getCatalogManager().objectCache = [defaultSat];
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);

    const toggleButton = getEl(plugin.bottomIconElementName);

    expect(toggleButton).toBeDefined();
    expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);

    if (plugin.isIconDisabled || plugin.isRequireSensorSelected) {
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    } else {
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeTruthy();
      keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    }

    keepTrackApi.getCatalogManager().objectCache = [];
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1);
  });

  // Tests that clicking on the bottom icon toggles with satellite and sensor
  test(`${pluginName}_toggle_w_sat_and_sensor`, () => {
    const plugin = new Plugin();

    websiteInit(plugin);
    keepTrackApi.getSensorManager().setSensor(defaultSensor, 0);
    keepTrackApi.getCatalogManager().objectCache = [defaultSat];
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);

    const toggleButton = getEl(plugin.bottomIconElementName);

    expect(toggleButton).toBeDefined();
    expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);

    if (plugin.isIconDisabled) {
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    } else {
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeTruthy();
      keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, plugin.bottomIconElementName);
      expect(toggleButton!.classList.contains(KeepTrackPlugin.iconSelectedClassString)).toBeFalsy();
    }
  });

  // Tests that bottom icon is added to the UI on initialization
  test(`${pluginName}_bottom_icon_added`, () => {
    const plugin = new Plugin();

    websiteInit(plugin);

    if (plugin.bottomIconElementName !== null) {
      const bottomIcons = getEl(KeepTrackPlugin.bottomIconsContainerId);

      expect(bottomIcons).toBeDefined();
      expect(bottomIcons!.innerHTML).toContain(plugin.bottomIconElementName);
    } else {
      expect(plugin.bottomIconLabel).toBeNull();
    }
  });
};

export const standardPluginRmbTests = (Plugin: Constructor<KeepTrackPlugin>, pluginName?: string) => {
  pluginName ??= Plugin.name;

  // Tests that other bottom icons being clicked are ignored
  describe(`${pluginName}_rmb_clicked`, () => {
    const plugin = new Plugin();

    websiteInit(plugin);

    // Create a list from li ids in rmbL2Html
    const rmbOptions = plugin.rmbL2Html
      .split('<li id="')
      .slice(1)
      .map((s) => s.split('"')[0]);

    rmbOptions.forEach((rmbOption) => {
      test(`${pluginName}_rmb_clicked_${rmbOption}`, () => {
        const plugin = new Plugin();

        websiteInit(plugin);
        expect(() => keepTrackApi.emit(KeepTrackApiEvents.rmbMenuActions, rmbOption, -1)).not.toThrow();
        jest.advanceTimersByTime(1000);
        expect(() => keepTrackApi.emit(KeepTrackApiEvents.rmbMenuActions, rmbOption, -1)).not.toThrow();
        jest.advanceTimersByTime(1000);
      });
    });
  });
};

export const standardClickTests = (Plugin: Constructor<KeepTrackPlugin>) => {
  const pluginTemp = new Plugin();

  const buttonElements = pluginTemp.sideMenuElementHtml
    .split('<button id="')
    .slice(1)
    .map((s) => s.split('"')[0]);

  buttonElements.forEach((buttonElement) => {
    test(`${Plugin.name}_button_${buttonElement}`, () => {
      const plugin = new Plugin();

      websiteInit(plugin);
      expect(getEl(buttonElement)).toBeDefined();
      expect(() => getEl(buttonElement)!.click()).not.toThrow();
      jest.advanceTimersByTime(1000);
    });
  });
};

export const standardChangeTests = (Plugin: Constructor<KeepTrackPlugin>) => {
  const pluginTemp = new Plugin();

  const inputElements = pluginTemp.sideMenuElementHtml
    .split('<input id="')
    .slice(1)
    .map((s) => s.split('"')[0]);

  inputElements.forEach((inputElement) => {
    test(`${Plugin.name}_input_${inputElement}`, () => {
      const plugin = new Plugin();

      websiteInit(plugin);
      const elementDom = getEl(inputElement);

      (<HTMLInputElement>elementDom).value = '1';
      // Fire a change event
      expect(elementDom).toBeDefined();
      expect(() => elementDom!.dispatchEvent(new Event('change'))).not.toThrow();
      jest.advanceTimersByTime(1000);
    });
  });
};
