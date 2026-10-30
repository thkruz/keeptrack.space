import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { buildMissions, sortMissionsForPersona, wireMissionAutoChecks } from '@app/plugins/onboarding/checklist';
import { OnboardingPlugin } from '@app/plugins/onboarding/onboarding';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('OnboardingPlugin', () => {
  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
    setupStandardEnvironment();
  });

  afterEach(() => {
    document.getElementById('kt-tour-root')?.remove();
    vi.restoreAllMocks();
  });

  standardPluginSuite(OnboardingPlugin, 'OnboardingPlugin');
});

describe('OnboardingPlugin behavior', () => {
  let plugin: OnboardingPlugin;

  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
    setupStandardEnvironment();
    plugin = new OnboardingPlugin();
    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
  });

  afterEach(() => {
    document.getElementById('kt-tour-root')?.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('exposes commands, settings contribution, and help', () => {
    const commands = plugin.getCommandPaletteCommands();

    expect(commands.map((c) => c.id)).toEqual(['OnboardingPlugin.startTour', 'OnboardingPlugin.startPowerTour', 'OnboardingPlugin.openChecklist']);

    const contribution = plugin.getSettingsContribution();

    expect(contribution.sectionId).toBe('OnboardingPlugin');
    expect(contribution.controls.map((c) => c.type)).toEqual(['toggle', 'button']);
    expect(plugin.getHelpConfig().title.length).toBeGreaterThan(0);
  });

  it('the settings toggle inverts the isDisableOnboarding setting', () => {
    const toggle = plugin.getSettingsContribution().controls[0] as { get: () => boolean; set: (v: boolean) => void };

    // Assert through the control itself: the imported settingsManager instance
    // is not always the same object as the test-global one (realm trap).
    toggle.set(true);
    expect(toggle.get()).toBe(true);
    toggle.set(false);
    expect(toggle.get()).toBe(false);
    toggle.set(true);
    expect(toggle.get()).toBe(true);
  });

  it('places its drawer item in the About group', () => {
    expect(plugin.drawerGroupKey).toBe('about');
  });

  it('restoreCard un-dismisses the get-started card and persists it', () => {
    const state = (plugin as unknown as { state_: { isCardDismissed: boolean } }).state_;

    state.isCardDismissed = true;
    plugin.restoreCard();

    expect(state.isCardDismissed).toBe(false);
    expect(localStorage.getItem('v2-keepTrack-onboardingState')).toContain('"isCardDismissed":false');
  });

  it('restartTour shows the welcome card with persona chips', () => {
    plugin.restartTour();

    const root = document.getElementById('kt-tour-root');

    expect(root).not.toBeNull();
    expect(root?.querySelectorAll('.kt-tour-chip').length).toBe(4);
    expect(root?.querySelector('[data-tour-button="start"]')).not.toBeNull();
    expect(root?.querySelector('[data-tour-button="explore"]')).not.toBeNull();
  });

  it('explore-on-my-own persists skipped state', () => {
    plugin.restartTour();
    (document.querySelector('[data-tour-button="explore"]') as HTMLElement).click();

    expect(document.getElementById('kt-tour-root')).toBeNull();

    // Re-run gating: a skipped state must not resume or restart on its own
    const raw = localStorage.getItem('v2-keepTrack-onboardingState');

    expect(raw).toContain('"status":"skipped"');
  });

  it('selecting a persona chip persists it', () => {
    plugin.restartTour();
    (document.querySelector('[data-persona="operator"]') as HTMLElement).click();

    const raw = localStorage.getItem('v2-keepTrack-onboardingState');

    expect(raw).toContain('"persona":"operator"');
  });

  it('describes covered features after Next-only navigation without claiming satellite actions', () => {
    const internal = plugin as unknown as { startBasics_(): void; engine_: { next(): void; stop(): void }; track_(event: string, data?: unknown): void };
    const track = vi.spyOn(internal, 'track_');

    internal.startBasics_();
    for (let index = 0; index < 20 && !document.querySelector('[data-tour-button="power"]'); index++) {
      internal.engine_.next();
    }
    // Nothing was performed: no "Done" group, every task is listed under "Try next"
    expect(document.querySelector('.kt-tour-recap-done')).toBeNull();
    const todo = Array.from(document.querySelectorAll('.kt-tour-recap-todo li')).map((li) => li.textContent);

    expect(todo).toContain('Spin the globe');
    expect(todo).toContain('Speed up or slow down time');
    expect(document.querySelector('.kt-tour-recap-todo .kt-tour-recap-label')?.textContent).toBe('Try next');
    expect(track.mock.calls.some(([event]) => event === 'onboarding_step_covered')).toBe(true);
    expect(track.mock.calls.some(([event]) => event === 'onboarding_step_completed')).toBe(false);
    internal.engine_.stop();
  });

  it('checks off a basics task the user performed and keeps the rest under "Try next"', () => {
    vi.useFakeTimers();
    const internal = plugin as unknown as { startBasics_(): void; engine_: { next(): void; stop(): void; currentStep: { id: string } | null }; state_: { basicsDone: string[] } };

    internal.startBasics_();
    expect(internal.engine_.currentStep?.id).toBe('b1-globe');
    // The user really drags the globe (b1 advances on canvasMouseDown)
    EventBus.getInstance().emit(EventBusEvent.canvasMouseDown, new MouseEvent('mousedown', { button: 0 }));
    vi.advanceTimersByTime(400);
    expect(internal.state_.basicsDone).toEqual(['b1-globe']);
    expect(localStorage.getItem('v2-keepTrack-onboardingState')).toContain('"basicsDone":["b1-globe"]');

    for (let index = 0; index < 20 && !document.querySelector('[data-tour-button="power"]'); index++) {
      internal.engine_.next();
    }

    const done = Array.from(document.querySelectorAll('.kt-tour-recap-done li')).map((li) => li.textContent);
    const todo = Array.from(document.querySelectorAll('.kt-tour-recap-todo li')).map((li) => li.textContent);

    expect(done).toHaveLength(1);
    expect(done[0]).toContain('Spin the globe');
    expect(document.querySelector('.kt-tour-recap-done .kt-tour-recap-check')).not.toBeNull();
    expect(todo).not.toContain('Spin the globe');
    expect(todo).toContain('Speed up or slow down time');
    internal.engine_.stop();
  });

  it('a fresh basics run forgets the previous run performed tasks, a resume keeps them', () => {
    const internal = plugin as unknown as { startBasics_(resumeStepId?: string): void; engine_: { stop(): void }; state_: { basicsDone: string[] } };

    internal.state_.basicsDone = ['b1-globe'];
    internal.startBasics_('b6-time');
    expect(internal.state_.basicsDone).toEqual(['b1-globe']);
    internal.engine_.stop();
    internal.startBasics_();
    expect(internal.state_.basicsDone).toEqual([]);
    internal.engine_.stop();
  });

  it('startPowerTour opens the hub card with chapter rows', () => {
    plugin.startPowerTour(true);

    const root = document.getElementById('kt-tour-root');

    expect(root).not.toBeNull();
    expect(root?.querySelector('.kt-hub-rows')).not.toBeNull();
    expect(root?.querySelectorAll('[data-chapter-id]').length).toBeGreaterThan(0);
    expect(root?.querySelector('[data-tour-button="close"]')).not.toBeNull();
  });

  it('closing a standalone hub never enters the account stage', () => {
    plugin.startPowerTour(true);
    (document.querySelector('[data-tour-button="close"]') as HTMLElement).click();

    // No account card must appear for a standalone run
    expect(document.querySelector('[data-tour-button="create"]')).toBeNull();
    expect(document.getElementById('kt-tour-root')).toBeNull();
  });

  it('completing a chapter marks it done, checks the mission, and returns to the hub', () => {
    vi.useFakeTimers();
    plugin.startPowerTour(true);

    (document.querySelector('[data-chapter-id="essentials"]') as HTMLElement).click();

    // In the bare test DOM the essentials chapter collapses to its first step,
    // whose target is missing; the missing-target path advances and completes
    // the chapter, which returns to the hub.
    vi.advanceTimersByTime(2000);

    const raw = localStorage.getItem('v2-keepTrack-onboardingState') ?? '';

    expect(raw).toContain('"powerTour":true');
    expect(JSON.parse(raw).powerChapters.essentials.status).toBe('done');

    const root = document.getElementById('kt-tour-root');

    expect(root?.querySelector('.kt-hub-rows')).not.toBeNull();
    expect(root?.querySelector('[data-chapter-id="essentials"] .kt-hub-status-done')).not.toBeNull();
  });
});

