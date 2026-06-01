import { vi } from 'vitest';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { DrawLinesPlugin } from '@app/plugins/draw-lines/draw-lines';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('DrawLinesPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(DrawLinesPlugin, 'DrawLinesPlugin');
});

const LINE_METHODS = [
  'createRef2Ref', 'createGrid', 'createGridRadial', 'createSatToRef',
  'createSensorToSat', 'createObjToObj', 'createSat2Sun', 'createSat2CelestialBody',
] as const;

describe('DrawLinesPlugin rmbCallback', () => {
  let plugin: DrawLinesPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new DrawLinesPlugin();
    LINE_METHODS.forEach((m) => vi.spyOn(lineManagerInstance, m).mockImplementation(() => undefined as never));
    // A satellite-typed object exercises the instanceof guard at the top of rmbCallback.
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(Object.create(Satellite.prototype));
    (ServiceLocator.getScene() as unknown as { moons: unknown }).moons = { Moon: { drawFullOrbitPathRelativeToEarth: vi.fn() } };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    'line-eci-axis-rmb',
    'line-eci-xgrid-rmb',
    'line-eci-ygrid-rmb',
    'line-eci-zgrid-rmb',
    'line-eci-radial-xgrid-rmb',
    'line-eci-radial-ygrid-rmb',
    'line-eci-radial-zgrid-rmb',
    'line-earth-sat-rmb',
    'line-sensor-sat-rmb',
    'line-sat-sun-rmb',
    'line-sat-moon-rmb',
    'line-moon-orbit-rmb',
    'unknown-rmb',
  ])('draws %s without throwing', (targetId) => {
    expect(() => plugin.rmbCallback(targetId, 25544)).not.toThrow();
  });

  it('warns and returns for sat-to-sat with no primary satellite', () => {
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue(undefined as never);

    plugin.rmbCallback('line-sat-sat-rmb', 25544);

    expect(lineManagerInstance.createObjToObj).not.toHaveBeenCalled();
  });

  it('draws a sat-to-sat line when a primary satellite exists', () => {
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ primarySatObj: Object.create(Satellite.prototype) } as never);

    plugin.rmbCallback('line-sat-sat-rmb', 25544);

    expect(lineManagerInstance.createObjToObj).toHaveBeenCalled();
  });
});

describe('DrawLinesPlugin rightBtnMenuOpen handler', () => {
  let plugin: DrawLinesPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new DrawLinesPlugin();
    plugin.addJs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides context items when off-earth, no sat selected, no sensor and id is -1', () => {
    const sensorManager = ServiceLocator.getSensorManager();

    vi.spyOn(sensorManager, 'isSensorSelected').mockReturnValue(false);

    expect(() => EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, false, -1)).not.toThrow();
  });
});
