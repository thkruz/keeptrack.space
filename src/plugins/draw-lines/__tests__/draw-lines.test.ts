import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { DrawLinesPlugin } from '@app/plugins/draw-lines/draw-lines';
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
  'createRef2Ref',
  'createGrid',
  'createGridRadial',
  'createSatToRef',
  'createSatRicFrame',
  'createSensorToSat',
  'createObjToObj',
  'createSat2Sun',
  'createSat2CelestialBody',
] as const;

describe('DrawLinesPlugin onContextMenuAction', () => {
  let plugin: DrawLinesPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new DrawLinesPlugin();
    LINE_METHODS.forEach((m) => {
      vi.spyOn(lineManagerInstance, m).mockImplementation(() => undefined as never);
    });
    // A satellite-typed object exercises the instanceof guard when building the action context.
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
    expect(() => plugin.onContextMenuAction(targetId, 25544)).not.toThrow();
  });

  it('routes the RIC axes item to createSatRicFrame', () => {
    plugin.onContextMenuAction('line-sat-ric-rmb', 25544);

    expect(lineManagerInstance.createSatRicFrame).toHaveBeenCalled();
  });

  it('warns and returns for sat-to-sat with no primary satellite', () => {
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue(undefined as never);

    plugin.onContextMenuAction('line-sat-sat-rmb', 25544);

    expect(lineManagerInstance.createObjToObj).not.toHaveBeenCalled();
  });

  it('draws a sat-to-sat line when a primary satellite exists', () => {
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ primarySatObj: Object.create(Satellite.prototype) } as never);

    plugin.onContextMenuAction('line-sat-sat-rmb', 25544);

    expect(lineManagerInstance.createObjToObj).toHaveBeenCalled();
  });
});

describe('DrawLinesPlugin onContextMenuOpen visibility', () => {
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

  const openCtx = (surface: 'earth' | 'space', target: unknown, hasPrimarySelection = false) =>
    plugin.onContextMenuOpen({
      surface,
      targetId: target ? 25544 : -1,
      target: target as never,
      hasPrimarySelection,
    });

  beforeEach(() => {
    setupStandardEnvironment();
    document.body.innerHTML = '';
    plugin = new DrawLinesPlugin();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('hides sat-to-sat when no primary satellite is selected', () => {
    const els = seedRmbElements('line-sat-sat-rmb', 'line-moon-orbit-rmb');

    openCtx('earth', Object.create(Satellite.prototype), false);

    expect(els['line-sat-sat-rmb'].style.display).toBe('none');
    // Frame-independent geometry stays visible.
    expect(els['line-moon-orbit-rmb'].style.display).not.toBe('none');
  });

  it('hides every per-satellite line (including sat-to-moon) when there is no clicked sat', () => {
    const els = seedRmbElements('line-earth-sat-rmb', 'line-sensor-sat-rmb', 'line-sat-sun-rmb', 'line-sat-moon-rmb', 'line-sat-ric-rmb', 'line-moon-orbit-rmb');

    openCtx('earth', null);

    for (const id of ['line-earth-sat-rmb', 'line-sensor-sat-rmb', 'line-sat-sun-rmb', 'line-sat-moon-rmb', 'line-sat-ric-rmb']) {
      expect(els[id].style.display).toBe('none');
    }
    expect(els['line-moon-orbit-rmb'].style.display).not.toBe('none');
  });

  it('hides the ECI axes when the click is off-earth', () => {
    const els = seedRmbElements('line-eci-axis-rmb');

    openCtx('space', Object.create(Satellite.prototype));

    expect(els['line-eci-axis-rmb'].style.display).toBe('none');
  });

  it('re-shows a previously hidden item when its requirements are met again', () => {
    const els = seedRmbElements('line-earth-sat-rmb');

    openCtx('earth', null);
    expect(els['line-earth-sat-rmb'].style.display).toBe('none');

    openCtx('earth', Object.create(Satellite.prototype));
    expect(els['line-earth-sat-rmb'].style.display).not.toBe('none');
  });

  it('does not throw when elements are absent', () => {
    expect(() => openCtx('space', null)).not.toThrow();
  });
});

describe('DrawLinesPlugin side-menu Sensor to Satellite', () => {
  let plugin: DrawLinesPlugin;
  type SideMenuInternals = { runMenuAction_: (action: never) => void };
  const sensorAction = () => (DrawLinesPlugin as unknown as { DRAW_ACTIONS: { id: string }[] }).DRAW_ACTIONS.find((a) => a.id === 'line-sensor-sat');

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new DrawLinesPlugin();
    vi.spyOn(lineManagerInstance, 'createSensorToSat').mockImplementation(() => undefined as never);
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectedSat: 0, primarySatObj: Object.create(Satellite.prototype) } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toasts "Select a sensor first." and draws nothing when no sensor is selected', () => {
    vi.spyOn(ServiceLocator.getSensorManager(), 'getSensor').mockReturnValue(null);
    const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    (plugin as unknown as SideMenuInternals).runMenuAction_(sensorAction() as never);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Select a sensor first.'));
    expect(lineManagerInstance.createSensorToSat).not.toHaveBeenCalled();
  });

  it('draws the line without a warning when a sensor is selected', () => {
    vi.spyOn(ServiceLocator.getSensorManager(), 'getSensor').mockReturnValue({ objName: 'Test' } as never);
    const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    (plugin as unknown as SideMenuInternals).runMenuAction_(sensorAction() as never);

    expect(warn).not.toHaveBeenCalled();
    expect(lineManagerInstance.createSensorToSat).toHaveBeenCalled();
  });
});