describe('onboarding checklist', () => {
  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('orders the power tour mission first for every persona', () => {
    const missions = buildMissions(() => {
      // launch stub
    });

    for (const persona of ['explorer', 'student', 'operator', 'developer'] as const) {
      expect(sortMissionsForPersona(missions, persona)[0].id).toBe('powerTour');
    }
  });

  it('operator persona prioritizes the sensor mission over the watchlist', () => {
    const missions = buildMissions(() => {
      // launch stub
    });
    const ordered = sortMissionsForPersona(missions, 'operator').map((m) => m.id);

    expect(ordered.indexOf('selectSensor')).toBeLessThan(ordered.indexOf('watchlist3'));
  });

  it('auto-checks watchlist3 only at 3 or more entries', () => {
    const markDone = vi.fn();

    wireMissionAutoChecks(markDone);

    EventBus.getInstance().emit(EventBusEvent.onWatchlistUpdated, [{ id: 1, inView: false }]);
    expect(markDone).not.toHaveBeenCalledWith('watchlist3');

    EventBus.getInstance().emit(EventBusEvent.onWatchlistUpdated, [
      { id: 1, inView: false },
      { id: 2, inView: false },
      { id: 3, inView: false },
    ]);
    expect(markDone).toHaveBeenCalledWith('watchlist3');
  });

  it('auto-checks colorScheme on colorSchemeChanged', () => {
    const markDone = vi.fn();

    wireMissionAutoChecks(markDone);
    EventBus.getInstance().emit(EventBusEvent.colorSchemeChanged, {});
    expect(markDone).toHaveBeenCalledWith('colorScheme');
  });

  it('marks lookAngles only when the menu actually opened (not on requirement toasts)', () => {
    vi.useFakeTimers();

    const markDone = vi.fn();
    const stub = {
      id: 'LookAnglesPlugin',
      bottomIconElementName: 'look-angles-menu-icon',
      isMenuButtonActive: false,
    } as unknown as KeepTrackPlugin;

    PluginRegistry.addPlugin(stub);
    wireMissionAutoChecks(markDone);

    // Click while requirements are unmet: base handler bailed, menu never activated
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, 'look-angles-menu-icon');
    vi.runAllTimers();
    expect(markDone).not.toHaveBeenCalledWith('lookAngles');

    // Click that really opened the menu
    (stub as { isMenuButtonActive: boolean }).isMenuButtonActive = true;
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, 'look-angles-menu-icon');
    vi.runAllTimers();
    expect(markDone).toHaveBeenCalledWith('lookAngles');

    vi.useRealTimers();
  });
});

