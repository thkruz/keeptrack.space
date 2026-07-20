import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { createDefaultOnboardingState, type OnboardingState } from '@app/plugins/onboarding/onboarding-state';
import { areAllAvailableChaptersDone, buildHubStep, countDoneChapters, getAvailableChapters, getRecommendedChapterId, POWER_CHAPTERS } from '@app/plugins/onboarding/power-hub';
import { isCatalogLoaded } from '@app/plugins/onboarding/tour-steps';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const renderHub = (state: OnboardingState, onChapterSelected = vi.fn()) => {
  const step = buildHubStep({ getState: () => state, onChapterSelected });
  const host = document.createElement('div');

  host.innerHTML = step.extraHtml ?? '';
  document.body.appendChild(host);
  step.onRender?.(host);

  return { step, host, onChapterSelected };
};

describe('power-hub', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
    KeepTrackPlugin.loginGateOpenModal = null;
    vi.restoreAllMocks();
  });

  it('defines six chapters in hub order', () => {
    expect(POWER_CHAPTERS.map((chapter) => chapter.id)).toEqual(['essentials', 'sensors', 'watchlist', 'time', 'analysis', 'visualization']);
  });

  it('recommends the persona-matched chapter (essentials without a persona)', () => {
    expect(getRecommendedChapterId('operator')).toBe('sensors');
    expect(getRecommendedChapterId('explorer')).toBe('watchlist');
    expect(getRecommendedChapterId('student')).toBe('visualization');
    expect(getRecommendedChapterId('developer')).toBe('analysis');
    expect(getRecommendedChapterId(null)).toBe('essentials');
  });

  it('tiers.power is done only when every available chapter is done', () => {
    const state = createDefaultOnboardingState();
    const available = getAvailableChapters();

    expect(available.length).toBeGreaterThan(0);
    expect(areAllAvailableChaptersDone(state)).toBe(false);

    for (const chapter of available.slice(0, -1)) {
      state.powerChapters[chapter.id].status = 'done';
    }
    expect(areAllAvailableChaptersDone(state)).toBe(false);

    state.powerChapters[available.at(-1)!.id].status = 'done';
    expect(areAllAvailableChaptersDone(state)).toBe(true);
    expect(countDoneChapters(state)).toBe(available.length);
  });

  it('skipped chapters do not count as done', () => {
    const state = createDefaultOnboardingState();

    for (const chapter of getAvailableChapters()) {
      state.powerChapters[chapter.id].status = 'skipped';
    }
    expect(areAllAvailableChaptersDone(state)).toBe(false);
  });

  it('renders one row per available chapter with status circles', () => {
    const state = createDefaultOnboardingState();

    state.powerChapters.essentials.status = 'done';
    state.powerChapters.time.status = 'in-progress';

    const { host } = renderHub(state);
    const rows = host.querySelectorAll('[data-chapter-id]');

    expect(rows.length).toBe(getAvailableChapters().length);
    expect(host.querySelector('[data-chapter-id="essentials"] .kt-hub-status-done')).not.toBeNull();
    expect(host.querySelector('[data-chapter-id="time"] .kt-hub-status-half')).not.toBeNull();
  });

  it('clicking a chapter row reports the chapter id', () => {
    const state = createDefaultOnboardingState();
    const { host, onChapterSelected } = renderHub(state);

    (host.querySelector('[data-chapter-id="time"]') as HTMLElement).click();
    expect(onChapterSelected).toHaveBeenCalledWith('time');
  });

  it('shows the recommended badge on the persona-matched chapter', () => {
    const state = createDefaultOnboardingState();

    state.persona = null;

    const { host } = renderHub(state);

    expect(host.querySelector('[data-chapter-id="essentials"] .kt-hub-badge')).not.toBeNull();
    expect(host.querySelector('[data-chapter-id="time"] .kt-hub-badge')).toBeNull();
  });

  it('disables catalog-dependent chapters when the catalog is absent', () => {
    const state = createDefaultOnboardingState();
    const { host, onChapterSelected } = renderHub(state);

    // needsCatalog chapters render disabled with a hint instead of hiding when
    // the catalog is missing; catalog-free chapters are always clickable.
    const analysisRow = host.querySelector('[data-chapter-id="analysis"]') as HTMLButtonElement;
    const timeRow = host.querySelector('[data-chapter-id="time"]') as HTMLButtonElement;

    expect(analysisRow.disabled).toBe(isCatalogLoaded() === false);
    expect(timeRow.disabled).toBe(false);

    if (analysisRow.disabled) {
      analysisRow.click();
      expect(onChapterSelected).not.toHaveBeenCalledWith('analysis');
    }
  });

  it('the hub card has a single Close button wired to Escape', () => {
    const { step } = renderHub(createDefaultOnboardingState());

    expect(step.buttons?.map((btn) => btn.id)).toEqual(['close']);
    expect(step.escButtonId).toBe('close');
  });
});
