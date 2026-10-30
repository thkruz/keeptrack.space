import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';

export type OnboardingPersona = 'explorer' | 'student' | 'operator' | 'developer';

export type TierStatus = 'not-started' | 'in-progress' | 'done' | 'skipped' | 'declined';

export type OnboardingStage = 'welcome' | 'basics' | 'bridge' | 'power' | 'account' | 'finish';

/** The six power-tour chapters, in hub display order. */
export const CHAPTER_IDS = ['essentials', 'sensors', 'watchlist', 'time', 'analysis', 'visualization'] as const;

export type ChapterId = (typeof CHAPTER_IDS)[number];

/**
 * Create-account card lifecycle (anonymous Pro only): 'none' = not offered
 * yet (offered at tour end); 'later' = "Maybe later" at tour end, offered once
 * more at the start of the next visit; 'shown' = done for good (second
 * showing happened, or the user signed up / in).
 */
export type AccountPromptStatus = 'none' | 'later' | 'shown';

export type ChapterStatus = 'not-started' | 'in-progress' | 'done' | 'skipped';

export interface ChapterProgress {
  status: ChapterStatus;
  /** Resume point within the chapter (a TourStep id). */
  stepId: string | null;
  completedAt: number | null;
}

export interface OnboardingState {
  schemaVersion: 2;
  status: 'not-started' | 'in-progress' | 'done' | 'skipped';
  stage: OnboardingStage | null;
  stepId: string | null;
  persona: OnboardingPersona | null;
  tiers: {
    basics: TierStatus;
    power: TierStatus;
  };
  /** Per-chapter power-tour progress (v2 chapter hub). */
  powerChapters: Record<ChapterId, ChapterProgress>;
  /**
   * Basics task steps the user performed themselves (step ids). Pressing Next
   * or "Do it for me" does not count; the bridge recap checks these off and
   * lists the rest as "try next".
   */
  basicsDone: string[];
  accountPrompt: AccountPromptStatus;
  /** Mission id -> completed */
  checklist: Record<string, boolean>;
  isCardDismissed: boolean;
  updatedAt: number;
  completedAt: number | null;
}

/** Partial in-progress state older than this restarts from the welcome card. */
export const RESUME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const createDefaultChapterProgress = (): ChapterProgress => ({
  status: 'not-started',
  stepId: null,
  completedAt: null,
});

export const createDefaultPowerChapters = (): Record<ChapterId, ChapterProgress> => {
  const chapters = {} as Record<ChapterId, ChapterProgress>;

  for (const id of CHAPTER_IDS) {
    chapters[id] = createDefaultChapterProgress();
  }

  return chapters;
};

export const createDefaultOnboardingState = (): OnboardingState => ({
  schemaVersion: 2,
  status: 'not-started',
  stage: null,
  stepId: null,
  persona: null,
  tiers: {
    basics: 'not-started',
    power: 'not-started',
  },
  powerChapters: createDefaultPowerChapters(),
  basicsDone: [],
  accountPrompt: 'none',
  checklist: {},
  isCardDismissed: false,
  updatedAt: 0,
  completedAt: null,
});

/** v1 shape (single linear power tour, no chapters). */
interface OnboardingStateV1 extends Omit<OnboardingState, 'schemaVersion' | 'powerChapters'> {
  schemaVersion: 1;
}

/**
 * v1 -> v2: the old linear power tour becomes Chapter 0 (Drawer Essentials).
 * A finished v1 power tour marks that chapter done; everything else starts
 * fresh. `tiers.power` drops back to `in-progress` because under v2 semantics
 * it is only `done` when every available chapter is done.
 */
const migrateV1ToV2 = (v1: Partial<OnboardingStateV1>): OnboardingState => {
  const state: OnboardingState = {
    ...createDefaultOnboardingState(),
    ...v1,
    schemaVersion: 2,
    tiers: {
      ...createDefaultOnboardingState().tiers,
      ...v1.tiers,
    },
    checklist: v1.checklist ?? {},
    powerChapters: createDefaultPowerChapters(),
  };

  if (v1.tiers?.power === 'done') {
    state.powerChapters.essentials = {
      status: 'done',
      stepId: null,
      completedAt: v1.completedAt ?? v1.updatedAt ?? Date.now(),
    };
    state.tiers.power = 'in-progress';
  }

  // A v1 run parked mid power tour: its linear step ids no longer exist, so
  // resume lands on the hub rather than inside a chapter.
  if (state.stage === 'power') {
    state.stepId = null;
  }

  return state;
};

/** Fills any missing chapter records (e.g. new chapters added in an update). */
const normalizeChapters = (partial: Partial<Record<ChapterId, ChapterProgress>> | undefined): Record<ChapterId, ChapterProgress> => {
  const chapters = createDefaultPowerChapters();

  for (const id of CHAPTER_IDS) {
    const stored = partial?.[id];

    if (stored) {
      chapters[id] = {
        ...createDefaultChapterProgress(),
        ...stored,
      };
    }
  }

  return chapters;
};

/** Unknown values fall back to 'none'; 'due' (a short-lived dev build) meant "show next visit", now 'later'. */
const normalizeAccountPrompt = (value: unknown): AccountPromptStatus => {
  if (value === 'later' || value === 'due') {
    return 'later';
  }

  return value === 'shown' ? 'shown' : 'none';
};

/**
 * Loads the persisted onboarding state. Returns the default state when nothing
 * is stored, the blob is corrupt, or persistence is blocked. v1 blobs are
 * migrated to v2 (chapter hub) transparently.
 */
export const loadOnboardingState = (): OnboardingState => {
  const raw = PersistenceManager.getInstance().getItem(StorageKey.ONBOARDING_STATE);

  if (!raw) {
    return createDefaultOnboardingState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState> | Partial<OnboardingStateV1>;

    if (parsed.schemaVersion === 1) {
      return migrateV1ToV2(parsed);
    }

    if (parsed.schemaVersion !== 2) {
      return createDefaultOnboardingState();
    }

    return {
      ...createDefaultOnboardingState(),
      ...parsed,
      tiers: {
        ...createDefaultOnboardingState().tiers,
        ...parsed.tiers,
      },
      powerChapters: normalizeChapters(parsed.powerChapters),
      basicsDone: Array.isArray(parsed.basicsDone) ? parsed.basicsDone.filter((id) => typeof id === 'string') : [],
      accountPrompt: normalizeAccountPrompt(parsed.accountPrompt),
      checklist: parsed.checklist ?? {},
    };
  } catch {
    return createDefaultOnboardingState();
  }
};

export const saveOnboardingState = (state: OnboardingState): void => {
  state.updatedAt = Date.now();
  PersistenceManager.getInstance().saveItem(StorageKey.ONBOARDING_STATE, JSON.stringify(state));
};

/** True when a saved in-progress run is fresh enough to resume mid-tour. */
export const isResumable = (state: OnboardingState, now = Date.now()): boolean =>
  state.status === 'in-progress' && state.stage !== null && now - state.updatedAt <= RESUME_WINDOW_MS;
