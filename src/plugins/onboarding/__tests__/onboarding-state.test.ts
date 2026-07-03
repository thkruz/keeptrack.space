import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import {
  CHAPTER_IDS,
  createDefaultOnboardingState,
  isResumable,
  loadOnboardingState,
  RESUME_WINDOW_MS,
  saveOnboardingState,
} from '@app/plugins/onboarding/onboarding-state';

describe('onboarding-state', () => {
  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
  });

  it('returns the default state when nothing is stored', () => {
    const state = loadOnboardingState();

    expect(state.schemaVersion).toBe(2);
    expect(state.status).toBe('not-started');
    expect(state.tiers).toEqual({ basics: 'not-started', power: 'not-started' });
    expect(state.checklist).toEqual({});
    expect(Object.keys(state.powerChapters)).toEqual([...CHAPTER_IDS]);
    for (const id of CHAPTER_IDS) {
      expect(state.powerChapters[id]).toEqual({ status: 'not-started', stepId: null, completedAt: null });
    }
  });

  it('round-trips through PersistenceManager', () => {
    const state = createDefaultOnboardingState();

    state.status = 'done';
    state.persona = 'operator';
    state.tiers.power = 'declined';
    state.checklist.watchlist3 = true;
    state.powerChapters.sensors = { status: 'done', stepId: null, completedAt: 123 };
    state.powerChapters.time = { status: 'in-progress', stepId: 't3-jump-to-moment', completedAt: null };
    saveOnboardingState(state);

    const loaded = loadOnboardingState();

    expect(loaded.status).toBe('done');
    expect(loaded.persona).toBe('operator');
    expect(loaded.tiers.power).toBe('declined');
    expect(loaded.checklist.watchlist3).toBe(true);
    expect(loaded.powerChapters.sensors.status).toBe('done');
    expect(loaded.powerChapters.time).toEqual({ status: 'in-progress', stepId: 't3-jump-to-moment', completedAt: null });
    expect(loaded.updatedAt).toBeGreaterThan(0);
  });

  it('falls back to defaults on a corrupt blob', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.ONBOARDING_STATE, 'not-json{');
    expect(loadOnboardingState().status).toBe('not-started');
  });

  it('falls back to defaults on an unknown schema version', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.ONBOARDING_STATE, JSON.stringify({ schemaVersion: 99, status: 'done' }));
    expect(loadOnboardingState().status).toBe('not-started');
  });

  describe('v1 -> v2 migration', () => {
    const v1Blob = (overrides: Record<string, unknown> = {}) => JSON.stringify({
      schemaVersion: 1,
      status: 'done',
      stage: null,
      stepId: null,
      persona: 'operator',
      tiers: { basics: 'done', power: 'not-started' },
      checklist: { watchlist3: true },
      isCardDismissed: false,
      updatedAt: 1_000_000,
      completedAt: 2_000_000,
      ...overrides,
    });

    it('marks Drawer Essentials done when the v1 power tour was done', () => {
      PersistenceManager.getInstance().saveItem(
        StorageKey.ONBOARDING_STATE,
        v1Blob({ tiers: { basics: 'done', power: 'done' } }),
      );

      const state = loadOnboardingState();

      expect(state.schemaVersion).toBe(2);
      expect(state.powerChapters.essentials.status).toBe('done');
      expect(state.powerChapters.essentials.completedAt).toBe(2_000_000);
      // Under v2 semantics power is only done when every chapter is done
      expect(state.tiers.power).toBe('in-progress');
      // Other chapters start fresh
      expect(state.powerChapters.sensors.status).toBe('not-started');
    });

    it('carries other v1 state over unchanged', () => {
      PersistenceManager.getInstance().saveItem(StorageKey.ONBOARDING_STATE, v1Blob());

      const state = loadOnboardingState();

      expect(state.status).toBe('done');
      expect(state.persona).toBe('operator');
      expect(state.tiers.basics).toBe('done');
      expect(state.tiers.power).toBe('not-started');
      expect(state.checklist.watchlist3).toBe(true);
      expect(state.powerChapters.essentials.status).toBe('not-started');
    });

    it('drops a mid-power-tour v1 step id (linear ids no longer exist)', () => {
      PersistenceManager.getInstance().saveItem(
        StorageKey.ONBOARDING_STATE,
        v1Blob({ status: 'in-progress', stage: 'power', stepId: 'p3-sensors', tiers: { basics: 'done', power: 'in-progress' } }),
      );

      const state = loadOnboardingState();

      expect(state.stage).toBe('power');
      expect(state.stepId).toBeNull();
    });
  });

  it('fills missing chapter records from a partial v2 blob', () => {
    const partial = createDefaultOnboardingState() as unknown as { powerChapters: Record<string, unknown> };

    partial.powerChapters = { sensors: { status: 'done', stepId: null, completedAt: 5 } };
    PersistenceManager.getInstance().saveItem(StorageKey.ONBOARDING_STATE, JSON.stringify(partial));

    const state = loadOnboardingState();

    expect(state.powerChapters.sensors.status).toBe('done');
    expect(state.powerChapters.watchlist).toEqual({ status: 'not-started', stepId: null, completedAt: null });
  });

  describe('isResumable', () => {
    it('resumes a fresh in-progress run', () => {
      const state = createDefaultOnboardingState();

      state.status = 'in-progress';
      state.stage = 'basics';
      state.updatedAt = 1_000_000;

      expect(isResumable(state, 1_000_000 + 1000)).toBe(true);
    });

    it('does not resume an in-progress run older than the window', () => {
      const state = createDefaultOnboardingState();

      state.status = 'in-progress';
      state.stage = 'basics';
      state.updatedAt = 1_000_000;

      expect(isResumable(state, 1_000_000 + RESUME_WINDOW_MS + 1)).toBe(false);
    });

    it('never resumes done or skipped runs', () => {
      const state = createDefaultOnboardingState();

      state.stage = 'basics';
      state.updatedAt = Date.now();

      state.status = 'done';
      expect(isResumable(state)).toBe(false);

      state.status = 'skipped';
      expect(isResumable(state)).toBe(false);
    });
  });
});
