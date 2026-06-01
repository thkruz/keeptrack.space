import { vi } from 'vitest';
import { LaunchSite } from '@app/app/data/catalog-manager/LaunchFacility';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import * as colorbox from '@app/engine/utils/colorbox';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { ViewInfoRmbPlugin } from '@app/plugins/view-info-rmb/view-info-rmb';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { Satellite } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('ViewInfoRmbPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ViewInfoRmbPlugin, 'ViewInfoRmbPlugin');
});

describe('ViewInfoRmbPlugin rmbCallback', () => {
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

    plugin.rmbCallback('view-info-rmb');

    expect(toast).toHaveBeenCalled();
  });

  it('falls back to eci2lla when the mouse lat/lon is undefined', () => {
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;
    ServiceLocator.getInputManager().mouse = { latLon: undefined, dragPosition: [4000, 0, 5000] } as never;

    expect(() => plugin.rmbCallback('view-info-rmb')).not.toThrow();
    expect(toast).toHaveBeenCalled();
  });

  it('selects the satellite for view-sat-info-rmb', () => {
    expect(() => plugin.rmbCallback('view-sat-info-rmb', 25544)).not.toThrow();
  });

  it('delegates view-sensor-info-rmb to viewSensorInfoRmb', () => {
    const spy = vi.spyOn(plugin, 'viewSensorInfoRmb').mockImplementation(() => undefined);

    plugin.rmbCallback('view-sensor-info-rmb', 5);

    expect(spy).toHaveBeenCalledWith(5);
  });

  it('warns when a launch site is not found', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(undefined as never);

    expect(() => plugin.rmbCallback('view-launchsite-info-rmb', 10)).not.toThrow();
  });

  it('opens the wiki colorbox for a launch site', () => {
    const openSpy = vi.spyOn(colorbox, 'openColorbox').mockImplementation(() => undefined);

    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ wikiUrl: 'https://example.com' } as never);

    plugin.rmbCallback('view-launchsite-info-rmb', 10);

    expect(openSpy).toHaveBeenCalledWith('https://example.com');
  });

  it('searches related satellites by international designator', () => {
    const doSearch = vi.fn();

    ServiceLocator.getUiManager().doSearch = doSearch;
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue({ intlDes: '2000-001A' } as never);

    plugin.rmbCallback('view-related-sats-rmb', 5);

    expect(doSearch).toHaveBeenCalledWith('2000-001');
  });

  it('toasts when there are no related satellites', () => {
    const toast = vi.fn();
    const doSearch = vi.fn();

    ServiceLocator.getUiManager().toast = toast;
    ServiceLocator.getUiManager().doSearch = doSearch;
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue(undefined as never);

    plugin.rmbCallback('view-related-sats-rmb', 5);

    expect(toast).toHaveBeenCalled();
    expect(doSearch).toHaveBeenCalledWith('');
  });

  it('does nothing for an unknown target', () => {
    expect(() => plugin.rmbCallback('something-else')).not.toThrow();
  });
});

describe('ViewInfoRmbPlugin rightBtnMenuOpen handler', () => {
  let plugin: ViewInfoRmbPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new ViewInfoRmbPlugin();
    plugin.addJs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const emit = (clickedSatId?: number) => EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, true, clickedSatId);

  it('returns early when no satellite id is supplied', () => {
    expect(() => emit(undefined)).not.toThrow();
  });

  it('shows satellite menu items for a Satellite', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(Object.create(Satellite.prototype));

    expect(() => emit(1)).not.toThrow();
  });

  it('shows the sensor menu item for a DetailedSensor', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(Object.create(DetailedSensor.prototype));

    expect(() => emit(2)).not.toThrow();
  });

  it('shows the launch-site menu item for a LaunchSite', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(Object.create(LaunchSite.prototype));

    expect(() => emit(3)).not.toThrow();
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
