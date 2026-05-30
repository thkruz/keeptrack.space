import { Container } from '@app/engine/core/container';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { SensorManager } from '@app/app/sensors/sensorManager';
import { Singletons } from '@app/engine/core/interfaces';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SensorFov', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorListPlugin]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SensorFov, 'SensorFov');
});

describe('SensorFov_class', () => {
  let SensorFovPlugin: SensorFov;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorListPlugin]);
    SensorFovPlugin = new SensorFov();
  });

  standardPluginSuite(SensorFov, 'SensorFov');
  standardPluginMenuButtonTests(SensorFov, 'SensorFov');

  // Test bottom menu click responses
  it('test_bottom_menu_click', () => {
    websiteInit(SensorFovPlugin);

    expect(() => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, SensorFovPlugin.bottomIconElementName)).not.toThrow();

    const sensorManagerInstance = new SensorManager();

    sensorManagerInstance.isSensorSelected = vi.fn().mockReturnValue(true);
    Container.getInstance().registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    expect(() => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, SensorFovPlugin.bottomIconElementName)).not.toThrow();
  });

  // Test changing sensor
  it('test_change_sensor', () => {
    websiteInit(SensorFovPlugin);

    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, 'sensor', 1)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, null, null)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, defaultSensor, 0)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, null, null)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, defaultSensor, 2)).not.toThrow();
  });
});

describe('SensorFov methods', () => {
  let plugin: SensorFov;
  let fovHandler: (sensor?: unknown) => void;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorListPlugin]);
    const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

    plugin = new SensorFov();
    plugin.init();
    // sensor-fov registers its sensorDotSelected handler last (after dependency inits)
    const handlers = onSpy.mock.calls
      .filter((c) => c[0] === EventBusEvent.sensorDotSelected)
      .map((c) => c[1] as (sensor?: unknown) => void);

    fovHandler = handlers[handlers.length - 1];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the bottom-icon config', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('sensor-fov-bottom-icon');
  });

  it('sensorDotSelected handler enables with a sensor and disables without', () => {
    const enable = vi.spyOn(plugin, 'setBottomIconToEnabled').mockImplementation(() => undefined);
    const disable = vi.spyOn(plugin, 'setBottomIconToDisabled').mockImplementation(() => undefined);
    const unselect = vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);

    fovHandler(defaultSensor);
    expect(enable).toHaveBeenCalled();

    fovHandler(undefined);
    expect(disable).toHaveBeenCalled();
    expect(unselect).toHaveBeenCalled();
  });

  it('disableFovView emits changeSensorMarkers and unselects', () => {
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit').mockImplementation(() => undefined as never);
    const unselect = vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);

    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();

    expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.changeSensorMarkers, plugin.id);
    expect(unselect).toHaveBeenCalled();
  });

  it('onBottomIconClick enables the FOV view when active', () => {
    const select = vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => undefined);

    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
    expect(select).toHaveBeenCalled();
  });

  it('bridges bottomIconCallback to onBottomIconClick', () => {
    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(spy).toHaveBeenCalled();
  });
});
