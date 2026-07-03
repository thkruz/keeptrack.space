import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { TourEngine, type TourStep } from '@app/plugins/onboarding/tour-engine';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const TEXTS = {
  next: 'Next',
  back: 'Back',
  skip: 'Skip',
  skipConfirm: 'Sure?',
  skipYes: 'Yes',
  skipNo: 'No',
  stepLabel: '{current} of {total}',
  stepDone: 'Done. Take a look.',
};

const coachmark = (id: string, overrides: Partial<TourStep> = {}): TourStep => ({
  id,
  kind: 'coachmark',
  title: `title-${id}`,
  body: `body-${id}`,
  target: () => document.getElementById('tour-target'),
  ...overrides,
});

describe('TourEngine', () => {
  let onFinish: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupStandardEnvironment();
    document.body.innerHTML = '<div id="tour-target"></div>';
    onFinish = vi.fn();
  });

  afterEach(() => {
    document.getElementById('kt-tour-root')?.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders the first step and advances with next()', () => {
    const engine = new TourEngine({
      steps: [coachmark('one'), coachmark('two')],
      texts: TEXTS,
      onFinish,
    });

    engine.start();
    expect(engine.currentStep?.id).toBe('one');
    expect(document.querySelector('.kt-tour-popover-title')?.textContent).toBe('title-one');

    engine.next();
    expect(engine.currentStep?.id).toBe('two');

    engine.next();
    expect(onFinish).toHaveBeenCalledWith('completed', 'two');
    expect(document.getElementById('kt-tour-root')).toBeNull();
    engine.stop();
  });

  it('filters out unavailable steps at start', () => {
    const engine = new TourEngine({
      steps: [
        coachmark('one', { isAvailable: () => false }),
        coachmark('two'),
      ],
      texts: TEXTS,
      onFinish,
    });

    engine.start();
    expect(engine.currentStep?.id).toBe('two');
    engine.stop();
  });

  it('finishes immediately when no steps are available', () => {
    const engine = new TourEngine({
      steps: [coachmark('one', { isAvailable: () => false })],
      texts: TEXTS,
      onFinish,
    });

    engine.start();
    expect(onFinish).toHaveBeenCalledWith('completed', null);
  });

  it('resumes at a given step id', () => {
    const engine = new TourEngine({
      steps: [coachmark('one'), coachmark('two'), coachmark('three')],
      texts: TEXTS,
      onFinish,
    });

    engine.start('two');
    expect(engine.currentStep?.id).toBe('two');
    engine.stop();
  });

  it('advances when the advanceOn event fires and the predicate passes', () => {
    vi.useFakeTimers();

    const engine = new TourEngine({
      steps: [
        coachmark('one', {
          advanceOn: {
            event: EventBusEvent.searchUpdated,
            predicate: (...args: unknown[]) => (args[1] as number) > 0,
          },
        }),
        coachmark('two'),
      ],
      texts: TEXTS,
      onFinish,
    });

    engine.start();

    EventBus.getInstance().emit(EventBusEvent.searchUpdated, 'iss', 0, 100);
    vi.advanceTimersByTime(400);
    expect(engine.currentStep?.id).toBe('one');

    EventBus.getInstance().emit(EventBusEvent.searchUpdated, 'iss', 3, 100);
    vi.advanceTimersByTime(400);
    expect(engine.currentStep?.id).toBe('two');
    engine.stop();
  });

  it('reports skipped with the step id it was skipped on', () => {
    const engine = new TourEngine({
      steps: [coachmark('one'), coachmark('two')],
      texts: TEXTS,
      onFinish,
    });

    engine.start();
    engine.skipTour();
    expect(onFinish).toHaveBeenCalledWith('skipped', 'one');
  });

  it('routes custom card buttons through onCustomButton', () => {
    const onCustomButton = vi.fn();
    const engine = new TourEngine({
      steps: [
        {
          id: 'card',
          kind: 'card',
          title: 't',
          body: 'b',
          buttons: [
            { id: 'go', label: 'Go', isPrimary: true },
            { id: 'nope', label: 'Nope' },
          ],
        },
      ],
      texts: TEXTS,
      onFinish,
      onCustomButton,
    });

    engine.start();
    (document.querySelector('[data-tour-button="go"]') as HTMLElement).click();
    expect(onCustomButton).toHaveBeenCalledWith('card', 'go');
    engine.stop();
  });

  it('Escape triggers the escButtonId on card steps', () => {
    const onCustomButton = vi.fn();
    const engine = new TourEngine({
      steps: [
        {
          id: 'card',
          kind: 'card',
          title: 't',
          body: 'b',
          buttons: [{ id: 'go', label: 'Go' }, { id: 'close', label: 'Close' }],
          escButtonId: 'close',
        },
      ],
      texts: TEXTS,
      onFinish,
      onCustomButton,
    });

    engine.start();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onCustomButton).toHaveBeenCalledWith('card', 'close');
    engine.stop();
  });

  it('unregisters advanceOn listeners between steps', () => {
    vi.useFakeTimers();

    const engine = new TourEngine({
      steps: [
        coachmark('one', { advanceOn: { event: EventBusEvent.propRateChanged } }),
        coachmark('two'),
      ],
      texts: TEXTS,
      onFinish,
    });

    engine.start();
    EventBus.getInstance().emit(EventBusEvent.propRateChanged, 2);
    vi.advanceTimersByTime(400);
    expect(engine.currentStep?.id).toBe('two');

    // A second emit must not advance again (listener was removed on exit)
    EventBus.getInstance().emit(EventBusEvent.propRateChanged, 4);
    vi.advanceTimersByTime(400);
    expect(engine.currentStep?.id).toBe('two');
    expect(onFinish).not.toHaveBeenCalled();
    engine.stop();
  });

  it('blocks advancement when the post-settle verify fails (menu-open pattern)', () => {
    vi.useFakeTimers();

    let isMenuOpen = false;
    const engine = new TourEngine({
      steps: [
        coachmark('one', {
          advanceOn: {
            event: EventBusEvent.bottomMenuClick,
            predicate: (...args: unknown[]) => args[0] === 'my-menu-icon',
            verify: () => isMenuOpen,
          },
        }),
        coachmark('two'),
      ],
      texts: TEXTS,
      onFinish,
    });

    engine.start();

    // Click while requirements were unmet: the menu never activated
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, 'my-menu-icon');
    vi.advanceTimersByTime(400);
    expect(engine.currentStep?.id).toBe('one');

    // Click that really opened the menu
    isMenuOpen = true;
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, 'my-menu-icon');
    vi.advanceTimersByTime(400);
    expect(engine.currentStep?.id).toBe('two');
    engine.stop();
  });

  it('dwells on a completed task step so the user can see the result', () => {
    vi.useFakeTimers();

    const engine = new TourEngine({
      steps: [
        coachmark('one', {
          advanceOn: { event: EventBusEvent.propRateChanged, dwellMs: 2_000 },
        }),
        coachmark('two'),
      ],
      texts: TEXTS,
      onFinish,
    });

    engine.start();
    EventBus.getInstance().emit(EventBusEvent.propRateChanged, 2);

    // After the settle delay the step is still up, dwelling: shade lifted
    // (kt-tour-dwell), done note shown, not yet advanced
    vi.advanceTimersByTime(400);
    expect(engine.currentStep?.id).toBe('one');
    expect(document.getElementById('kt-tour-root')?.classList.contains('kt-tour-dwell')).toBe(true);
    expect(document.querySelector('.kt-tour-done-note')?.textContent).toContain('Done');

    // A repeat event during the dwell must not stack another advance
    EventBus.getInstance().emit(EventBusEvent.propRateChanged, 4);

    // After the dwell the tour advances and the dwell state is cleared
    vi.advanceTimersByTime(2_100);
    expect(engine.currentStep?.id).toBe('two');
    expect(document.getElementById('kt-tour-root')?.classList.contains('kt-tour-dwell')).toBe(false);
    expect(document.querySelector('.kt-tour-done-note')).toBeNull();
    engine.stop();
  });

  it('Next during the dwell advances immediately', () => {
    vi.useFakeTimers();

    const engine = new TourEngine({
      steps: [
        coachmark('one', {
          advanceOn: { event: EventBusEvent.propRateChanged, dwellMs: 5_000 },
        }),
        coachmark('two'),
      ],
      texts: TEXTS,
      onFinish,
    });

    engine.start();
    EventBus.getInstance().emit(EventBusEvent.propRateChanged, 2);
    vi.advanceTimersByTime(400);
    expect(engine.currentStep?.id).toBe('one');

    (document.querySelector('[data-tour-action="next"]') as HTMLElement).click();
    expect(engine.currentStep?.id).toBe('two');
    expect(document.getElementById('kt-tour-root')?.classList.contains('kt-tour-dwell')).toBe(false);
    engine.stop();
  });

  it('reveals a hint-deferred action button after timeoutHintMs', () => {
    vi.useFakeTimers();

    const engine = new TourEngine({
      steps: [
        coachmark('one', {
          advanceOn: { event: EventBusEvent.propRateChanged, timeoutHintMs: 15_000 },
          actionButton: { label: 'Do it for me', action: vi.fn() },
        }),
      ],
      texts: TEXTS,
      onFinish,
    });

    engine.start();

    const actionBtn = document.querySelector('[data-tour-action="do-it"]');

    expect(actionBtn?.classList.contains('start-hidden')).toBe(true);

    vi.advanceTimersByTime(15_100);
    expect(actionBtn?.classList.contains('start-hidden')).toBe(false);
    expect(actionBtn?.classList.contains('kt-tour-btn-hint-pulse')).toBe(true);
    engine.stop();
  });

  it('renders an immediate action button when no hint timeout is set', () => {
    const engine = new TourEngine({
      steps: [
        coachmark('one', {
          actionButton: { label: 'Do it for me', action: vi.fn() },
        }),
      ],
      texts: TEXTS,
      onFinish,
    });

    engine.start();

    const actionBtn = document.querySelector('[data-tour-action="do-it"]');

    expect(actionBtn?.classList.contains('start-hidden')).toBe(false);
    engine.stop();
  });
});
