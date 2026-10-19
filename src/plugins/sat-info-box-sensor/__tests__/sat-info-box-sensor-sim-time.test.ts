import { SatMath } from '@app/app/analysis/sat-math';
import * as stdMagEstimator from '@app/app/analysis/std-mag-estimator';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { NextPassCache, SatInfoBoxSensor } from '@app/plugins/sat-info-box-sensor/sat-info-box-sensor';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const SIM_TIME = new Date(Date.UTC(2026, 9, 16, 10, 30, 3));

const setSimTime_ = (date: Date) => {
  ServiceLocator.getTimeManager().simulationTimeObj = new Date(date.getTime());
};

const setupSensorAndSat_ = () => {
  ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
  standardSelectSat();
  KeepTrack.getInstance().isInitialized = true;
};

const frame_ = () => {
  EventBus.getInstance().emit(EventBusEvent.updateSelectBox, defaultSat);
};

describe('SatInfoBoxSensor sim-time correctness', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RA/Dec', () => {
    it('computes the object and the site state at the simulation time, not the wall clock', () => {
      const satSpy = vi.spyOn(defaultSat, 'toJ2000');
      const sensorSpy = vi.spyOn(defaultSensor, 'toJ2000');

      SatInfoBoxSensor.computeTopocentricRaDec_(defaultSat, defaultSensor, SIM_TIME);

      expect(satSpy).toHaveBeenCalledWith(SIM_TIME);
      expect(sensorSpy).toHaveBeenCalledWith(SIM_TIME);
    });

    it('gives the same RA/Dec for the same sim instant whatever the wall clock reads', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 17, 4, 47));
      const first = SatInfoBoxSensor.computeTopocentricRaDec_(defaultSat, defaultSensor, SIM_TIME);

      nowSpy.mockReturnValue(Date.UTC(2026, 9, 17, 4, 52));
      const second = SatInfoBoxSensor.computeTopocentricRaDec_(defaultSat, defaultSensor, SIM_TIME);

      expect(second.ra).toBeCloseTo(first.ra, 10);
      expect(second.dec).toBeCloseTo(first.dec, 10);
      expect(first.ra).toBeGreaterThanOrEqual(0);
      expect(first.ra).toBeLessThan(360);
    });

    it('follows the sim clock: a different sim time gives a different RA', () => {
      const a = SatInfoBoxSensor.computeTopocentricRaDec_(defaultSat, defaultSensor, SIM_TIME);
      const b = SatInfoBoxSensor.computeTopocentricRaDec_(defaultSat, defaultSensor, new Date(SIM_TIME.getTime() + 5 * 60e3));

      expect(b.ra).not.toBeCloseTo(a.ra, 3);
    });

    it('uses the sim time in the info box and labels the frame', () => {
      const plugin = new SatInfoBoxSensor();

      websiteInit(plugin);
      vi.spyOn(DetailedSensor.prototype, 'isRaeInFov').mockReturnValue(true);
      vi.spyOn(SensorMath, 'nextpass').mockReturnValue('No Passes in 2 Days');
      const satSpy = vi.spyOn(Satellite.prototype, 'toJ2000');

      setupSensorAndSat_();
      setSimTime_(SIM_TIME);
      frame_();

      expect(satSpy).toHaveBeenCalled();
      for (const call of satSpy.mock.calls) {
        expect((call[0] as Date).getTime()).toBe(SIM_TIME.getTime());
      }
      expect(getEl('sat-ra')!.innerHTML).toMatch(/^\d+\.\d{4}°$/u);

      const raKey = getEl('sat-ra')!.parentElement!.querySelector('.sat-info-key')!;

      expect(raKey.textContent).toContain('J2000');
      expect(raKey.textContent).toContain('topo');
    });
  });

  describe('Next Pass cache', () => {
    const base: NextPassCache = { satId: 1, sensorName: 'COD', calcSimMs: 1_000_000_000, calcRealMs: 0, resultMs: 1_000_000_000 + 3600e3 };
    const now = (over: Partial<{ satId: number; sensorName: string; simNowMs: number; realNowMs: number; isInView: boolean }> = {}) => ({
      satId: 1,
      sensorName: 'COD',
      simNowMs: base.calcSimMs + 60e3,
      realNowMs: 10_000,
      isInView: false,
      ...over,
    });

    it('recalculates with no cache or a new object or sensor', () => {
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(null, now())).toBe(true);
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(base, now({ satId: 2 }))).toBe(true);
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(base, now({ sensorName: 'FYL' }))).toBe(true);
    });

    it('keeps the cache while the sim clock runs toward the pass', () => {
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(base, now())).toBe(false);
    });

    it('recalculates when the sim clock jumps backwards', () => {
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(base, now({ simNowMs: base.calcSimMs - 86400e3 }))).toBe(true);
    });

    it('recalculates once the pass is over', () => {
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(base, now({ simNowMs: base.resultMs! + 60e3, isInView: false }))).toBe(true);
    });

    it('keeps the pass start while the object is still in view, but refreshes after a long stay or a jump into a later pass', () => {
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(base, now({ simNowMs: base.resultMs! + 60e3, isInView: true }))).toBe(false);
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(base, now({ simNowMs: base.resultMs! + 2 * 3600e3, isInView: true }))).toBe(true);
    });

    it('throttles repeated searches in real time', () => {
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(base, now({ simNowMs: base.calcSimMs - 86400e3, realNowMs: 500 }))).toBe(false);
    });

    it('refreshes a no-pass answer once a day of the horizon is used up', () => {
      const noPass = { ...base, resultMs: null };

      expect(SatInfoBoxSensor.shouldRecalcNextPass_(noPass, now({ simNowMs: base.calcSimMs + 3600e3 }))).toBe(false);
      expect(SatInfoBoxSensor.shouldRecalcNextPass_(noPass, now({ simNowMs: base.calcSimMs + 2 * 86400e3 }))).toBe(true);
    });

    it('parses the UTC time nextpass returns', () => {
      expect(SatInfoBoxSensor.parseNextPassTime_('2026-10-17 04:42:58')).toBe(Date.UTC(2026, 9, 17, 4, 42, 58));
      expect(SatInfoBoxSensor.parseNextPassTime_('No Passes in 2 Days')).toBeNull();
    });

    it('recomputes Next Pass in the info box after the sim clock is moved back', () => {
      const plugin = new SatInfoBoxSensor();

      websiteInit(plugin);
      vi.spyOn(DetailedSensor.prototype, 'isRaeInFov').mockReturnValue(false);
      const nextpassSpy = vi.spyOn(SensorMath, 'nextpass').mockReturnValue('2026-10-17 05:27:45');
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 17, 4, 0));

      setupSensorAndSat_();
      // Selected while the sim clock is at the wall clock...
      setSimTime_(new Date(Date.UTC(2026, 9, 17, 4, 0)));
      frame_();
      expect(nextpassSpy).toHaveBeenCalledTimes(1);
      expect(getEl('sat-nextpass')!.innerHTML).toBe('2026-10-17 05:27:45 UTC');

      // ...same sim instant on the next frame: cached.
      frame_();
      expect(nextpassSpy).toHaveBeenCalledTimes(1);

      // ...then the user types an earlier UTC time into the clock.
      nextpassSpy.mockReturnValue('2026-10-15 07:10:00');
      nowSpy.mockReturnValue(Date.UTC(2026, 9, 17, 4, 0, 5));
      setSimTime_(new Date(Date.UTC(2026, 9, 15, 6, 39)));
      frame_();

      expect(nextpassSpy).toHaveBeenCalledTimes(2);
      expect(getEl('sat-nextpass')!.innerHTML).toBe('2026-10-15 07:10:00 UTC');
    });
  });

  describe('Vis Mag intrinsic magnitude', () => {
    it('uses the catalog vmag when present', () => {
      const sat = new Satellite({ ...defaultSat, vmag: 4.2 } as never);

      expect(SatInfoBoxSensor.intrinsicMagOverride_(sat)).toBeUndefined();
    });

    it('falls back to the same estimate the Object Data Apparent Mag uses instead of a flat 8', () => {
      const sat = new Satellite({ ...defaultSat, vmag: null } as never);

      vi.spyOn(stdMagEstimator, 'estimateStdMag').mockReturnValue(2.5);

      expect(SatInfoBoxSensor.intrinsicMagOverride_(sat)).toBe(2.5);
    });

    it('passes the estimate to calculateVisMag in the info box', () => {
      const plugin = new SatInfoBoxSensor();

      websiteInit(plugin);
      vi.spyOn(DetailedSensor.prototype, 'isRaeInFov').mockReturnValue(true);
      vi.spyOn(SensorMath, 'nextpass').mockReturnValue('No Passes in 2 Days');
      vi.spyOn(stdMagEstimator, 'estimateStdMag').mockReturnValue(2.5);
      const visMagSpy = vi.spyOn(SatMath, 'calculateVisMag').mockReturnValue(9.87);
      const prevVmag = defaultSat.vmag;

      defaultSat.vmag = null as never;
      try {
        setupSensorAndSat_();
        setSimTime_(SIM_TIME);
        frame_();
      } finally {
        defaultSat.vmag = prevVmag;
      }

      expect(visMagSpy).toHaveBeenCalled();
      expect(visMagSpy.mock.calls[0][4]).toBe(2.5);
      expect(getEl('sat-vmag')!.innerHTML).toBe('9.87');
    });
  });
});