describe('onboarding account step gating', () => {
  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
    KeepTrackPlugin.loginGateOpenModal = null;
    document.getElementById('kt-tour-root')?.remove();
    document.body.classList.remove('user-logged-in');
    vi.restoreAllMocks();
  });

  it('is skipped in OSS builds (loginGateOpenModal is null)', () => {
    expect(KeepTrackPlugin.loginGateOpenModal).toBeNull();
  });

  const bootPlugin = (): OnboardingPlugin => {
    const plugin = new OnboardingPlugin();

    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    return plugin;
  };

  type Internal = {
    showBridge_(): void;
    onReady_(): void;
    state_: { status: string; stage: string | null; accountPrompt: string; completedAt: number | null };
  };

  /** Mirrors PluginDrawer.open(): toggles `open` on the drawer and its overlay. */
  const mountDrawer = () => {
    const drawerEl = document.createElement('div');
    const overlayEl = document.createElement('div');

    drawerEl.className = 'plugin-drawer';
    overlayEl.id = 'drawer-overlay';
    document.body.append(drawerEl, overlayEl);
    const pluginDrawer = {
      open: vi.fn(() => {
        drawerEl.classList.add('open');
        overlayEl.classList.add('open');
      }),
      close: vi.fn(() => {
        drawerEl.classList.remove('open');
        overlayEl.classList.remove('open');
      }),
    };

    vi.spyOn(ServiceLocator, 'getUiManager').mockReturnValue({ pluginDrawer, hideSideMenus: vi.fn(), toast: vi.fn() } as unknown as ReturnType<typeof ServiceLocator.getUiManager>);

    return { drawerEl, overlayEl };
  };

  const runNextVisit = (internal: Internal): void => {
    internal.onReady_();
    // afterSplash_ waits for the splash to hide when the test DOM has a loading screen
    EventBus.getInstance().emit(EventBusEvent.splashScreenHidden);
    vi.advanceTimersByTime(2000);
  };

  it('shows the account card at tour end; Maybe later finishes the tour and opens the drawer without overlay', () => {
    KeepTrackPlugin.loginGateOpenModal = vi.fn();
    const internal = bootPlugin() as unknown as Internal;
    const { drawerEl, overlayEl } = mountDrawer();

    internal.showBridge_();
    (document.querySelector('[data-tour-button="finish"]') as HTMLElement).click();

    expect(document.querySelector('[data-tour-button="create"]')).not.toBeNull();
    expect(internal.state_.stage).toBe('account');
    expect(drawerEl.classList.contains('open')).toBe(false);

    (document.querySelector('[data-tour-button="later"]') as HTMLElement).click();

    expect(document.getElementById('kt-tour-root')).toBeNull();
    expect(internal.state_.status).toBe('done');
    expect(internal.state_.accountPrompt).toBe('later');
    expect(drawerEl.classList.contains('open')).toBe(true);
    expect(overlayEl.classList.contains('open')).toBe(false);
    drawerEl.remove();
    overlayEl.remove();
  });

  it('signing in from the tour-end card means no second showing', () => {
    KeepTrackPlugin.loginGateOpenModal = vi.fn();
    const internal = bootPlugin() as unknown as Internal;

    internal.showBridge_();
    (document.querySelector('[data-tour-button="finish"]') as HTMLElement).click();
    (document.querySelector('[data-tour-button="create"]') as HTMLElement).click();
    // The card stays up under the login modal until the login lands
    expect(document.querySelector('[data-tour-button="create"]')).not.toBeNull();
    document.body.classList.add('user-logged-in');
    EventBus.getInstance().emit(EventBusEvent.userLogin, null);

    expect(document.getElementById('kt-tour-root')).toBeNull();
    expect(internal.state_.status).toBe('done');
    expect(internal.state_.accountPrompt).toBe('shown');
  });

  it('OSS builds (no login gate) never show the account card', () => {
    const internal = bootPlugin() as unknown as Internal;

    internal.showBridge_();
    (document.querySelector('[data-tour-button="finish"]') as HTMLElement).click();

    expect(document.getElementById('kt-tour-root')).toBeNull();
    expect(internal.state_.status).toBe('done');
    expect(internal.state_.accountPrompt).toBe('none');
  });

  it('a tour finished again after "Maybe later" does not show the card at tour end', () => {
    KeepTrackPlugin.loginGateOpenModal = vi.fn();
    const internal = bootPlugin() as unknown as Internal;

    internal.state_.accountPrompt = 'later';
    internal.showBridge_();
    (document.querySelector('[data-tour-button="finish"]') as HTMLElement).click();

    expect(document.getElementById('kt-tour-root')).toBeNull();
    expect(internal.state_.accountPrompt).toBe('later');
  });

  it('shows nothing on a visit after the second showing', () => {
    vi.useFakeTimers();
    KeepTrackPlugin.loginGateOpenModal = vi.fn();
    settingsManager.isDisableOnboarding = false;
    const internal = bootPlugin() as unknown as Internal;

    internal.state_.status = 'done';
    internal.state_.accountPrompt = 'shown';
    runNextVisit(internal);

    expect(document.getElementById('kt-tour-root')).toBeNull();
  });

  it('after "Maybe later" shows the card once more on the next visit; closing it is final', () => {
    vi.useFakeTimers();
    KeepTrackPlugin.loginGateOpenModal = vi.fn();
    settingsManager.isDisableOnboarding = false;
    const internal = bootPlugin() as unknown as Internal;

    internal.state_.status = 'done';
    internal.state_.completedAt = 1234;
    internal.state_.accountPrompt = 'later';
    internal.onReady_();
    // afterSplash_ waits for the splash to hide when the test DOM has a loading screen
    EventBus.getInstance().emit(EventBusEvent.splashScreenHidden);
    vi.advanceTimersByTime(2000);

    expect(document.querySelector('[data-tour-button="create"]')).not.toBeNull();
    expect(document.querySelector('[data-tour-button="start"]')).toBeNull();
    expect(internal.state_.accountPrompt).toBe('shown');

    (document.querySelector('[data-tour-button="later"]') as HTMLElement).click();

    expect(document.getElementById('kt-tour-root')).toBeNull();
    // Closing the deferred card does not re-finish the tour
    expect(internal.state_.status).toBe('done');
    expect(internal.state_.stage).toBeNull();
    expect(internal.state_.completedAt).toBe(1234);
    expect(localStorage.getItem('v2-keepTrack-onboardingState')).toContain('"accountPrompt":"shown"');
  });

  it('drops the deferred account card when the user signed in meanwhile', () => {
    vi.useFakeTimers();
    KeepTrackPlugin.loginGateOpenModal = vi.fn();
    settingsManager.isDisableOnboarding = false;
    document.body.classList.add('user-logged-in');
    const internal = bootPlugin() as unknown as Internal;

    internal.state_.status = 'done';
    internal.state_.accountPrompt = 'later';
    internal.onReady_();
    // afterSplash_ waits for the splash to hide when the test DOM has a loading screen
    EventBus.getInstance().emit(EventBusEvent.splashScreenHidden);
    vi.advanceTimersByTime(2000);

    expect(document.getElementById('kt-tour-root')).toBeNull();
    expect(internal.state_.accountPrompt).toBe('shown');
  });

  it('opens the login modal via the hook when available', () => {
    const openModal = vi.fn();

    KeepTrackPlugin.loginGateOpenModal = openModal;

    const plugin = new OnboardingPlugin();

    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    // Drive directly into the account stage via the private method
    (plugin as unknown as { showAccount_: () => void }).showAccount_();

    const createBtn = document.querySelector('[data-tour-button="create"]') as HTMLElement | null;

    expect(createBtn).not.toBeNull();
    createBtn?.click();
    expect(openModal).toHaveBeenCalled();
  });
});

