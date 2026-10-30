import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../event-bus';
import { EventBusEvent } from '../event-bus-events';

describe('EventBus.emitAsync', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = EventBus.getInstance();
    bus.unregisterAllEvents();
  });

  it('awaits async listeners before resolving', async () => {
    const calls: string[] = [];

    bus.on(EventBusEvent.beforeFilterTLEDatabase, async () => {
      await Promise.resolve();
      await Promise.resolve();
      calls.push('async-listener');
    });

    await bus.emitAsync(EventBusEvent.beforeFilterTLEDatabase);
    calls.push('after-await');

    expect(calls).toEqual(['async-listener', 'after-await']);
  });

  it('invokes sync listeners', async () => {
    const calls: string[] = [];

    bus.on(EventBusEvent.beforeFilterTLEDatabase, () => {
      calls.push('sync-listener');
    });

    await bus.emitAsync(EventBusEvent.beforeFilterTLEDatabase);

    expect(calls).toEqual(['sync-listener']);
  });

  it('schedules every listener even if one throws synchronously', async () => {
    const calls: string[] = [];

    bus.on(EventBusEvent.beforeFilterTLEDatabase, () => {
      calls.push('first');
      throw new Error('sync boom');
    });
    bus.on(EventBusEvent.beforeFilterTLEDatabase, () => {
      calls.push('second');
    });
    bus.on(EventBusEvent.beforeFilterTLEDatabase, async () => {
      await Promise.resolve();
      calls.push('third');
    });

    await expect(bus.emitAsync(EventBusEvent.beforeFilterTLEDatabase)).rejects.toThrow('sync boom');

    expect(calls).toContain('first');
    expect(calls).toContain('second');
    expect(calls).toContain('third');
  });

  it('rejects with the first rejection (fail-fast)', async () => {
    bus.on(EventBusEvent.beforeFilterTLEDatabase, () => Promise.reject(new Error('async boom')));

    await expect(bus.emitAsync(EventBusEvent.beforeFilterTLEDatabase)).rejects.toThrow('async boom');
  });

  it('passes arguments to listeners', async () => {
    const received: Date[] = [];

    bus.on(EventBusEvent.updateDateTime, (date: Date) => {
      received.push(date);
    });

    const stamp = new Date('2026-01-01T00:00:00Z');

    await bus.emitAsync(EventBusEvent.updateDateTime, stamp);

    expect(received).toEqual([stamp]);
  });

  it('handles events with no registered listeners', async () => {
    await expect(bus.emitAsync(EventBusEvent.beforeFilterTLEDatabase)).resolves.toBeUndefined();
  });
});

describe('EventBus.emit listener isolation', () => {
  let bus: EventBus;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    bus = EventBus.getInstance();
    bus.unregisterAllEvents();
    errorSpy = vi.spyOn(errorManagerInstance, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['0 args', EventBusEvent.updateLoop, [] as unknown[]],
    ['1 arg', EventBusEvent.bottomMenuClick, ['icon']],
    ['2+ args', EventBusEvent.rmbMenuActions, ['action', 5]],
  ])('a throwing listener does not skip later listeners (%s)', (_label, event, args) => {
    const calls: string[] = [];

    bus.on(event as EventBusEvent.updateLoop, () => {
      calls.push('first');
    });
    bus.on(event as EventBusEvent.updateLoop, () => {
      throw new Error('boom');
    });
    bus.on(event as EventBusEvent.updateLoop, () => {
      calls.push('third');
    });

    expect(() => (bus.emit as (e: EventBusEvent, ...a: unknown[]) => void)(event as EventBusEvent, ...args)).not.toThrow();
    expect(calls).toEqual(['first', 'third']);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][1])).toContain(String(event));
  });

  it('reports a listener that throws every frame only once', () => {
    bus.on(EventBusEvent.updateLoop, () => {
      throw new Error('per-frame');
    });

    for (let i = 0; i < 5; i++) {
      bus.emit(EventBusEvent.updateLoop);
    }

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('reports each throwing listener separately and wraps non-Error throws', () => {
    bus.on(EventBusEvent.updateLoop, () => {
      throw new Error('a');
    });
    bus.on(EventBusEvent.updateLoop, () => {
      throw 'b';
    });

    bus.emit(EventBusEvent.updateLoop);

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy.mock.calls[1][0]).toBeInstanceOf(Error);
    expect((errorSpy.mock.calls[1][0] as Error).message).toBe('b');
  });
});
