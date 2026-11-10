import { SatMath } from '@app/app/analysis/sat-math';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { vi } from 'vitest';

/** An inactive analyst slot, built the way CatalogManager.initObjects builds them (id = objectCache index). */
const makeSlot = (id: number): Satellite =>
  new Satellite({
    active: false,
    name: `Analyst Sat ${id}`,
    country: 'ANALSAT',
    launchVehicle: 'Analyst Satellite',
    launchSite: 'ANALSAT',
    sccNum: String(270000 + id),
    tle1: defaultSat.tle1 as TleLine1,
    tle2: defaultSat.tle2 as TleLine2,
    intlDes: CatalogManager.TEMPLATE_INTLDES,
    type: SpaceObjectType.PAYLOAD,
    id,
  });

describe('CatalogManager analyst slot batch API', () => {
  const SLOTS = 5;
  let cm: CatalogManager;
  let sendSatEdit: ReturnType<typeof vi.fn>;
  let sendSatEditBatch: ReturnType<typeof vi.fn>;
  let changeOrbitBufferData: ReturnType<typeof vi.fn>;
  let changeOrbitBuffersFor: ReturnType<typeof vi.fn>;
  let notifyObjectsChanged: ReturnType<typeof vi.fn>;
  let positionData: Float32Array;

  beforeEach(() => {
    cm = new CatalogManager();
    const slots = Array.from({ length: SLOTS }, (_, i) => makeSlot(i));

    cm.objectCache = [...slots];
    cm.analSatSet = [...slots];

    sendSatEdit = vi.fn();
    sendSatEditBatch = vi.fn();
    cm.satCruncherThread = { postMessage: vi.fn(), sendSatEdit, sendSatEditBatch } as never;

    changeOrbitBufferData = vi.fn();
    changeOrbitBuffersFor = vi.fn();
    vi.spyOn(ServiceLocator, 'getOrbitManager').mockReturnValue({ changeOrbitBufferData, changeOrbitBuffersFor } as never);

    notifyObjectsChanged = vi.fn();
    positionData = new Float32Array(SLOTS * 3);
    vi.spyOn(ServiceLocator, 'getDotsManager').mockReturnValue({ positionData, velocityData: new Float32Array(SLOTS * 3), updatePosVel: vi.fn() } as never);
    vi.spyOn(ServiceLocator, 'getColorSchemeManager').mockReturnValue({ notifyObjectsChanged } as never);
    vi.spyOn(SatMath, 'getEci').mockReturnValue({ position: { x: 7000, y: 8000, z: 9000 }, velocity: { x: 1, y: 2, z: 3 } } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const item = (id: number, sccNum?: string) => ({ id, tle1: defaultSat.tle1, tle2: defaultSat.tle2, sccNum });

  describe('getAvailableAnalystSats', () => {
    it('returns up to count free slots in slot order from one scan', () => {
      const got = cm.getAvailableAnalystSats(3, 0, SLOTS);

      expect(got.map((s) => s.id)).toEqual([0, 1, 2]);
    });

    it('returns fewer than count when the window runs out', () => {
      expect(cm.getAvailableAnalystSats(50, 0, SLOTS)).toHaveLength(SLOTS);
      expect(cm.getAvailableAnalystSats(50, 3, SLOTS).map((s) => s.id)).toEqual([3, 4]);
    });

    it('skips active slots', () => {
      cm.addAnalystSats([item(0), item(1)]);

      expect(cm.getAvailableAnalystSats(SLOTS, 0, SLOTS).map((s) => s.id)).toEqual([2, 3, 4]);
    });

    // Regression (p3-wp6-results.md): the scan used to look slots up by analyst sccNum. A slot activated under a
    // real NORAD no longer answers to it, so a removed slot was never reusable.
    it('finds and reuses a removed slot that was activated under a real NORAD sccNum', () => {
      const [first] = cm.addAnalystSats([item(2, '25544')]);

      expect(first?.sccNum).toBe('25544');
      expect(cm.getAvailableAnalystSats(SLOTS, 0, SLOTS).map((s) => s.id)).toEqual([0, 1, 3, 4]);

      // Remove it again (the slot goes inactive but keeps the real sccNum).
      (cm.objectCache[2] as Satellite).active = false;

      const reusable = cm.getAvailableAnalystSats(SLOTS, 0, SLOTS);

      expect(reusable.map((s) => s.id)).toEqual([0, 1, 2, 3, 4]);

      // And the next bulk call can claim it by slot id.
      const [again] = cm.addAnalystSats([item(2, '25544')]);

      expect(again).not.toBeNull();
      expect(again!.active).toBe(true);
    });
  });

  describe('addAnalystSats', () => {
    it('activates N free slots in one call', () => {
      const slots = cm.getAvailableAnalystSats(3, 0, SLOTS);
      const result = cm.addAnalystSats(slots.map((s) => item(s.id)));

      expect(result).toHaveLength(3);
      for (const sat of result) {
        expect(sat).not.toBeNull();
        expect(sat!.active).toBe(true);
        expect(sat!.isSatellite()).toBe(true);
      }
      expect(result.map((s) => s!.id)).toEqual([0, 1, 2]);
      expect(cm.objectCache[0]).toBe(result[0]);
      expect(cm.getAvailableAnalystSats(SLOTS, 0, SLOTS).map((s) => s.id)).toEqual([3, 4]);
    });

    it('sends ONE batch message to the position cruncher and one to the orbit cruncher', () => {
      const l1 = defaultSat.tle1;
      const l2 = defaultSat.tle2;

      cm.addAnalystSats([item(0), item(1), item(2)]);

      expect(sendSatEditBatch).toHaveBeenCalledTimes(1);
      expect(sendSatEditBatch).toHaveBeenCalledWith([0, 1, 2], [l1, l1, l1], [l2, l2, l2]);
      expect(sendSatEdit).not.toHaveBeenCalled();
      expect(changeOrbitBuffersFor).toHaveBeenCalledTimes(1);
      expect(changeOrbitBuffersFor).toHaveBeenCalledWith([0, 1, 2], [l1, l1, l1], [l2, l2, l2]);
      expect(changeOrbitBufferData).not.toHaveBeenCalled();
    });

    it('seeds every dot position and refreshes the color worker once', () => {
      cm.addAnalystSats([item(0), item(1), item(2)]);

      expect(Array.from(positionData.slice(0, 9))).toEqual([7000, 8000, 9000, 7000, 8000, 9000, 7000, 8000, 9000]);
      expect(notifyObjectsChanged).toHaveBeenCalledTimes(1);
    });

    it('calls configure once per new satellite with its index, before the color refresh', () => {
      const order: string[] = [];

      notifyObjectsChanged.mockImplementation(() => order.push('notify'));
      const configure = vi.fn((sat: Satellite, index: number) => {
        order.push(`configure-${index}`);
        sat.name = `Configured ${index}`;
      });

      const result = cm.addAnalystSats([item(0), item(1), item(2)], configure);

      expect(configure).toHaveBeenCalledTimes(3);
      expect(configure.mock.calls.map((c) => c[1])).toEqual([0, 1, 2]);
      expect(configure.mock.calls[1][0]).toBe(result[1]);
      expect(result.map((s) => s!.name)).toEqual(['Configured 0', 'Configured 1', 'Configured 2']);
      expect(order).toEqual(['configure-0', 'configure-1', 'configure-2', 'notify']);
    });

    it('returns null for entries that fail validation, keeps index alignment and batches only the good ones', () => {
      const configure = vi.fn();
      const result = cm.addAnalystSats(
        [item(0), { id: 1, tle1: defaultSat.tle1.slice(0, 68), tle2: defaultSat.tle2 }, { id: 2, tle1: defaultSat.tle1, tle2: `${defaultSat.tle2}0` }, item(3)],
        configure
      );

      expect(result.map((s) => s?.id ?? null)).toEqual([0, null, null, 3]);
      expect(configure.mock.calls.map((c) => c[1])).toEqual([0, 3]);
      expect(sendSatEditBatch).toHaveBeenCalledTimes(1);
      expect(sendSatEditBatch.mock.calls[0][0]).toEqual([0, 3]);
      expect(changeOrbitBuffersFor.mock.calls[0][0]).toEqual([0, 3]);
      // The failed slots were not activated.
      expect(cm.objectCache[1].active).toBe(false);
      expect(cm.objectCache[2].active).toBe(false);
    });

    it('returns null for an unparseable element set and a sub-surface orbit, and sends nothing', () => {
      vi.spyOn(SatMath, 'altitudeCheck').mockReturnValueOnce(0);
      const garbage = `1 ${'x'.repeat(67)}`;
      const result = cm.addAnalystSats([item(0), { id: 1, tle1: garbage, tle2: garbage }]);

      expect(result).toEqual([null, null]);
      expect(sendSatEditBatch).not.toHaveBeenCalled();
      expect(changeOrbitBuffersFor).not.toHaveBeenCalled();
      expect(notifyObjectsChanged).not.toHaveBeenCalled();
    });

    it('sends no worker messages for an empty list', () => {
      expect(cm.addAnalystSats([])).toEqual([]);
      expect(sendSatEditBatch).not.toHaveBeenCalled();
      expect(changeOrbitBuffersFor).not.toHaveBeenCalled();
    });

    it('leaves no free slot to claim once every slot is active', () => {
      cm.addAnalystSats(cm.getAvailableAnalystSats(SLOTS, 0, SLOTS).map((s) => item(s.id)));

      expect(cm.getAvailableAnalystSats(2, 0, SLOTS)).toEqual([]);
      // With nothing to claim the caller passes an empty list and no message goes out.
      sendSatEditBatch.mockClear();
      expect(cm.addAnalystSats([])).toEqual([]);
      expect(sendSatEditBatch).not.toHaveBeenCalled();
    });

    it('honours an explicit sccNum for the new satellite', () => {
      const [sat] = cm.addAnalystSats([item(1, '270001')]);

      expect(sat?.sccNum).toBe('270001');
    });
  });
});
