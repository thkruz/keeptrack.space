import { AnalystSlotReservations } from '@app/app/data/analyst-slot-reservations';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getFreeAnalystScc } from '@app/plugins/create-sat/create-sat-actions';
import { validateAdvancedFields, validateBasicFields } from '@app/plugins/create-sat/create-sat-validation';
import { Satellite } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/** An untouched analyst slot template: inactive, country ANALSAT, the catalog's template TLE. */
const placeholder = (sccNum: string, id: number): Satellite =>
  new Satellite({
    id,
    sccNum,
    active: false,
    country: 'ANALSAT',
    name: `Analyst Sat ${id}`,
    tle1: `1 ${sccNum}U 58002B   17115.48668720 +.00000144 +00000-0 +16234-3 0  9994`,
    tle2: `2 ${sccNum} 034.2502 167.2636 0042608 222.6554 121.5501 14.84703551080477`,
  } as never);

const ADVANCED = {
  scc: '90000',
  type: '1',
  country: 'US',
  inc: '51.6',
  meanmo: '15.5',
  rasc: '0',
  ecen: '0001000',
  argPe: '0',
  meana: '0',
  epochyr: '25',
  epochday: '001.00000000',
  source: 'User',
  name: 'Test',
  period: '92.9',
};
const BASIC = { scc: '90000', inc: '51.6', apogee: '420', perigee: '410' };

describe('AnalystSlotReservations', () => {
  afterEach(() => {
    AnalystSlotReservations.clear();
  });

  it('normalizes ids, reserves per owner and releases', () => {
    AnalystSlotReservations.reserve('090000', 'new-launch');

    expect(AnalystSlotReservations.isReserved('90000')).toBe(true);
    expect(AnalystSlotReservations.isReserved(90000)).toBe(true);
    expect(AnalystSlotReservations.isReserved(' 90000 ')).toBe(true);
    expect(AnalystSlotReservations.isReserved('90001')).toBe(false);
    expect(AnalystSlotReservations.isReserved('')).toBe(false);
    expect(AnalystSlotReservations.isReserved(null)).toBe(false);

    // Another owner cannot release it.
    AnalystSlotReservations.release('90000', 'someone-else');
    expect(AnalystSlotReservations.isReserved('90000')).toBe(true);

    AnalystSlotReservations.release('90000', 'new-launch');
    expect(AnalystSlotReservations.isReserved('90000')).toBe(false);
  });

  it('releaseAll drops only that owner', () => {
    AnalystSlotReservations.reserve('90000', 'new-launch');
    AnalystSlotReservations.reserve('90005', 'new-launch');
    AnalystSlotReservations.reserve('90007', 'other');

    AnalystSlotReservations.releaseAll('new-launch');

    expect(AnalystSlotReservations.reserved()).toEqual(['90007']);
  });
});

describe('analyst slot allocators skip reserved ids', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    AnalystSlotReservations.clear();
  });

  it('CatalogManager.getNextAvailableAnalystSat skips a reserved slot', () => {
    const slots = new Map<number, Satellite>([
      [90500, placeholder('90500', 500)],
      [90501, placeholder('90501', 501)],
    ]);
    const fakeCatalog = { sccNum2Sat: (scc: number) => slots.get(scc) ?? null };
    const next = () => CatalogManager.prototype.getNextAvailableAnalystSat.call(fakeCatalog as unknown as CatalogManager, 500, 502);

    expect(next()?.sccNum).toBe('90500');

    AnalystSlotReservations.reserve('90500', 'new-launch');
    expect(next()?.sccNum).toBe('90501');

    AnalystSlotReservations.reserve('90501', 'new-launch');
    expect(next()).toBeNull();
  });

  it('getFreeAnalystScc (Create Satellite, clone, presets) skips a reserved slot', () => {
    const catalog = ServiceLocator.getCatalogManager();

    catalog.objectCache = [placeholder('90000', 0), placeholder('90001', 1)];

    expect(getFreeAnalystScc()).toBe('90000');

    AnalystSlotReservations.reserve('90000', 'new-launch');
    expect(getFreeAnalystScc()).toBe('90001');

    AnalystSlotReservations.release('90000', 'new-launch');
    expect(getFreeAnalystScc()).toBe('90000');
  });

  it('Create Satellite validation rejects a typed id held by a launch trajectory', () => {
    AnalystSlotReservations.reserve('90000', 'new-launch');
    const message = 'NORAD ID 90000 is held by a launch trajectory. Choose another ID or remove the trajectory first.';

    const advanced = validateAdvancedFields(ADVANCED).find((error) => error.id === 'scc');
    const basic = validateBasicFields(BASIC).find((error) => error.id === 'basic-scc');

    expect(advanced?.message).toBe(message);
    expect(basic?.message).toBe(message);

    AnalystSlotReservations.clear();
    expect(validateAdvancedFields(ADVANCED).find((error) => error.id === 'scc')).toBeUndefined();
  });
});
