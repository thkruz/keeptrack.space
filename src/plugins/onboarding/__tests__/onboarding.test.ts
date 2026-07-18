import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { buildMissions, sortMissionsForPersona, wireMissionAutoChecks } from '@app/plugins/onboarding/checklist';
import { OnboardingPlugin } from '@app/plugins/onboarding/onboarding';
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
    KeepTrackPlugin.loginGateOpenModal = null;
    document.getElementById('kt-tour-root')?.remove();
    document.body.classList.remove('user-logged-in');
    vi.restoreAllMocks();
  });

  it('is skipped in OSS builds (loginGateOpenModal is null)', () => {
    expect(KeepTrackPlugin.loginGateOpenModal).toBeNull();
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
