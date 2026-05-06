import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ErrorManager } from '@app/engine/utils/errorManager';

describe('ErrorManager.error', () => {
  let errorManager: ErrorManager;
  let captured: { err: Error; funcName: string }[];
  const listener = (err: Error, funcName: string): void => {
    captured.push({ err, funcName });
  };

  beforeEach(() => {
    errorManager = new ErrorManager();
    captured = [];
    EventBus.getInstance().on(EventBusEvent.error, listener);
    vi.spyOn(console, 'error').mockImplementation(() => { /* silence */ });
  });

  afterEach(() => {
    EventBus.getInstance().unregister(EventBusEvent.error, listener);
    vi.restoreAllMocks();
  });

  it('normalizes null into a real Error (no TypeError on .name access)', () => {
    expect(() => errorManager.error(null as unknown as Error, 'fn')).toThrow('Unknown error');
    expect(captured).toHaveLength(1);
    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toBe('Unknown error');
    expect(captured[0].funcName).toBe('fn');
  });

  it('normalizes undefined into a real Error', () => {
    expect(() => errorManager.error(undefined as unknown as Error, 'fn')).toThrow('Unknown error');
    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toBe('Unknown error');
  });

  it('wraps a string into Error(string)', () => {
    expect(() => errorManager.error('boom' as unknown as Error, 'fn')).toThrow('boom');
    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toBe('boom');
  });

  it('wraps a plain object via JSON.stringify', () => {
    expect(() => errorManager.error({ foo: 'bar' } as unknown as Error, 'fn')).toThrow(/foo/u);
    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toContain('foo');
    expect(captured[0].err.message).toContain('bar');
  });

  it('passes a real Error through by identity', () => {
    const original = new Error('original');

    expect(() => errorManager.error(original, 'fn')).toThrow(original);
    expect(captured[0].err).toBe(original);
  });

  it('emits an Error instance to the EventBus regardless of input', () => {
    expect(() => errorManager.error(null as unknown as Error, 'a')).toThrow();
    expect(() => errorManager.error('s' as unknown as Error, 'b')).toThrow();
    expect(() => errorManager.error({ k: 1 } as unknown as Error, 'c')).toThrow();
    for (const entry of captured) {
      expect(entry.err).toBeInstanceOf(Error);
      expect(typeof entry.err.message).toBe('string');
    }
  });
});
