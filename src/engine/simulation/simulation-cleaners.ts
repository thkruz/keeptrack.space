import { errorManagerInstance } from '@app/engine/utils/errorManager';

/**
 * A named group of simulation state (missiles, maneuver clones, breakup debris, ...) that the
 * "Clear all simulations" command can remove. Plugins register one cleaner per kind of state.
 */
export interface SimulationCleaner {
  /** Stable id; registering the same id again replaces the earlier cleaner. */
  id: string;
  /** Display name for the confirmation list. A function so t7e() is read after localization loads. */
  label: string | (() => string);
  /** How many items this cleaner would remove right now. */
  count: () => number;
  /** Remove everything this cleaner owns. Must leave the catalog consistent. */
  clear: () => void;
  /** Run order, lowest first (default 50). */
  order?: number;
}

/** What one cleaner removed during {@link SimulationCleaners.clearAll}. */
export interface SimulationClearResult {
  id: string;
  label: string;
  count: number;
}

const DEFAULT_ORDER = 50;

export class SimulationCleaners {
  private static readonly cleaners_ = new Map<string, SimulationCleaner>();

  static register(cleaner: SimulationCleaner): void {
    SimulationCleaners.cleaners_.set(cleaner.id, cleaner);
  }

  static unregister(id: string): void {
    SimulationCleaners.cleaners_.delete(id);
  }

  static has(id: string): boolean {
    return SimulationCleaners.cleaners_.has(id);
  }

  /** Test helper: drop every registration. */
  static reset(): void {
    SimulationCleaners.cleaners_.clear();
  }

  static labelOf(cleaner: SimulationCleaner): string {
    return typeof cleaner.label === 'function' ? cleaner.label() : cleaner.label;
  }

  private static sorted_(): SimulationCleaner[] {
    return [...SimulationCleaners.cleaners_.values()].sort((a, b) => (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER));
  }

  private static safeCount_(cleaner: SimulationCleaner): number {
    try {
      return Math.max(0, cleaner.count());
    } catch (e) {
      errorManagerInstance.debug(`SimulationCleaners: count failed for ${cleaner.id}: ${String(e)}`);

      return 0;
    }
  }

  /** Cleaners that currently have something to remove, with their counts, in run order. */
  static getActive(): SimulationClearResult[] {
    const active: SimulationClearResult[] = [];

    for (const cleaner of SimulationCleaners.sorted_()) {
      const count = SimulationCleaners.safeCount_(cleaner);

      if (count > 0) {
        active.push({ id: cleaner.id, label: SimulationCleaners.labelOf(cleaner), count });
      }
    }

    return active;
  }

  static totalCount(): number {
    return SimulationCleaners.getActive().reduce((sum, c) => sum + c.count, 0);
  }

  /** Run every cleaner that has items. One failing cleaner does not stop the others. */
  static clearAll(): SimulationClearResult[] {
    const cleared: SimulationClearResult[] = [];

    for (const cleaner of SimulationCleaners.sorted_()) {
      const count = SimulationCleaners.safeCount_(cleaner);

      if (count === 0) {
        continue;
      }

      try {
        cleaner.clear();
        cleared.push({ id: cleaner.id, label: SimulationCleaners.labelOf(cleaner), count });
      } catch (e) {
        errorManagerInstance.error(e as Error, 'SimulationCleaners.clearAll', `Failed to clear ${cleaner.id}`);
      }
    }

    return cleared;
  }
}
