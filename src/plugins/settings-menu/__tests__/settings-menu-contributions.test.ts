import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  ISettingsContribution,
  ISettingsContributor,
} from '@app/engine/plugins/core/plugin-capabilities';
import { KeepTrack } from '@app/keeptrack';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/**
 * Test double for any plugin scenario. With a contributionFn it implements
 * ISettingsContributor; without one it's just an ignored plain plugin.
 * Designing both flavours into one class keeps the file under the
 * max-classes-per-file lint cap.
 */
class TestPlugin extends KeepTrackPlugin implements Partial<ISettingsContributor> {
  readonly id: string;
  dependencies_ = [];
  menuMode: MenuMode[] = [MenuMode.ALL];

  getSettingsContribution?: () => ISettingsContribution;

  constructor(id: string, contributionFn?: () => ISettingsContribution) {
    super();
    this.id = id;
    if (contributionFn) {
      this.getSettingsContribution = contributionFn;
    }
  }
}

const makeToggleContribution = (sectionId: string, sectionLabel: string, order?: number, controlId = 'flag'): ISettingsContribution => ({
  sectionId,
  sectionLabel,
  order,
  controls: [{ type: 'toggle', id: controlId, label: `${sectionLabel} ${controlId}`, get: () => false, set: vi.fn() }],
});

const collectStatic = SettingsMenuPlugin as unknown as {
  collectPluginContributions_(): ISettingsContribution[];
  renderAllSections_(): void;
};

describe('SettingsMenuPlugin.collectPluginContributions_', () => {
  let settingsMenuPlugin: SettingsMenuPlugin;

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
    settingsMenuPlugin = new SettingsMenuPlugin();
    websiteInit(settingsMenuPlugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty list when no plugin implements the capability', () => {
    PluginRegistry.unregisterAllPlugins();
    PluginRegistry.addPlugin(new TestPlugin('PlainOnly'));

    expect(collectStatic.collectPluginContributions_()).toEqual([]);
  });

  it('includes only plugins that implement getSettingsContribution()', () => {
    PluginRegistry.unregisterAllPlugins();
    const contributor = new TestPlugin('Contrib', () => makeToggleContribution('Contrib', 'C'));

    PluginRegistry.addPlugin(new TestPlugin('Plain'));
    PluginRegistry.addPlugin(contributor);

    const result = collectStatic.collectPluginContributions_();

    expect(result).toHaveLength(1);
    expect(result[0].sectionId).toBe('Contrib');
  });

  it('sorts contributions by explicit ascending order', () => {
    PluginRegistry.unregisterAllPlugins();
    PluginRegistry.addPlugin(new TestPlugin('B', () => makeToggleContribution('B', 'B', 20)));
    PluginRegistry.addPlugin(new TestPlugin('A', () => makeToggleContribution('A', 'A', 10)));
    PluginRegistry.addPlugin(new TestPlugin('C', () => makeToggleContribution('C', 'C', 30)));

    const ids = collectStatic.collectPluginContributions_().map((c) => c.sectionId);

    expect(ids).toEqual(['A', 'B', 'C']);
  });

  it('uses manifest registration order as a tiebreaker when explicit order matches', () => {
    PluginRegistry.unregisterAllPlugins();
    PluginRegistry.addPlugin(new TestPlugin('first', () => makeToggleContribution('first', 'F', 5)));
    PluginRegistry.addPlugin(new TestPlugin('second', () => makeToggleContribution('second', 'S', 5)));

    const ids = collectStatic.collectPluginContributions_().map((c) => c.sectionId);

    expect(ids).toEqual(['first', 'second']);
  });

  it('places contributions without an explicit order after ordered ones', () => {
    PluginRegistry.unregisterAllPlugins();
    PluginRegistry.addPlugin(new TestPlugin('noOrder', () => makeToggleContribution('noOrder', 'N')));
    PluginRegistry.addPlugin(new TestPlugin('ordered', () => makeToggleContribution('ordered', 'O', 99)));

    const ids = collectStatic.collectPluginContributions_().map((c) => c.sectionId);

    expect(ids).toEqual(['ordered', 'noOrder']);
  });

  it('logs and skips contributions whose getSettingsContribution() throws, without breaking siblings', () => {
    PluginRegistry.unregisterAllPlugins();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    PluginRegistry.addPlugin(new TestPlugin('broken', () => {
      throw new Error('boom');
    }));
    PluginRegistry.addPlugin(new TestPlugin('ok', () => makeToggleContribution('ok', 'O')));

    const result = collectStatic.collectPluginContributions_();

    expect(result.map((c) => c.sectionId)).toEqual(['ok']);
    expect(errSpy).toHaveBeenCalled();
  });
});

describe('SettingsMenuPlugin.renderPluginContributions_', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders each contributing plugin into the settings-plugin-sections container during uiManagerFinal', () => {
    const plugin = new SettingsMenuPlugin();
    const contributor = new TestPlugin('Contrib', () => makeToggleContribution('Contrib', 'Contrib Label', undefined, 'flag'));

    PluginRegistry.addPlugin(contributor);
    websiteInit(plugin);

    const container = document.getElementById('settings-plugin-sections');

    expect(container).not.toBeNull();
    expect(container?.querySelector('.kt-section-label')?.textContent?.trim()).toBe('Contrib Label');
    expect(container?.querySelector('#setting-Contrib-flag')).not.toBeNull();
  });

  it('wires the rendered control through to the plugin-supplied set() callback', () => {
    const plugin = new SettingsMenuPlugin();
    const set = vi.fn();

    PluginRegistry.addPlugin(new TestPlugin('Wire', () => ({
      sectionId: 'Wire',
      sectionLabel: 'Wire',
      controls: [{ type: 'toggle', id: 'flag', label: 'Flag', get: () => false, set }],
    })));
    websiteInit(plugin);

    const input = document.getElementById('setting-Wire-flag') as HTMLInputElement | null;

    expect(input).not.toBeNull();
    input!.checked = true;
    input!.dispatchEvent(new Event('change'));

    expect(set).toHaveBeenCalledWith(true);
  });

  it('re-renders the plugin sections when settingsMenuRefresh fires (e.g., visibility flips)', () => {
    const plugin = new SettingsMenuPlugin();
    let visible = false;

    PluginRegistry.addPlugin(new TestPlugin('Reveal', () => ({
      sectionId: 'Reveal',
      sectionLabel: 'Reveal',
      controls: [
        {
          type: 'toggle',
          id: 'flag',
          label: 'Flag',
          isAvailable: () => visible,
          get: () => false,
          set: vi.fn(),
        },
      ],
    })));
    websiteInit(plugin);

    // First render: control hidden → section also hidden because every control was hidden.
    expect(document.getElementById('setting-Reveal-flag')).toBeNull();

    visible = true;
    EventBus.getInstance().emit(EventBusEvent.settingsMenuRefresh);

    // After refresh: control should appear.
    expect(document.getElementById('setting-Reveal-flag')).not.toBeNull();
  });

  it('does not throw when the container element is missing (e.g., outside the settings menu lifecycle)', () => {
    document.getElementById('settings-plugin-sections')?.remove();
    expect(() => collectStatic.renderAllSections_()).not.toThrow();
  });
});
