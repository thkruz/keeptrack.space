import { describe, expect, it, beforeEach } from 'vitest';
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
