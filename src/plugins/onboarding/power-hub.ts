import { analysisChapter } from './chapters/chapter-analysis';
import { essentialsChapter } from './chapters/chapter-essentials';
import { sensorsChapter } from './chapters/chapter-sensors';
import { timeChapter } from './chapters/chapter-time';
import type { ChapterDefinition } from './chapters/chapter-types';
import { visualizationChapter } from './chapters/chapter-visualization';
import { watchlistChapter } from './chapters/chapter-watchlist';
import type { ChapterId, OnboardingPersona, OnboardingState } from './onboarding-state';
import { l } from './onboarding-t7e';
import type { TourStep } from './tour-engine';
import { isCatalogLoaded } from './tour-steps';

/** All chapters in hub display order. */
export const POWER_CHAPTERS: ChapterDefinition[] = [essentialsChapter, sensorsChapter, watchlistChapter, timeChapter, analysisChapter, visualizationChapter];

/** Personas pick the recommended chapter badge (replaces the retired P2 branch). */
const RECOMMENDED_CHAPTER: Record<OnboardingPersona, ChapterId> = {
  operator: 'sensors',
  explorer: 'watchlist',
  student: 'visualization',
  developer: 'analysis',
};

export const getRecommendedChapterId = (persona: OnboardingPersona | null): ChapterId => (persona ? RECOMMENDED_CHAPTER[persona] : 'essentials');

/** Chapters whose plugins are loaded in this build. */
export const getAvailableChapters = (): ChapterDefinition[] => POWER_CHAPTERS.filter((chapter) => chapter.isAvailable?.() !== false);

/** A chapter is runnable when its catalog requirement (if any) is met. */
export const isChapterRunnable = (chapter: ChapterDefinition): boolean => !chapter.needsCatalog || isCatalogLoaded();

/** `tiers.power` is done only when every available chapter is done. */
export const areAllAvailableChaptersDone = (state: OnboardingState): boolean => {
  const available = getAvailableChapters();

  return available.length > 0 && available.every((chapter) => state.powerChapters[chapter.id].status === 'done');
};

export const countDoneChapters = (state: OnboardingState): number => getAvailableChapters().filter((chapter) => state.powerChapters[chapter.id].status === 'done').length;

export interface PowerHubOptions {
  getState: () => OnboardingState;
  /** Invoked when a chapter row is clicked (start or resume). */
  onChapterSelected: (chapterId: ChapterId) => void;
}

const statusIconHtml = (state: OnboardingState, chapter: ChapterDefinition): string => {
  const status = state.powerChapters[chapter.id].status;

  if (status === 'done') {
    return '<span class="kt-hub-status kt-hub-status-done" aria-hidden="true">&#x2713;</span>';
  }
  if (status === 'in-progress' || status === 'skipped') {
    return '<span class="kt-hub-status kt-hub-status-half" aria-hidden="true"></span>';
  }

  return '<span class="kt-hub-status" aria-hidden="true"></span>';
};

const chapterRowHtml = (state: OnboardingState, chapter: ChapterDefinition, persona: OnboardingPersona | null): string => {
  const isRunnable = isChapterRunnable(chapter);
  const stepCount = chapter.buildSteps(persona).filter((step) => step.isAvailable?.() !== false).length;
  const recommendedHtml = getRecommendedChapterId(persona) === chapter.id ? `<span class="kt-hub-badge">${l('hub.recommended')}</span>` : '';
  const metaText = isRunnable
    ? `${l('hub.steps').replace('{count}', String(stepCount))} &middot; ${l('hub.minutes').replace('{minutes}', String(chapter.minutes))}`
    : l('hub.catalogMissing');
  const disabledCls = isRunnable ? '' : ' kt-hub-row-disabled';
  const disabledAttr = isRunnable ? '' : ' disabled';

  return (
    `<button type="button" class="kt-hub-row${disabledCls}" data-chapter-id="${chapter.id}"${disabledAttr}>${statusIconHtml(state, chapter)}<span class="kt-hub-row-text">` +
    `<span class="kt-hub-row-title">${chapter.title()}${recommendedHtml}</span>` +
    `<span class="kt-hub-row-meta">${metaText}</span>` +
    '</span>' +
    '<span class="kt-hub-chevron" aria-hidden="true">&#x203A;</span>' +
    '</button>'
  );
};

/**
 * The Power Tour hub: a centered card listing themed chapters, each a focused
 * hands-on mini-tour with its own progress and resume. Reuses the TourEngine
 * card step (extraHtml + onRender), no new engine surface.
 */
export const buildHubStep = (options: PowerHubOptions): TourStep => {
  const state = options.getState();
  const available = getAvailableChapters();
  const doneCount = countDoneChapters(state);
  const progressLabel = l('hub.progress').replace('{done}', String(doneCount)).replace('{total}', String(available.length));
  const rows = available.map((chapter) => chapterRowHtml(state, chapter, state.persona)).join('');
  const isAllDone = areAllAvailableChaptersDone(state);

  return {
    id: 'power-hub',
    kind: 'card',
    title: l('hub.title'),
    body: isAllDone ? l('hub.allDone') : l('hub.body'),
    extraHtml: `<div class="kt-hub-progress">${progressLabel}</div>` + `<div class="kt-hub-rows">${rows}</div>`,
    buttons: [{ id: 'close', label: l('hub.close'), isPrimary: true }],
    escButtonId: 'close',
    onRender: (popoverEl: HTMLElement) => {
      popoverEl.querySelectorAll('[data-chapter-id]:not([disabled])').forEach((el) => {
        el.addEventListener('click', () => {
          const chapterId = (el as HTMLElement).dataset.chapterId as ChapterId;

          options.onChapterSelected(chapterId);
        });
      });
    },
  };
};
