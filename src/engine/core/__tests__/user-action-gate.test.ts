import { isProContentAllowed, setProContentAllowed } from '@app/engine/core/pro-content-gate';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { UserActionGate, userActionGate } from '@app/engine/core/user-action-gate';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('UserActionGate', () => {
  it('allows everything when no interceptor is registered', () => {
    const gate = new UserActionGate();

    expect(gate.allowSelection(5)).toBe(true);
    expect(gate.allowTime({ rate: 2 })).toBe(true);
  });

  it('blocks when an interceptor returns false and passes the request through', () => {
    const gate = new UserActionGate();
    const seen: unknown[] = [];

    gate.intercept('selection', (r) => {
      seen.push(r);

      return false;
    });

    expect(gate.allowSelection(7)).toBe(false);
    expect(seen).toEqual([{ domain: 'selection', satId: 7 }]);
    // other domains are unaffected
    expect(gate.allowTime({ timeMs: 1 })).toBe(true);
  });

  it('allows when the interceptor returns true, and unregister restores default', () => {
    const gate = new UserActionGate();
    const off = gate.intercept('time', () => false);

    expect(gate.allowTime({ rate: 0 })).toBe(false);
    off();
    expect(gate.allowTime({ rate: 0 })).toBe(true);
    gate.intercept('time', () => true);
    expect(gate.allowTime({ rate: 0 })).toBe(true);
  });

  it('runs every interceptor even after one blocks, and a throwing one never blocks', () => {
    const gate = new UserActionGate();
    const second = vi.fn(() => true);

    gate.intercept('selection', () => false);
    gate.intercept('selection', () => {
      throw new Error('boom');
    });
    gate.intercept('selection', second);

    expect(gate.allowSelection(1)).toBe(false);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('a throwing interceptor alone does not block', () => {
    const gate = new UserActionGate();

    gate.intercept('time', () => {
      throw new Error('boom');
    });
    expect(gate.allowTime({ rate: 1 })).toBe(true);
  });

  it('clear removes interceptors', () => {
    const gate = new UserActionGate();

    gate.intercept('selection', () => false);
    gate.clear();
    expect(gate.allowSelection(1)).toBe(true);
  });
});

describe('user entry points consult the gate; programmatic calls do not', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });
  afterEach(() => {
    userActionGate.clear();
  });

  it('toggleTime is blocked and reported, direct rate and time changes are not gated', () => {
    const tm = ServiceLocator.getTimeManager();
    const requests: unknown[] = [];

    tm.changePropRate(1, false);
    userActionGate.intercept('time', (r) => {
      requests.push(r);

      return false;
    });

    tm.toggleTime();
    expect(tm.propRate).toBe(1);
    expect(requests).toEqual([{ domain: 'time', rate: 0 }]);

    // programmatic and engine-internal calls pass
    tm.changePropRate(5, false);
    expect(tm.propRate).toBe(5);
    tm.changeSimulationTime(Date.now() + 60_000);
    expect(requests).toHaveLength(1);
  });

  it('toggleTime works unchanged without interceptors', () => {
    const tm = ServiceLocator.getTimeManager();

    tm.changePropRate(1, false);
    tm.toggleTime();
    expect(tm.propRate).toBe(0);
  });
});

describe('pro content gate', () => {
  afterEach(() => setProContentAllowed(true));

  it('is allowed by default and can be switched off', () => {
    expect(isProContentAllowed()).toBe(true);
    setProContentAllowed(false);
    expect(isProContentAllowed()).toBe(false);
  });
});
