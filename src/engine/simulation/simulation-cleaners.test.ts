import { SimulationCleaners } from '@app/engine/simulation/simulation-cleaners';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { vi } from 'vitest';

describe('SimulationCleaners', () => {
  beforeEach(() => {
    SimulationCleaners.reset();
  });

  it('registers, lists active cleaners with counts and skips empty ones', () => {
    SimulationCleaners.register({ id: 'a', label: 'A', count: () => 2, clear: vi.fn() });
    SimulationCleaners.register({ id: 'b', label: () => 'B', count: () => 0, clear: vi.fn() });

    expect(SimulationCleaners.has('a')).toBe(true);
    expect(SimulationCleaners.getActive()).toEqual([{ id: 'a', label: 'A', count: 2 }]);
    expect(SimulationCleaners.totalCount()).toBe(2);
  });

  it('replaces a cleaner registered under the same id', () => {
    SimulationCleaners.register({ id: 'a', label: 'old', count: () => 1, clear: vi.fn() });
    SimulationCleaners.register({ id: 'a', label: 'new', count: () => 3, clear: vi.fn() });

    expect(SimulationCleaners.getActive()).toEqual([{ id: 'a', label: 'new', count: 3 }]);
  });

  it('unregisters a cleaner', () => {
    SimulationCleaners.register({ id: 'a', label: 'A', count: () => 1, clear: vi.fn() });
    SimulationCleaners.unregister('a');

    expect(SimulationCleaners.has('a')).toBe(false);
    expect(SimulationCleaners.totalCount()).toBe(0);
  });

  it('clearAll runs only non-empty cleaners, in order, and reports what was cleared', () => {
    const calls: string[] = [];

    SimulationCleaners.register({ id: 'late', label: 'Late', order: 90, count: () => 1, clear: () => calls.push('late') });
    SimulationCleaners.register({ id: 'early', label: 'Early', order: 5, count: () => 4, clear: () => calls.push('early') });
    SimulationCleaners.register({ id: 'empty', label: 'Empty', order: 1, count: () => 0, clear: () => calls.push('empty') });

    const result = SimulationCleaners.clearAll();

    expect(calls).toEqual(['early', 'late']);
    expect(result).toEqual([
      { id: 'early', label: 'Early', count: 4 },
      { id: 'late', label: 'Late', count: 1 },
    ]);
  });

  it('keeps going when one cleaner throws', () => {
    const second = vi.fn();
    const errorSpy = vi.spyOn(errorManagerInstance, 'error').mockImplementation(() => undefined);

    SimulationCleaners.register({
      id: 'bad',
      label: 'Bad',
      order: 1,
      count: () => 1,
      clear: () => {
        throw new Error('boom');
      },
    });
    SimulationCleaners.register({ id: 'good', label: 'Good', order: 2, count: () => 1, clear: second });

    const result = SimulationCleaners.clearAll();

    expect(second).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(result.map((r) => r.id)).toEqual(['good']);
  });

  it('treats a throwing count() as zero', () => {
    SimulationCleaners.register({
      id: 'bad',
      label: 'Bad',
      count: () => {
        throw new Error('boom');
      },
      clear: vi.fn(),
    });

    expect(SimulationCleaners.totalCount()).toBe(0);
  });
});
