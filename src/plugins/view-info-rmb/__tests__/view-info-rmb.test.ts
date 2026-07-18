import { LaunchSite } from '@app/app/data/catalog-manager/LaunchFacility';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import * as colorbox from '@app/engine/utils/colorbox';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { ViewInfoRmbPlugin } from '@app/plugins/view-info-rmb/view-info-rmb';
import { Satellite } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('ViewInfoRmbPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ViewInfoRmbPlugin, 'ViewInfoRmbPlugin');
});

describe('ViewInfoRmbPlugin onContextMenuAction', () => {
  let plugin: ViewInfoRmbPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new ViewInfoRmbPlugin();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows lat/lon from a defined mouse position', () => {
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;
    ServiceLocator.getInputManager().mouse = { latLon: { lat: 10, lon: 20 }, dragPosition: [1, 2, 3] } as never;

    plugin.onContextMenuAction('view-info-rmb');

    expect(toast).toHaveBeenCalled();
  });

  it('falls back to eci2lla when the mouse lat/lon is undefined', () => {
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;
    ServiceLocator.getInputManager().mouse = { latLon: undefined, dragPosition: [4000, 0, 5000] } as never;

    expect(() => plugin.onContextMenuAction('view-info-rmb')).not.toThrow();
    expect(toast).toHaveBeenCalled();
  });

  it('delegates view-sensor-info-rmb to viewSensorInfoRmb', () => {
    const spy = vi.spyOn(plugin, 'viewSensorInfoRmb').mockImplementation(() => undefined);

    plugin.onContextMenuAction('view-sensor-info-rmb', 5);

    expect(spy).toHaveBeenCalledWith(5);
  });

  it('warns when a launch site is not found', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(undefined as never);

    expect(() => plugin.onContextMenuAction('view-launchsite-info-rmb', 10)).not.toThrow();
  });

  it('opens the wiki colorbox for a launch site', () => {
    const openSpy = vi.spyOn(colorbox, 'openColorbox').mockImplementation(() => undefined);

    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ wikiUrl: 'https://example.com' } as never);

    plugin.onContextMenuAction('view-launchsite-info-rmb', 10);

    expect(openSpy).toHaveBeenCalledWith('https://example.com');
  });

  it('searches related satellites by international designator', () => {
    const doSearch = vi.fn();

    ServiceLocator.getUiManager().doSearch = doSearch;
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue({ intlDes: '2000-001A' } as never);

    plugin.onContextMenuAction('view-related-sats-rmb', 5);

    expect(doSearch).toHaveBeenCalledWith('2000-001');
  });

  it('toasts when there are no related satellites', () => {
    const toast = vi.fn();
    const doSearch = vi.fn();

    ServiceLocator.getUiManager().toast = toast;
    ServiceLocator.getUiManager().doSearch = doSearch;
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue(undefined as never);

    plugin.onContextMenuAction('view-related-sats-rmb', 5);

    expect(toast).toHaveBeenCalled();
    expect(doSearch).toHaveBeenCalledWith('');
  });

  it('does nothing for an unknown target', () => {
    expect(() => plugin.onContextMenuAction('something-else')).not.toThrow();
  });
});

describe('ViewInfoRmbPlugin onContextMenuOpen', () => {
  let plugin: ViewInfoRmbPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new ViewInfoRmbPlugin();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const open = (target: unknown, surface: 'earth' | 'space' = 'earth') =>
    plugin.onContextMenuOpen({
      surface,
      targetId: target ? 1 : -1,
      target: target as never,
      hasPrimarySelection: false,
    });

  it('handles a click with no target', () => {
    expect(() => open(null)).not.toThrow();
  });

  it('shows satellite menu items for a Satellite', () => {
    expect(() => open(Object.create(Satellite.prototype))).not.toThrow();
  });

  it('shows the sensor menu item for a DetailedSensor', () => {
    expect(() => open(Object.create(DetailedSensor.prototype))).not.toThrow();
  });

  it('shows the launch-site menu item for a LaunchSite', () => {
    expect(() => open(Object.create(LaunchSite.prototype))).not.toThrow();
  });

  it('is hidden entirely for a space click with no recognizable target', () => {
    const config = plugin.getContextMenuConfig();

    expect(config.isVisible!({ surface: 'space', targetId: -1, target: null, hasPrimarySelection: false })).toBe(false);
    expect(config.isVisible!({ surface: 'earth', targetId: -1, target: null, hasPrimarySelection: false })).toBe(true);
  });
});

describe('ViewInfoRmbPlugin viewSensorInfoRmb', () => {
  let plugin: ViewInfoRmbPlugin;
  const fakeSensorPlugin = {
    isMenuButtonActive: false,
    setBottomIconToSelected: vi.fn(),
    openSideMenu: vi.fn(),
    getSensorInfo: vi.fn(),
  };

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new ViewInfoRmbPlugin();
    fakeSensorPlugin.isMenuButtonActive = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when no sensor-info plugin or a negative satellite is given', () => {
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue(undefined as never);

    expect(() => plugin.viewSensorInfoRmb(-1)).not.toThrow();
  });

  it('warns when there is no current sensor', () => {
    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation((cls) => (cls === SensorInfoPlugin ? (fakeSensorPlugin as never) : (undefined as never)));
    ServiceLocator.getSensorManager().currentSensors = [];

    expect(() => plugin.viewSensorInfoRmb(5)).not.toThrow();
    expect(fakeSensorPlugin.getSensorInfo).not.toHaveBeenCalled();
  });

  it('opens the sensor side menu and shows sensor info', () => {
    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation((cls) => (cls === SensorInfoPlugin ? (fakeSensorPlugin as never) : (undefined as never)));
    ServiceLocator.getSensorManager().currentSensors = [{ name: 'S1' }] as never;

    plugin.viewSensorInfoRmb(5);

    expect(fakeSensorPlugin.setBottomIconToSelected).toHaveBeenCalled();
    expect(fakeSensorPlugin.openSideMenu).toHaveBeenCalled();
    expect(fakeSensorPlugin.getSensorInfo).toHaveBeenCalled();
  });
});