describe('onboarding guided missions', () => {
  let plugin: OnboardingPlugin;
  const fakePlugins: KeepTrackPlugin[] = [];
  const addFakePlugin = (id: string, bottomIconElementName: string, isLoginRequired: boolean) => {
    const fake = { id, bottomIconElementName, isLoginRequired } as unknown as KeepTrackPlugin;

    PluginRegistry.plugins.push(fake);
    fakePlugins.push(fake);
  };
  const launch = (missionId: string) => (plugin as unknown as { launchMission_: (id: string) => void }).launchMission_(missionId);
  const tourTitle = () => document.getElementById('kt-tour-title')?.textContent ?? null;

  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
    setupStandardEnvironment();
    plugin = new OnboardingPlugin();
    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
  });

  afterEach(() => {
    for (const fake of fakePlugins.splice(0)) {
      PluginRegistry.plugins.splice(PluginRegistry.plugins.indexOf(fake), 1);
    }
    KeepTrackPlugin.loginGateOpenModal = null;
    document.getElementById('kt-tour-root')?.remove();
    document.body.classList.remove('user-logged-in');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('every mission except the power tour reuses guided chapter steps', () => {
    const missions = buildMissions(() => {
      // launch stub
    });
    const stepIds = (id: string) =>
      missions
        .find((m) => m.id === id)
        ?.buildSteps?.(null)
        .map((step) => step.id);

    expect(stepIds('watchlist3')).toEqual(['w1-pick-target', 'w2-add-watchlist', 'm-watchlist-add-more']);
    expect(stepIds('selectSensor')).toEqual(['s1-sensor-list', 's2-select-sensor', 's3-coverage']);
    expect(stepIds('lookAngles')).toEqual(['w1-pick-target', 'w4-look-angles']);
    expect(stepIds('colorScheme')).toEqual(['v1-color-schemes']);
  });

  it('a login-gated mission shows a sign-in card instead of opening the locked menu', () => {
    const openModal = vi.fn();
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

    KeepTrackPlugin.loginGateOpenModal = openModal;
    addFakePlugin('WatchlistPlugin', 'menu-watchlist', true);

    launch('watchlist3');

    expect(tourTitle()).toBe('Sign in to continue');
    expect(emitSpy).not.toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, 'menu-watchlist');

    (document.querySelector('[data-tour-button="create"]') as HTMLElement).click();
    expect(openModal).toHaveBeenCalled();
    // The card stays up behind the login modal
    expect(tourTitle()).toBe('Sign in to continue');
  });

  it('signing in from the mission card continues into the mission', () => {
    vi.useFakeTimers();
    KeepTrackPlugin.loginGateOpenModal = vi.fn();
    addFakePlugin('WatchlistPlugin', 'menu-watchlist', true);
    const launchSpy = vi.spyOn(plugin as unknown as { launchMission_: (id: string) => void }, 'launchMission_');

    launch('watchlist3');
    document.body.classList.add('user-logged-in');
    EventBus.getInstance().emit(EventBusEvent.userLogin, null);
    vi.runAllTimers();

    expect(launchSpy).toHaveBeenLastCalledWith('watchlist3');
    expect(tourTitle()).not.toBe('Sign in to continue');
  });

  it('"Maybe later" on the mission card closes it without resuming on a later sign-in', () => {
    vi.useFakeTimers();
    KeepTrackPlugin.loginGateOpenModal = vi.fn();
    addFakePlugin('WatchlistPlugin', 'menu-watchlist', true);

    launch('watchlist3');
    (document.querySelector('[data-tour-button="later"]') as HTMLElement).click();
    expect(tourTitle()).toBeNull();

    const launchSpy = vi.spyOn(plugin as unknown as { launchMission_: (id: string) => void }, 'launchMission_');

    EventBus.getInstance().emit(EventBusEvent.userLogin, null);
    vi.runAllTimers();
    expect(launchSpy).not.toHaveBeenCalled();
  });

  it('an unlocked mission starts a guided step instead of opening the menu directly', () => {
    addFakePlugin('ColorMenu', 'menu-color-scheme', false);

    launch('colorScheme');

    expect(tourTitle()).toBe('Color the sky');
  });
});
