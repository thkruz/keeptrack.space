/* eslint-disable max-lines-per-function */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { missileManager } from '@app/plugins/missile/missile-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { Degrees, Kilometers, SpaceObjectType } from '@ootk/src/main';

type TestMissileSpec = {
  launchLatitude: number;
  launchLongitude: number;
  targetLatitude: number;
  targetLongitude: number;
  numberOfWarheads: number;
  missileObjectNum: number;
  startTime: number;
  description: string;
  length?: number;
  diameter?: number;
  burnRate?: number;
  maxRangeKm: number;
  country?: string;
  minAltitudeKm?: number;
};

type TestResult = {
  success: boolean;
  errorMessage: string;
  errorType: string;
  missile?: MissileObject;
};

/**
 * Adapter over the current 14-positional `missileManager.createMissile` API.
 *
 * When PR 4 lands and the API becomes `createMissile(spec)`, only this helper
 * changes - every test body and snapshot stays identical.
 */
const launch = (spec: TestMissileSpec): TestResult => {
  const slot = spec.missileObjectNum;
  const rc = missileManager.createMissile(
    spec.launchLatitude,
    spec.launchLongitude,
    spec.targetLatitude,
    spec.targetLongitude,
    spec.numberOfWarheads,
    slot,
    spec.startTime,
    spec.description,
    spec.length ?? 17,
    spec.diameter ?? 3.1,
    spec.burnRate ?? 0.042,
    spec.maxRangeKm,
    spec.country ?? '',
    spec.minAltitudeKm ?? 0,
  );

  return {
    success: rc === 1,
    errorMessage: missileManager.lastMissileError,
    errorType: missileManager.lastMissileErrorType,
    missile: rc === 1 ? (ServiceLocator.getCatalogManager().getObject(slot) as MissileObject) : undefined,
  };
};

/** Allocate 500 empty MissileObject slots in the catalog starting at index 0. */
const seedMissileSlots = () => {
  const catalog = ServiceLocator.getCatalogManager();
  const slots: MissileObject[] = [];

  for (let i = 0; i < 500; i++) {
    slots.push(
      new MissileObject({
        id: i,
        desc: '',
        active: false,
        latList: [],
        lonList: [],
        altList: [],
        timeList: [],
        startTime: 0,
        maxAlt: 0,
        country: '',
        launchVehicle: '',
      }),
    );
  }
  catalog.objectCache = slots;
  catalog.missileSats = 500;
};

const nextSlot = () => missileManager.missilesInUse;

const resetMissileManagerState = () => {
  missileManager.missilesInUse = 0;
  missileManager.lastMissileError = '';
  missileManager.lastMissileErrorType = ToastMsgType.normal;
  missileManager.missileArray = [];
};

