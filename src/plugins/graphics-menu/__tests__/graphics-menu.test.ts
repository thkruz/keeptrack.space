import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { ISettingsContribution } from '@app/engine/plugins/core/plugin-capabilities';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { GraphicsMenuPlugin } from '@app/plugins/graphics-menu/graphics-menu';
import { GraticuleToggle } from '@app/plugins/graticule-toggle/graticule-toggle';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { settingsManager as moduleSettingsManager, SettingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/** A plugin that only contributes one settings section. */
class FakeContributor extends KeepTrackPlugin {
  readonly id = 'FakeGraphicsContributor';
  dependencies_ = [];
  menuMode: MenuMode[] = [MenuMode.ALL];
  value = false;

  constructor(private readonly target_: 'general' | 'graphics') {
    super();
  }

  getSettingsContribution(): ISettingsContribution {
    return {
      sectionId: 'fakeSection',
      sectionLabel: 'Fake Section',
      target: this.target_,
      controls: [
        {
          type: 'toggle',
          id: 'fakeFlag',
          label: 'Fake flag',
          get: () => this.value,
          set: (v: boolean) => {
            this.value = v;
          },
        },
      ],
    };
  }
}

const toggleEl = (sectionId: string, controlId: string): HTMLInputElement => getEl(`setting-${sectionId}-${controlId}`) as HTMLInputElement;

const flip = (el: HTMLInputElement, checked: boolean): void => {
  el.checked = checked;
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

/** Which selector pill is lit (the derived level, or 'custom'). */
const activeLevel = (): string | undefined => ['low', 'medium', 'high', 'ultra', 'custom'].find((level) => getEl(`gm-quality-${level}`)?.classList.contains('gm-preset-active'));

describe('GraphicsMenuPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(GraphicsMenuPlugin, 'GraphicsMenuPlugin');
  standardPluginMenuButtonTests(GraphicsMenuPlugin, 'GraphicsMenuPlugin');
});

describe('GraphicsMenuPlugin behaviour', () => {
  let plugin: GraphicsMenuPlugin;

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
    localStorage.clear();
    PersistenceManager.resetInstance();
    SettingsManager.armPersistence();
    plugin = new GraphicsMenuPlugin();
    websiteInit(plugin);
    /*
     * preserveSettings() serializes the module-level settingsManager, while
     * websiteInit installs a fresh global one. Point the global at the module
     * instance so a control write is what gets persisted, then re-render.
     */
    window.settingsManager = moduleSettingsManager;
    (global as unknown as { settingsManager: SettingsManager }).settingsManager = moduleSettingsManager;
    moduleSettingsManager.isBlackEarth = false;
    moduleSettingsManager.isDrawOrbitEclipse = true;
    moduleSettingsManager.isEarthAmbientLighting = true;
    plugin.syncOnLoad();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the quality selector above the Display and Orbits cards', () => {
    expect(getEl('gm-quality-low')).not.toBeNull();
    expect(getEl('gm-quality-custom')).not.toBeNull();
    expect(getEl('settings-section-graphics-display')).not.toBeNull();
    expect(getEl('settings-section-graphics-orbits')).not.toBeNull();
    expect(toggleEl('graphics-display', 'blackEarth')).not.toBeNull();
    expect(toggleEl('graphics-orbits', 'dimOrbitInEclipse')).not.toBeNull();
  });

  it('toggling Black Earth in the DOM flips the setting and the persisted value', () => {
    flip(toggleEl('graphics-display', 'blackEarth'), true);

    expect(moduleSettingsManager.isBlackEarth).toBe(true);
    expect(PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_DRAW_BLACK_EARTH)).toBe('true');
  });

  it('reset restores the defaults and re-renders exactly once', () => {
    moduleSettingsManager.isBlackEarth = true;
    moduleSettingsManager.isDrawOrbitEclipse = false;
    moduleSettingsManager.orbitEclipseAlpha = 0.9;
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

    (getEl('graphics-menu-reset-btn') as HTMLButtonElement).click();

    // Class defaults: GraphicsSettings.isBlackEarth = false, OrbitalSettings.isDrawOrbitEclipse = true,
    // OrbitalSettings.orbitEclipseAlpha = 0.35.
    expect(moduleSettingsManager.isBlackEarth).toBe(false);
    expect(moduleSettingsManager.isDrawOrbitEclipse).toBe(true);
    expect(moduleSettingsManager.orbitEclipseAlpha).toBe(0.35);
    expect(emitSpy.mock.calls.filter(([event]) => event === EventBusEvent.settingsMenuRefresh)).toHaveLength(1);
  });

  it('selecting a level drives quality-aware controls, leaves style toggles alone, and reads Custom after a manual change', () => {
    moduleSettingsManager.isBlackEarth = true;
    plugin.syncOnLoad();

    // Eclipse dimming has minLevel low, so it is on at every level. Turn it off by hand:
    // ambient=on, eclipse=off matches no level (each level needs both on) -> Custom.
    flip(toggleEl('graphics-orbits', 'dimOrbitInEclipse'), false);
    expect(moduleSettingsManager.isDrawOrbitEclipse).toBe(false);
    expect(activeLevel()).toBe('custom');

    (getEl('gm-quality-low') as HTMLButtonElement).click();

    expect(moduleSettingsManager.isDrawOrbitEclipse).toBe(true);
    // Black Earth has no quality rule: the selector must not touch it.
    expect(moduleSettingsManager.isBlackEarth).toBe(true);
    expect(moduleSettingsManager.graphicsQuality).toBe('low');
    // With only minLevel-low rules in the OSS set, every level matches; the highest wins.
    expect(activeLevel()).toBe('ultra');

    flip(toggleEl('graphics-orbits', 'dimOrbitInEclipse'), false);
    expect(activeLevel()).toBe('custom');

    (getEl('gm-quality-low') as HTMLButtonElement).click();
    expect(moduleSettingsManager.isDrawOrbitEclipse).toBe(true);
  });

  it('shows the auto-reduced note after a performance downgrade and clears it on a level pick', () => {
    const note = getEl('gm-quality-auto-note') as HTMLElement;

    expect(note.style.display).toBe('none');

    EventBus.getInstance().emit(EventBusEvent.performanceDowngrade, 'godrays');
    expect(note.style.display).toBe('');

    (getEl('gm-quality-medium') as HTMLButtonElement).click();
    expect(note.style.display).toBe('none');
  });

  it('filters rows by label text', () => {
    const filter = getEl('graphics-menu-filter') as HTMLInputElement;

    filter.value = 'graticule';
    filter.dispatchEvent(new Event('input'));

    expect((toggleEl('graphics-display', 'graticule').closest('.switch.row') as HTMLElement).style.display).toBe('');
    expect((toggleEl('graphics-display', 'blackEarth').closest('.switch.row') as HTMLElement).style.display).toBe('none');
    expect((getEl('settings-section-graphics-orbits') as HTMLElement).style.display).toBe('none');
  });

  it('clamps the eclipse dimming strength to its range', () => {
    const input = getEl('setting-graphics-orbits-orbitEclipseAlpha') as HTMLInputElement;

    input.value = '7';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(moduleSettingsManager.orbitEclipseAlpha).toBe(1);
  });

  it('mirrors flags another plugin changed onto the rendered checkboxes in place on saveSettings', () => {
    moduleSettingsManager.isDrawNightAsDay = false;
    moduleSettingsManager.isDrawGraticule = false;
    plugin.syncOnLoad();
    const night = toggleEl('graphics-display', 'nightAsDay');

    night.focus();
    moduleSettingsManager.isDrawNightAsDay = true;
    moduleSettingsManager.isDrawGraticule = true;
    EventBus.getInstance().emit(EventBusEvent.saveSettings);

    // Same element (no re-render), so focus is kept.
    expect(toggleEl('graphics-display', 'nightAsDay')).toBe(night);
    expect(document.activeElement).toBe(night);
    expect(night.checked).toBe(true);
    expect(toggleEl('graphics-display', 'graticule').checked).toBe(true);
  });

  it('follows the Night and Graticule toggles while open', () => {
    moduleSettingsManager.isDrawNightAsDay = false;
    moduleSettingsManager.isDrawGraticule = false;
    plugin.syncOnLoad();

    new NightToggle().on();
    new GraticuleToggle().setGraticule(true);

    expect(toggleEl('graphics-display', 'nightAsDay').checked).toBe(true);
    expect(toggleEl('graphics-display', 'graticule').checked).toBe(true);
    expect(PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_DRAW_NIGHT_AS_DAY)).toBe('true');
    expect(PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_DRAW_GRATICULE)).toBe('true');

    new NightToggle().off();
    expect(toggleEl('graphics-display', 'nightAsDay').checked).toBe(false);
  });

  it('re-syncs every control when the menu is opened', () => {
    moduleSettingsManager.isDrawNightAsDay = false;
    plugin.syncOnLoad();
    // A change that announced nothing (no saveSettings), e.g. while the menu was closed.
    moduleSettingsManager.isDrawNightAsDay = true;

    plugin.isMenuButtonActive = true;
    plugin.bottomIconCallback();

    expect(toggleEl('graphics-display', 'nightAsDay').checked).toBe(true);
  });
});

describe('GraphicsMenuPlugin contributions', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a target:graphics section appears in the Graphics menu and not in Settings', () => {
    PluginRegistry.addPlugin(new FakeContributor('graphics'));
    const graphics = new GraphicsMenuPlugin();
    const settings = new SettingsMenuPlugin();

    websiteInit(graphics);
    settings.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    expect(getEl('graphics-menu-sections')?.querySelector('#setting-fakeSection-fakeFlag')).not.toBeNull();
    expect(getEl('settings-plugin-sections')?.querySelector('#setting-fakeSection-fakeFlag')).toBeNull();
  });

  it('a general section stays out of the Graphics menu', () => {
    PluginRegistry.addPlugin(new FakeContributor('general'));
    const graphics = new GraphicsMenuPlugin();

    websiteInit(graphics);

    expect(getEl('graphics-menu-sections')?.querySelector('#setting-fakeSection-fakeFlag')).toBeNull();
  });
});
