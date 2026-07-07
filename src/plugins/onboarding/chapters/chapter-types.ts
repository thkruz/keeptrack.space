import type { ChapterId, OnboardingPersona } from '../onboarding-state';
import type { TourStep } from '../tour-engine';

export type { ChapterId };

/** One themed 5-8 step mini-tour listed in the Power Tour hub. */
export interface ChapterDefinition {
  id: ChapterId;
  /** Pre-translated (lazy) chapter title for the hub row. */
  title: () => string;
  /** Pre-translated (lazy) one-line description for the hub row. */
  description: () => string;
  /** Honest time estimate shown in the hub. */
  minutes: number;
  /**
   * Chapters whose core tasks need the catalog declare it; with the catalog
   * absent the hub shows them disabled with a hint instead of hiding them.
   */
  needsCatalog?: boolean;
  /** Filtered out of the hub entirely when false (e.g. plugin not loaded). */
  isAvailable?: () => boolean;
  /** Builds the chapter's steps. Steps keep individual isAvailable guards. */
  buildSteps: (persona: OnboardingPersona | null) => TourStep[];
}
