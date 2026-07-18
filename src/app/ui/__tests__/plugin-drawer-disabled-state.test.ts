import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { collectDrawerItems } from '@app/app/ui/plugin-drawer-helpers';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { MenuMode } from '@app/engine/core/interfaces';

/**
 * Regression guard for the Sensor FOV / Sensor Fence utility icons staying
 * permanently disabled after a sensor is selected.
 *
 * The drawer footer must render each icon's initial disabled state from the LIVE
 * `isIconDisabled`, not the static `isIconDisabledOnLoad`. A sensor selection
 * restored from persistence or account sync can flip `isIconDisabled` to false
 * before the footer renders; rendering from `isIconDisabledOnLoad` (always true
 * for these plugins) desyncs the DOM from the guarded `setBottomIconToEnabled()`,
 * leaving the icon grayed and `pointer-events: none`.
 */
describe('collectDrawerItems disabled state', () => {
  const makeUtilityPlugin = (over: Record<string, unknown> = {}) => ({
    id: 'SensorFov',
    bottomIconElementName: 'sensor-fov-bottom-icon',
    bottomIconLabel: 'Sensor FOV',
    bottomIconImg: 'fov.png',
    bottomIconOrder: 100,
    isBottomIconHidden: false,
    iconPlacement: IconPlacement.UTILITY_ONLY,
    utilityGroup: UtilityGroup.LAYER_TOGGLE,
    menuMode: [MenuMode.SENSORS, MenuMode.ALL],
    isLoginRequired: false,
    isIconDisabledOnLoad: true,
    isIconDisabled: true,
    ...over,
  });

  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
  });

  it('renders a utility icon as disabled when the plugin is currently disabled', () => {
    PluginRegistry.addPlugin(makeUtilityPlugin() as never);

    const item = collectDrawerItems().utilityGroups['utility-layers'].items
      .find((i) => i.pluginId === 'SensorFov');

    expect(item).toBeDefined();
    expect(item?.isDisabled).toBe(true);
  });

  it('renders a utility icon as enabled when a sensor is already selected (isIconDisabled=false) even though isIconDisabledOnLoad stays true', () => {
    PluginRegistry.addPlugin(makeUtilityPlugin({ isIconDisabled: false }) as never);

    const item = collectDrawerItems().utilityGroups['utility-layers'].items
      .find((i) => i.pluginId === 'SensorFov');

    expect(item).toBeDefined();
    // Would be `true` (stuck disabled) if the footer rendered from isIconDisabledOnLoad.
    expect(item?.isDisabled).toBe(false);
  });
});
