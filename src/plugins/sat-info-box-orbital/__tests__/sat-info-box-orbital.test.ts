import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import * as isThisNodeModule from '@app/engine/utils/isThisNode';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxOrbital } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital';
import { EL } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite, TemeVec3, TleLine1, TleLine2 } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/**
 * Regression test for issue #1195:
 * `Cannot set properties of null (setting 'innerHTML')` thrown from
 * `SatInfoBoxOrbital.updateOrbitData_` when a satellite is preselected
 * (e.g. via `?sat=` URL param) before the SatInfoBox DOM has been built.
 */
describe('SatInfoBoxOrbital - update before DOM ready', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    // Ensure time manager has a real simulationTimeObj for gmst lookup
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(2023, 1, 1);
    // Simulate browser behavior: getEl() returns null for missing elements
    // instead of throwing (the test-env throw is a debug aid that hides the
    // real production race condition we want to validate).
    vi.spyOn(isThisNodeModule, 'isThisNode').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw when updateSelectBox fires before the orbital DOM is created', () => {
    const plugin = new SatInfoBoxOrbital();

    plugin.init();

    // Sanity: the orbital DOM should not have been built yet because we
    // intentionally skipped the satInfoBoxInit / uiManagerFinal events.
    expect(getEl(EL.APOGEE, true)).toBeNull();

    expect(() => {
      EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat);
    }).not.toThrow();

    // The non-Satellite branch (missiles, etc.) also reaches DOM-touching code.
    const fakeMissile = {
      isSatellite: () => false,
      totalVelocity: 7.5,
    };

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      EventBus.getInstance().emit(EventBusEvent.updateSelectBox, fakeMissile as any);
    }).not.toThrow();
  });
});

describe('SatInfoBoxOrbital data population', () => {
  let plugin: SatInfoBoxOrbital;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(2023, 1, 1);
    plugin = new SatInfoBoxOrbital();
    websiteInit(plugin);
    // The orbital section holds every element updateOrbitData_ touches.
    document.body.insertAdjacentHTML('beforeend', p().createOrbitalSection());
    vi.stubGlobal('requestIdleCallback', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('createOrbitalSection / createOrbitalDataRows build markup with the apogee row', () => {
    expect(p().createOrbitalSection()).toContain(EL.APOGEE);
    expect(p().createOrbitalDataRows()).toContain('Apogee');
  });

  it('updateOrbitData_ populates the apogee/perigee/period rows for a satellite', () => {
    p().updateOrbitData_(defaultSat);

    expect(getEl(EL.APOGEE)!.textContent).toBeTruthy();
  });

  it('updateOrbitData_ ignores a null object', () => {
    expect(() => p().updateOrbitData_(null)).not.toThrow();
  });

  it('updateOrbitData_ handles a non-satellite (missile) object', () => {
    const missile = { isSatellite: () => false, isMissile: () => true, totalVelocity: 7.5 };

    expect(() => p().updateOrbitData_(missile)).not.toThrow();
  });

  it('updateSectionHeader_ updates the section title without throwing', () => {
    expect(() => p().updateSectionHeader_()).not.toThrow();
  });

  it('a secondary-sat selection drives the relative-distance rows', () => {
    PluginRegistry.getPlugin(SelectSatManager)!.secondarySat = 0;
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(defaultSat);

    expect(() => p().updateOrbitData_(defaultSat)).not.toThrow();
  });
});

/**
 * Trust moment 1 (scenario 1): after a time jump the Linear range showed 221.72 km on first paint and 7.59 km
 * two seconds later, because it read cruncher-buffer positions while R/I/C came from main-thread SGP4.
 */
describe('SatInfoBoxOrbital secondary range after a time change', () => {
  let plugin: SatInfoBoxOrbital;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const primary = new Satellite({
    ...defaultSat,
    id: 0,
    tle1: '1 25544U 98067A   23031.50000000  .00016717  00000-0  10270-3 0  9994' as TleLine1,
    tle2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50000000 00008' as TleLine2,
  });
  const secondary = new Satellite({
    ...defaultSat,
    id: 1,
    tle1: '1 25545U 98067B   23031.50000000  .00016717  00000-0  10270-3 0  9995' as TleLine1,
    tle2: '2 25545  51.6416 247.5627 0006703 130.5360 325.5288 15.50000000 00009' as TleLine2,
  });

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxOrbital();
    websiteInit(plugin);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<span id="sat-sec-dist"></span><span id="sat-sec-rad"></span><span id="sat-sec-intrack"></span><span id="sat-sec-crosstrack"></span>'
    );
    PluginRegistry.getPlugin(SelectSatManager)!.secondarySat = secondary.id;
    PluginRegistry.getPlugin(SelectSatManager)!.secondarySatObj = secondary;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Linear equals the SGP4-derived RIC range at the new sim time, ignoring stale worker positions', () => {
    const t0 = new Date(Date.UTC(2023, 1, 1, 0, 0, 0));
    const t1 = new Date(t0.getTime() + 30_000);
    const timeManager = ServiceLocator.getTimeManager();

    // As in the field report: primary already refreshed on the main thread, secondary still at the pre-jump state.
    primary.position = primary.eci(t1)!.position as TemeVec3;
    secondary.position = secondary.eci(t0)!.position as TemeVec3;

    timeManager.simulationTimeObj = t1;
    p().updateSecondarySatellite_(primary);

    const expectedRangeKm = secondary.toRIC(primary, t1).range;
    const shownKm = parseFloat(getEl('sat-sec-dist')!.textContent!);

    expect(Number.isFinite(expectedRangeKm)).toBe(true);
    expect(expectedRangeKm).toBeGreaterThan(1);
    // The stale pre-jump distance is a different number, so the test can tell the two sources apart.
    expect(
      Math.abs(Math.hypot(primary.position.x - secondary.position.x, primary.position.y - secondary.position.y, primary.position.z - secondary.position.z) - expectedRangeKm)
    ).toBeGreaterThan(50);
    expect(getEl('sat-sec-dist')!.textContent).toBe(`${expectedRangeKm.toFixed(2)} km`);
    // Display precision is 0.01 km; the underlying value is the RIC range itself.
    expect(Math.abs(shownKm - expectedRangeKm)).toBeLessThanOrEqual(0.005);

    // Linear and |R, I, C| come from the same states, so they agree to display precision.
    const r = parseFloat(getEl('sat-sec-rad')!.textContent!);
    const i = parseFloat(getEl('sat-sec-intrack')!.textContent!);
    const c = parseFloat(getEl('sat-sec-crosstrack')!.textContent!);

    expect(Math.abs(Math.hypot(r, i, c) - shownKm)).toBeLessThan(0.01);
  });

  it('uses the RIC range rather than the cruncher-buffer distance', () => {
    const t1 = new Date(Date.UTC(2023, 1, 1, 0, 0, 30));

    // Obviously stale buffer values, far from the real states.
    primary.position = { x: 7000, y: 0, z: 0 } as TemeVec3;
    secondary.position = { x: -7000, y: 0, z: 0 } as TemeVec3;
    ServiceLocator.getTimeManager().simulationTimeObj = t1;

    p().updateSecondarySatellite_(primary);

    const shownKm = parseFloat(getEl('sat-sec-dist')!.textContent!);

    expect(shownKm).not.toBeCloseTo(14000, 0);
    expect(shownKm).toBeCloseTo(secondary.toRIC(primary, t1).range, 2);
  });
});
