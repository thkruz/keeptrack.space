import { AnalystSlotReservations } from '@app/app/data/analyst-slot-reservations';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SimulationCleaners } from '@app/engine/simulation/simulation-cleaners';
import { missileManager } from '@app/plugins/missile/missile-manager';
import { classifyAnalystSat, getActiveAnalystSats } from '@app/plugins/simulation-cleaners/analyst-slots';
import { BREAKUP_CLEANER_ID, CREATED_SATS_CLEANER_ID, MISSILE_CLEANER_ID, registerBuiltInSimulationCleaners } from '@app/plugins/simulation-cleaners/builtin-cleaners';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const TLE1 = '1 25544U 98067A   21275.61828767  .00000808  00000-0  26368-4 0  9993' as TleLine1;
const TLE2 = '2 25544  51.6443  82.0195 0002976  83.8537 276.3289 15.48978703297422' as TleLine2;

const mkSat = (i: number, over: Partial<ConstructorParameters<typeof Satellite>[0]> = {}) =>
  new Satellite({ id: i, sccNum: String(90000 + i), name: `Analyst Sat ${i}`, tle1: TLE1, tle2: TLE2, active: false, ...over });

describe('built-in simulation cleaners', () => {
  let catalog: ReturnType<typeof ServiceLocator.getCatalogManager>;

  /** Ten analyst slots at catalog ids 0-9: 0 created, 1-2 breakup, 3 maneuver clone, 4 reserved, rest free. */
  const installSlots = () => {
    catalog = ServiceLocator.getCatalogManager();
    const slots = Array.from({ length: 10 }, (_, i) => mkSat(i));

    slots[0] = mkSat(0, { active: true, name: 'My Sat' });
    slots[1] = mkSat(1, { active: true, name: 'Breakup Piece 1' });
    slots[2] = mkSat(2, { active: true, name: 'Breakup Piece 2' });
    slots[3] = mkSat(3, { active: true, name: 'Clone (burn 1)' });
    slots[3].derivedFromSccNum = '25544';
    slots[4] = mkSat(4, { active: true, name: 'Launch trajectory' });
    AnalystSlotReservations.reserve(slots[4].sccNum, 'new-launch');

    catalog.objectCache = slots as never;
    vi.spyOn(catalog, 'sccNum2Id').mockImplementation(((scc: string) => {
      const i = Number(scc) - 90000;

      return i >= 0 && i < slots.length ? i : null;
    }) as never);
    catalog.satCruncherThread = { sendSatEdit: vi.fn() } as never;
    vi.spyOn(ServiceLocator.getOrbitManager(), 'changeOrbitBufferData').mockImplementation(() => undefined as never);
    vi.spyOn(ServiceLocator.getColorSchemeManager(), 'notifyObjectsChanged').mockImplementation(() => undefined);
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined as never);
    settingsManager.maxAnalystSats = 10;
  };

  beforeEach(() => {
    setupStandardEnvironment();
    SimulationCleaners.reset();
    AnalystSlotReservations.clear();
    installSlots();
    registerBuiltInSimulationCleaners();
  });

  afterEach(() => {
    AnalystSlotReservations.clear();
    vi.restoreAllMocks();
  });

  it('classifies active analyst sats and skips reserved slots', () => {
    expect(getActiveAnalystSats()).toHaveLength(4);
    expect(classifyAnalystSat(catalog.objectCache[0] as Satellite)).toBe('created');
    expect(getActiveAnalystSats('breakup').map((s) => s.id)).toEqual([1, 2]);
    expect(getActiveAnalystSats('maneuver').map((s) => s.id)).toEqual([3]);
  });

  it('registration is idempotent and only lists categories with items', () => {
    registerBuiltInSimulationCleaners();
    expect(SimulationCleaners.getActive().map((c) => c.id)).toEqual([BREAKUP_CLEANER_ID, CREATED_SATS_CLEANER_ID]);
  });

  it('created-satellites cleaner frees only created slots', () => {
    SimulationCleaners.clearAll();

    expect((catalog.objectCache[0] as Satellite).active).toBe(false);
    // maneuver clone belongs to the pro cleaner; reserved slot belongs to another object
    expect((catalog.objectCache[3] as Satellite).active).toBe(true);
    expect((catalog.objectCache[4] as Satellite).active).toBe(true);
  });

  it('breakup cleaner deactivates pieces, resets buffers and the color worker', () => {
    SimulationCleaners.clearAll();

    expect((catalog.objectCache[1] as Satellite).active).toBe(false);
    expect((catalog.objectCache[2] as Satellite).active).toBe(false);
    expect(catalog.satCruncherThread.sendSatEdit).toHaveBeenCalled();
    expect(ServiceLocator.getColorSchemeManager().notifyObjectsChanged).toHaveBeenCalled();
  });

  it('missile cleaner counts missilesInUse and clears through the missile manager', () => {
    const clearSpy = vi.spyOn(missileManager, 'clearMissiles').mockImplementation(() => undefined);
    const prior = missileManager.missilesInUse;

    missileManager.missilesInUse = 3;
    try {
      expect(SimulationCleaners.getActive().find((c) => c.id === MISSILE_CLEANER_ID)?.count).toBe(3);
      SimulationCleaners.clearAll();
      expect(clearSpy).toHaveBeenCalled();
    } finally {
      missileManager.missilesInUse = prior;
    }
  });
});
