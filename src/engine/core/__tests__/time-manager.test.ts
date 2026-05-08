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
