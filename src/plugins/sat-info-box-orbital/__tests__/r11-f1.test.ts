import { buildGeoRegionIndex } from '@app/app/analysis/geo-region-lookup';
import { SatMath } from '@app/app/analysis/sat-math';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxOrbital } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital';
import { EL } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital-html';
import { findWaterBody } from '@app/plugins/sat-info-box-orbital/water-bodies';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite, TemeVec3, TleLine1, TleLine2 } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const marineMock = vi.hoisted(() => ({ index: null as null | { polygons: unknown[] } }));

vi.mock('@app/plugins/sat-info-box-orbital/region-data', () => ({
  getRegionIndex: () => ({ polygons: [] }),
  loadRegionIndex: async () => null,
  getMarineIndex: () => marineMock.index,
  loadMarineIndex: async () => null,
}));

describe('findWaterBody', () => {
  it.each([
    [0, -140, 'pacific'],
    [30, -40, 'atlantic'],
    [-30, -10, 'atlantic'],
    [-20, 80, 'indian'],
    [-75, 10, 'southern'],
    [80, 0, 'arctic'],
    [35, 18, 'mediterranean'],
    [15, -75, 'caribbean'],
    [25, -90, 'gulfOfMexico'],
    [20, 38, 'redSea'],
    [43, 34, 'blackSea'],
    [56, 3, 'northSea'],
    [58, 20, 'baltic'],
    [15, 65, 'arabianSea'],
    [14, 88, 'bayOfBengal'],
    [12, 114, 'southChinaSea'],
    [27, 52, 'persianGulf'],
    [10, 190, 'pacific'],
  ])('lat %f lon %f is %s', (lat, lon, expected) => {
    expect(findWaterBody(lat, lon)).toBe(expected);
  });
});

describe('SatInfoBoxOrbital R11-F1', () => {
  let plugin: SatInfoBoxOrbital;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const iss = new Satellite({
    ...defaultSat,
    id: 0,
    tle1: '1 25544U 98067A   23031.50000000  .00016717  00000-0  10270-3 0  9994' as TleLine1,
    tle2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50000000 00008' as TleLine2,
  });

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxOrbital();
    websiteInit(plugin);
    document.body.innerHTML = p().createOrbitalSection();
    vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) => cb({ didTimeout: false, timeRemaining: () => 50 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('#68 a clock jump refreshes altitude and speed from the new time, not the stale worker position', () => {
    const timeManager = ServiceLocator.getTimeManager();
    const t0 = new Date(Date.UTC(2023, 1, 1, 0, 0, 0));
    const t1 = new Date(Date.UTC(2023, 1, 1, 0, 40, 0));
    const selection = PluginRegistry.getPlugin(SelectSatManager)!;

    selection.selectedSat = iss.id;
    selection.primarySatObj = iss;
    timeManager.simulationTimeObj = t0;
    // The worker buffer still holds the t0 state when the jump happens.
    iss.position = iss.eci(t0)!.position as TemeVec3;
    p().updateOrbitData_(iss);

    timeManager.simulationTimeObj = t1;
    EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, 0);

    const expected = iss.eci(t1)!;
    const expectedAlt = SatMath.getAlt(expected.position as TemeVec3, timeManager.gmst).toFixed(2);
    const expectedSpeed = Math.hypot(expected.velocity.x, expected.velocity.y, expected.velocity.z).toFixed(2);

    expect(getEl(EL.ALTITUDE)!.textContent).toBe(`${expectedAlt} ${t7e('SatInfoBoxOrbital.kilometer')}`);
    expect(getEl(EL.VELOCITY)!.textContent).toContain(expectedSpeed);
  });

  it('#68 a jump does nothing when the selected object is not the one passed in', () => {
    const selection = PluginRegistry.getPlugin(SelectSatManager)!;

    selection.selectedSat = -1;
    selection.primarySatObj = null as never;
    expect(() => EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, 0)).not.toThrow();
  });

  it('#93 shows TEME for a GP object and tags the sigmas as default with the stored digits on hover', () => {
    p().updateOrbitData_(iss);

    expect(getEl(EL.REF_FRAME)!.firstChild?.textContent).toBe(t7e('SatInfoBoxOrbital.RefFrame.teme' as Parameters<typeof t7e>[0]));
    expect(getEl(EL.REF_FRAME)!.querySelector('.sat-info-circle')?.getAttribute('kt-tooltip')).toBeTruthy();
    expect(getEl(`${EL.REF_FRAME}-row`)!.style.display).toBe('flex');
    expect(getEl(EL.UNCERTAINTY_RADIAL)!.textContent).toContain(`(${t7e('SatInfoBoxOrbital.Sigma.defaultTag' as Parameters<typeof t7e>[0])})`);
    expect(getEl(EL.UNCERTAINTY_RADIAL)!.getAttribute('kt-tooltip')).toMatch(/\d+\.\d{3} /u);
    expect(getEl(EL.INCLINATION)!.getAttribute('kt-tooltip')).toBe('51.6416');
  });

  it('#88 formats the latitude reach from the inclination, including retrograde orbits', () => {
    expect(SatInfoBoxOrbital.formatLatitudeBand(51.6416)).toBe('±51.64°');
    expect(SatInfoBoxOrbital.formatLatitudeBand(98.2)).toBe('±81.80°');
    expect(SatInfoBoxOrbital.formatLatitudeBand(Number.NaN)).toBe(t7e('SatInfoBoxOrbital.notAvailable' as Parameters<typeof t7e>[0]));

    p().updateOrbitData_(iss);
    expect(getEl(EL.LAT_BAND)!.textContent).toBe('±51.64°');
  });

  it('#133 names the water body when no country is under the satellite', () => {
    const regionEl = getEl(EL.REGION)!;

    p().updateRegionElement_(0, -140);

    expect(regionEl.textContent).toBe(t7e('SatInfoBoxOrbital.Region.Water.pacific' as Parameters<typeof t7e>[0]));
  });

  it('#27 prefers the marine polygon name over the coarse water box once loaded', () => {
    const regionEl = getEl(EL.REGION)!;

    marineMock.index = buildGeoRegionIndex([
      {
        properties: { name: 'Coral Sea', names: { de: 'Korallenmeer' } },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-150, -10],
              [-130, -10],
              [-130, 10],
              [-150, 10],
              [-150, -10],
            ],
          ],
        },
      },
    ]);
    try {
      p().updateRegionElement_(0, -140);
      expect(regionEl.textContent).toBe('Coral Sea');
    } finally {
      marineMock.index = null;
    }
  });
});
