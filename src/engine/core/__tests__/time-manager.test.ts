import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('TimeManager_changeStaticOffset_guards', () => {
  let tm: TimeManager;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setupStandardEnvironment();
    tm = ServiceLocator.getTimeManager();
    warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);
    emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');
    // Reset call history so prior tests / setup work don't pollute assertions.
    warnSpy.mockClear();
    emitSpy.mockClear();
  });

  it.each([NaN, Infinity, -Infinity])('rejects non-finite value %p without mutating state', (badValue) => {
    const epochBefore = tm.dynamicOffsetEpoch;
    const offsetBefore = tm.staticOffset;

    tm.changeStaticOffset(badValue);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('non-finite');
    expect(tm.dynamicOffsetEpoch).toBe(epochBefore);
    expect(tm.staticOffset).toBe(offsetBefore);
    expect(emitSpy).not.toHaveBeenCalledWith(EventBusEvent.staticOffsetChange, expect.anything());
  });

  it('accepts a finite value and emits staticOffsetChange', () => {
    tm.changeStaticOffset(5_000);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(tm.staticOffset).toBe(5_000);
    expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.staticOffsetChange, 5_000);
  });
});

describe('TimeManager_synchronize_guards', () => {
  let tm: TimeManager;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setupStandardEnvironment();
    tm = ServiceLocator.getTimeManager();
    warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);
    emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');
    warnSpy.mockClear();
    emitSpy.mockClear();
  });

  it('bails out when the simulation timestamp overflows the Date range', () => {
    tm.dynamicOffsetEpoch = Date.now();
    // Max valid ms from epoch is 8.64e15. 1e16 pushes the sum past that limit,
    // so `new Date(sum)` becomes an Invalid Date and `toISOString()` would throw.
    tm.staticOffset = 1e16;

    tm.synchronize();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('Invalid Date');
    expect(emitSpy).not.toHaveBeenCalledWith(EventBusEvent.updateDateTime, expect.anything());
  });

  it('emits updateDateTime with a valid Date in the normal case', () => {
    tm.dynamicOffsetEpoch = Date.now();
    tm.staticOffset = 0;

    tm.synchronize();

    expect(warnSpy).not.toHaveBeenCalled();
    const updateDateTimeCall = emitSpy.mock.calls.find((call) => call[0] === EventBusEvent.updateDateTime);

    expect(updateDateTimeCall).toBeDefined();
    const emittedDate = updateDateTimeCall![1] as Date;

    expect(emittedDate).toBeInstanceOf(Date);
    expect(Number.isNaN(emittedDate.getTime())).toBe(false);
  });
});

// Pure date arithmetic — no ServiceLocator/DOM needed, so a bare instance works.
describe('TimeManager pure date math', () => {
  const tm = new TimeManager();

  it.each([
    [2000, true], // divisible by 400
    [1900, false], // divisible by 100, not 400
    [2100, false],
    [2024, true], // divisible by 4
    [2023, false],
  ])('isLeapYear(%i) === %s', (year, expected) => {
    expect(TimeManager.isLeapYear(new Date(Date.UTC(year, 0, 1)))).toBe(expected);
  });

  it.each([
    ['Jan 1', Date.UTC(2022, 0, 1), 1],
    ['Feb 29 (leap)', Date.UTC(2020, 1, 29), 60],
    ['Mar 1 (non-leap)', Date.UTC(2021, 2, 1), 60],
    ['Dec 31 (leap)', Date.UTC(2020, 11, 31), 366],
  ])('getUTCDayOfYear %s === %i', (_label, ms, expected) => {
    expect(tm.getUTCDayOfYear(new Date(ms))).toBe(expected);
  });

  it('getUTCDateFromDayOfYear inverts getUTCDayOfYear (leap year)', () => {
    const date = tm.getUTCDateFromDayOfYear(2020, 60);

    expect(date.getUTCMonth()).toBe(1); // February
    expect(date.getUTCDate()).toBe(29);
  });

  it('getUTCDateFromDayOfYear maps DOY 60 to Mar 1 in a non-leap year', () => {
    const date = tm.getUTCDateFromDayOfYear(2021, 60);

    expect(date.getUTCMonth()).toBe(2); // March
    expect(date.getUTCDate()).toBe(1);
  });

  it('currentEpoch formats the TLE epoch (year + fractional day-of-year)', () => {
    const [year, doy] = TimeManager.currentEpoch(new Date('2022-01-01T00:00:00Z'));

    expect(year).toBe('22');
    expect(doy).toBe('001.00000000');
  });

  it('currentEpoch encodes the fractional time of day', () => {
    const [, doy] = TimeManager.currentEpoch(new Date('2022-07-02T12:00:00Z'));

    // Day 183 + 0.5 of a day.
    expect(parseFloat(doy)).toBeCloseTo(183.5, 4);
  });
});

describe('TimeManager simulation-time arithmetic', () => {
  let tm: TimeManager;

  beforeEach(() => {
    tm = new TimeManager();
  });

  it('assigns an explicit time directly', () => {
    const target = new Date('2030-05-05T00:00:00Z');

    expect(tm.calculateSimulationTime(target).getTime()).toBe(target.getTime());
  });

  it('uses epoch + staticOffset when paused (propRate 0)', () => {
    tm.propRate = 0;
    tm.dynamicOffsetEpoch = 1_000_000;
    tm.staticOffset = 50_000;

    expect(tm.calculateSimulationTime().getTime()).toBe(1_050_000);
  });

  it('applies propRate to the elapsed dynamic offset when running', () => {
    const now = Date.now(); // frozen by the global fake clock

    tm.propRate = 2;
    tm.dynamicOffsetEpoch = now - 100; // launched 100 ms (real) ago
    tm.staticOffset = 0;

    // simTime = epoch + offset + (now - epoch) * rate = (now-100) + 100*2 = now+100.
    expect(tm.calculateSimulationTime().getTime()).toBe(now + 100);
  });

  it('getOffsetTimeObj returns the simulation time shifted by the offset', () => {
    tm.simulationTimeObj = new Date('2022-01-01T00:00:00Z');

    expect(tm.getOffsetTimeObj(3_600_000).getTime()).toBe(new Date('2022-01-01T01:00:00Z').getTime());
  });

  it('getPropOffset returns 0 when no date is selected', () => {
    tm.selectedDate = null as unknown as Date;

    expect(tm.getPropOffset()).toBe(0);
  });

  it('getPropOffset returns the signed delta from now to the selected date', () => {
    tm.selectedDate = new Date(Date.now() + 3_600_000);

    expect(tm.getPropOffset()).toBe(3_600_000);
  });
});