describe('MissileManager (baseline - pre-refactor)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    seedMissileSlots();
    resetMissileManagerState();
  });

  describe('Input validation', () => {
    it('rejects target latitude > 90', () => {
      const result = launch({
        launchLatitude: 40,
        launchLongitude: -75,
        targetLatitude: 95,
        targetLongitude: 30,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.now(),
        description: 'bad target lat',
        maxRangeKm: 10_000,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toMatch(/Target Latitude/u);
      expect(result.errorType).toBe(ToastMsgType.critical);
    });

    it('rejects target longitude > 180', () => {
      const result = launch({
        launchLatitude: 40,
        launchLongitude: -75,
        targetLatitude: 50,
        targetLongitude: 185,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.now(),
        description: 'bad target lon',
        maxRangeKm: 10_000,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toMatch(/Target Longitude/u);
      expect(result.errorType).toBe(ToastMsgType.critical);
    });

    it('rejects more than 12 warheads', () => {
      const result = launch({
        launchLatitude: 40,
        launchLongitude: -75,
        targetLatitude: 50,
        targetLongitude: 30,
        numberOfWarheads: 13,
        missileObjectNum: nextSlot(),
        startTime: Date.now(),
        description: 'too many warheads',
        maxRangeKm: 10_000,
      });

      expect(result.success).toBe(false);
    });

    it('rejects fractional warhead counts', () => {
      const result = launch({
        launchLatitude: 40,
        launchLongitude: -75,
        targetLatitude: 50,
        targetLongitude: 30,
        numberOfWarheads: 1.5,
        missileObjectNum: nextSlot(),
        startTime: Date.now(),
        description: 'fractional warheads',
        maxRangeKm: 10_000,
      });

      expect(result.success).toBe(false);
    });

    it('rejects range exceeding maxRangeKm', () => {
      const result = launch({
        launchLatitude: 40,
        launchLongitude: -75,
        targetLatitude: 35,
        targetLongitude: 139,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.now(),
        description: 'over-range',
        maxRangeKm: 1_000,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toMatch(/maximum distance of 1000 km/u);
    });

    it('rejects arc length below 320 km minimum', () => {
      const result = launch({
        launchLatitude: 40.0,
        launchLongitude: -75.0,
        targetLatitude: 40.5,
        targetLongitude: -75.5,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.now(),
        description: 'too close',
        maxRangeKm: 10_000,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toMatch(/minimum distance of 320 km/u);
    });
  });

  describe('missilesInUse counter and clearMissiles', () => {
    it('increments missilesInUse on successful launch', () => {
      expect(missileManager.missilesInUse).toBe(0);

      const result = launch({
        launchLatitude: 52.5,
        launchLongitude: 82.75,
        targetLatitude: 38.9,
        targetLongitude: -77.0,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.UTC(2024, 0, 1),
        description: 'baseline launch',
        burnRate: 0.07,
        maxRangeKm: 16_000,
        country: 'Russia',
        minAltitudeKm: 1_120,
      });

      expect(result.success).toBe(true);
      expect(missileManager.missilesInUse).toBe(1);
    }, 60_000);

    it('clearMissiles resets all 500 slots and the counter', () => {
      const result = launch({
        launchLatitude: 52.5,
        launchLongitude: 82.75,
        targetLatitude: 38.9,
        targetLongitude: -77.0,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.UTC(2024, 0, 1),
        description: 'will be cleared',
        burnRate: 0.07,
        maxRangeKm: 16_000,
        country: 'Russia',
        minAltitudeKm: 1_120,
      });

      expect(result.success).toBe(true);
      expect(missileManager.missilesInUse).toBe(1);

      missileManager.clearMissiles();

      expect(missileManager.missilesInUse).toBe(0);
      const catalog = ServiceLocator.getCatalogManager();

      for (let i = 0; i < 500; i++) {
        const obj = catalog.getObject(i) as MissileObject;

        expect(obj.active).toBe(false);
        expect(obj.latList).toEqual([]);
        expect(obj.lonList).toEqual([]);
        expect(obj.name).toBe('');
        expect(obj.startTime).toBe(0);
      }
    }, 60_000);

    it('populates trajectory + type on a successful launch', () => {
      const result = launch({
        launchLatitude: 52.5,
        launchLongitude: 82.75,
        targetLatitude: 38.9,
        targetLongitude: -77.0,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.UTC(2024, 0, 1),
        description: 'shape check',
        burnRate: 0.07,
        maxRangeKm: 16_000,
        country: 'Russia',
        minAltitudeKm: 1_120,
      });

      expect(result.success).toBe(true);
      expect(result.missile).toBeDefined();
      expect(result.missile!.active).toBe(true);
      expect(result.missile!.type).toBe(SpaceObjectType.BALLISTIC_MISSILE);
      expect(result.missile!.country).toBe('Russia');
      expect(result.missile!.latList.length).toBeGreaterThan(0);
      expect(result.missile!.lonList.length).toBe(result.missile!.latList.length);
      expect(result.missile!.altList.length).toBe(result.missile!.latList.length);
      expect(result.missile!.maxAlt).toBeGreaterThan(0);
    }, 60_000);
  });

  describe('Bug documentation (will FAIL today, flip to passing as fixes land)', () => {
    /**
     * Note on the "input stacking" framing from issue #914:
     *
     * On close inspection of missile-manager.ts:254-313, every module-level
     * mutable constant (BurnRate, EarthRadius, etc.) is re-initialized at the
     * top of each Missile() call before any read. JavaScript is single-threaded,
     * so two Missile() calls cannot overlap. The literal "concurrent
     * contamination" bug doesn't manifest in normal execution.
     *
     * What DOES happen, and what the refactor genuinely fixes, are the two
     * bugs below: silent validation failures and the retry-returns-0 path
     * that lies to callers about whether a missile was actually created.
     * The MissileSimulation extraction is still worth doing for clarity and
     * testability - but "concurrency" is not the right framing.
     */

    /**
     * Bug 1 (FIXED): invalid launch lat/lon used to return 0 silently - no
     * error message, no error type, no toast (target lat/lon set a message, but
     * launch coords were silent). The validation now populates lastMissileError
     * the same way the target bounds checks do.
     */
    it('out-of-range launch latitude populates lastMissileError', () => {
      const result = launch({
        launchLatitude: 95,
        launchLongitude: -75,
        targetLatitude: 50,
        targetLongitude: 30,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.now(),
        description: 'bad launch lat',
        maxRangeKm: 10_000,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toMatch(/Launch Latitude/u);
    });

    /**
     * Bug 2 (FIXED): when computed apogee falls below minAltitudeTrue, Missile()
     * recursively calls itself with a higher burn rate - and used to
     * unconditionally return 0, falsely signalling failure even when the
     * recursive call succeeded. It now returns the retry's result.
     *
     * Test setup: choose a launch where the default burn rate (0.042) is
     * insufficient and the retry-with-bumped-rate path kicks in. The retry
     * should succeed, so the caller observes success.
     */
    it('retry-on-low-apogee reports success when the retry succeeds', () => {
      const result = launch({
        launchLatitude: 52.5,
        launchLongitude: 82.75,
        targetLatitude: 38.9,
        targetLongitude: -77.0,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.UTC(2024, 0, 1),
        description: 'needs retry',
        burnRate: 0.042,
        maxRangeKm: 16_000,
        country: 'Russia',
        minAltitudeKm: 1_500,
      });

      expect(result.success).toBe(true);
    }, 120_000);
  });

  describe('Golden trajectory snapshots (regression baseline)', () => {
    /**
     * These three fixtures capture the *current* physics output as the
     * regression baseline. Every later refactor PR must produce identical
     * latList / lonList / altList / maxAlt. If a snapshot diff appears,
     * investigate before running `--update-snapshots`.
     */
    it('Russian SS-18 (Aleysk) → Washington DC', () => {
      const result = launch({
        launchLatitude: 52.5,
        launchLongitude: 82.75,
        targetLatitude: 38.9,
        targetLongitude: -77.0,
        numberOfWarheads: 3,
        missileObjectNum: nextSlot(),
        startTime: Date.UTC(2024, 0, 1),
        description: 'Aleysk (SS-18)',
        burnRate: 0.07,
        maxRangeKm: 16_000,
        country: 'Russia',
        minAltitudeKm: 1_120,
      });

      expect(result.success).toBe(true);
      const trajectory = {
        latList: result.missile!.latList.map((v: Degrees) => Number(v.toFixed(2))),
        lonList: result.missile!.lonList.map((v: Degrees) => Number(v.toFixed(2))),
        altList: result.missile!.altList.map((v: Kilometers) => Number(v.toFixed(2))),
        maxAlt: Number(result.missile!.maxAlt.toFixed(2)),
      };

      expect(trajectory).toMatchSnapshot();
    }, 60_000);

    it('North Korean BM (Sohae) → Tokyo', () => {
      const result = launch({
        launchLatitude: 39.65,
        launchLongitude: 124.7,
        targetLatitude: 35.7,
        targetLongitude: 139.7,
        numberOfWarheads: 1,
        missileObjectNum: nextSlot(),
        startTime: Date.UTC(2024, 0, 1),
        description: 'Sohae',
        burnRate: 0.07,
        maxRangeKm: 3_000,
        country: 'North Korea',
        minAltitudeKm: 100,
      });

      expect(result.success).toBe(true);
      const trajectory = {
        latList: result.missile!.latList.map((v: Degrees) => Number(v.toFixed(2))),
        lonList: result.missile!.lonList.map((v: Degrees) => Number(v.toFixed(2))),
        altList: result.missile!.altList.map((v: Kilometers) => Number(v.toFixed(2))),
        maxAlt: Number(result.missile!.maxAlt.toFixed(2)),
      };

      expect(trajectory).toMatchSnapshot();
    }, 60_000);

    it('French SLBM (mid-Atlantic) → Moscow', () => {
      const result = launch({
        launchLatitude: 45.0,
        launchLongitude: -25.0,
        targetLatitude: 55.75,
        targetLongitude: 37.6,
        numberOfWarheads: 4,
        missileObjectNum: nextSlot(),
        startTime: Date.UTC(2024, 0, 1),
        description: 'M51 SLBM',
        burnRate: 0.07,
        maxRangeKm: 10_000,
        country: 'France',
        minAltitudeKm: 200,
      });

      expect(result.success).toBe(true);
      const trajectory = {
        latList: result.missile!.latList.map((v: Degrees) => Number(v.toFixed(2))),
        lonList: result.missile!.lonList.map((v: Degrees) => Number(v.toFixed(2))),
        altList: result.missile!.altList.map((v: Kilometers) => Number(v.toFixed(2))),
        maxAlt: Number(result.missile!.maxAlt.toFixed(2)),
      };

      expect(trajectory).toMatchSnapshot();
    }, 60_000);
  });
});
