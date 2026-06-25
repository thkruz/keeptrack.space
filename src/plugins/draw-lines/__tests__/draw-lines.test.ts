import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { DrawLinesPlugin } from '@app/plugins/draw-lines/draw-lines';
import { settingsManager } from '@app/settings/settings';
import { Satellite } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

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
  'createRef2Ref', 'createGrid', 'createGridRadial', 'createSatToRef', 'createSatRicFrame',
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
    'line-sat-ric-rmb',
    'line-sat-sun-rmb',
    'line-sat-moon-rmb',
    'line-moon-orbit-rmb',
    'unknown-rmb',
  ])('draws %s without throwing', (targetId) => {
    expect(() => plugin.rmbCallback(targetId, 25544)).not.toThrow();
  });

  it('routes the RIC axes item to createSatRicFrame', () => {
    plugin.rmbCallback('line-sat-ric-rmb', 25544);

    expect(lineManagerInstance.createSatRicFrame).toHaveBeenCalled();
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

describe('DrawLinesPlugin rightBtnMenuOpen visibility', () => {
  let plugin: DrawLinesPlugin;

  /** Create the RMB <li> elements the handler may hide, so display changes are observable. */
  const seedRmbElements = (...ids: string[]): Record<string, HTMLElement> => {
    const els: Record<string, HTMLElement> = {};

    for (const id of ids) {
      const el = document.createElement('li');

      el.id = id;
      document.body.appendChild(el);
      els[id] = el;
    }

    return els;
  };

  beforeEach(() => {
    setupStandardEnvironment();
    document.body.innerHTML = '';
    settingsManager.isMobileModeEnabled = false;
    plugin = new DrawLinesPlugin();
    plugin.addJs();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('hides sat-to-sat when no primary satellite is selected (numeric -1 guard)', () => {
    const els = seedRmbElements('line-sat-sat-rmb', 'line-moon-orbit-rmb');

    // selectedSat is the number -1; the old string comparison ('-1') never matched.
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectedSat: -1 } as never);

    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, true, 25544);

    expect(els['line-sat-sat-rmb'].style.display).toBe('none');
    // Frame-independent geometry stays visible.
    expect(els['line-moon-orbit-rmb'].style.display).not.toBe('none');
  });

  it('hides every per-satellite line (including sat-to-moon) when there is no clicked sat', () => {
    const els = seedRmbElements(
      'line-earth-sat-rmb', 'line-sensor-sat-rmb', 'line-sat-sun-rmb',
      'line-sat-moon-rmb', 'line-sat-ric-rmb', 'line-moon-orbit-rmb',
    );

    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, true, -1);

    for (const id of ['line-earth-sat-rmb', 'line-sensor-sat-rmb', 'line-sat-sun-rmb', 'line-sat-moon-rmb', 'line-sat-ric-rmb']) {
      expect(els[id].style.display).toBe('none');
    }
    expect(els['line-moon-orbit-rmb'].style.display).not.toBe('none');
  });

  it('hides the ECI axes when the click is off-earth', () => {
    const els = seedRmbElements('line-eci-axis-rmb');

    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, false, 25544);

    expect(els['line-eci-axis-rmb'].style.display).toBe('none');
  });

  it('does not throw when elements are absent', () => {
    expect(() => EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, false, -1)).not.toThrow();
  });
});
