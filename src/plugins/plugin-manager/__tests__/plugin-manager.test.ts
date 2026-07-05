import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { getEl } from '@app/engine/utils/get-el';
import { PluginManagerPlugin } from '@app/plugins/plugin-manager/plugin-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('PluginManagerPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(PluginManagerPlugin, 'PluginManagerPlugin');
  standardPluginMenuButtonTests(PluginManagerPlugin, 'PluginManagerPlugin');
});

describe('PluginManagerPlugin behavior', () => {
  let plugin: PluginManagerPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new PluginManagerPlugin();
    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the bottom icon, side menu, help, and command palette', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('plugin-manager-bottom-icon');
    expect(plugin.getSideMenuConfig().elementName).toBe('plugin-manager-menu');
    expect(plugin.getHelpConfig().sections.length).toBeGreaterThan(0);
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('PluginManagerPlugin.open');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('renders a toggle row for at least one built-in plugin', () => {
    const menu = getEl('plugin-manager-menu');

    expect(menu).toBeTruthy();
    expect(menu!.querySelectorAll('input[data-config-key]').length).toBeGreaterThan(0);
  });

  it('renders Installed / Browse / Develop tabs and switches panes', () => {
    const menu = getEl('plugin-manager-menu')!;
    const tabs = [...menu.querySelectorAll<HTMLElement>('[data-pm-tab]')].map((t) => t.dataset.pmTab);

    expect(tabs).toEqual(['installed', 'browse', 'develop']);

    const developTab = menu.querySelector<HTMLElement>('[data-pm-tab="develop"]')!;

    developTab.dispatchEvent(new Event('click'));

    const installedPane = menu.querySelector<HTMLElement>('[data-pm-pane="installed"]')!;
    const developPane = menu.querySelector<HTMLElement>('[data-pm-pane="develop"]')!;

    expect(installedPane.classList.contains('start-hidden')).toBe(true);
    expect(developPane.classList.contains('start-hidden')).toBe(false);
  });

  it('exposes copyable commands in the Develop tab', () => {
    const menu = getEl('plugin-manager-menu')!;
    const commands = [...menu.querySelectorAll<HTMLElement>('.pm-copy-btn')].map((b) => b.dataset.copy);

    expect(commands).toContain('npm run plugin -- create');
    expect(commands.some((c) => c?.startsWith('npm run plugin -- dev'))).toBe(true);
  });

  it('persists a toggle change and drives the reload banner round-trip', () => {
    const saveSpy = vi.spyOn(PersistenceManager.getInstance(), 'saveItem');
    const menu = getEl('plugin-manager-menu')!;
    // A currently-enabled, non-locked plugin so we can flip it off then on again.
    const toggle = [...menu.querySelectorAll<HTMLInputElement>('input[data-config-key]:not([disabled])')].find((i) => i.checked);

    expect(toggle).toBeTruthy();
    const banner = getEl(PluginManagerPlugin.RELOAD_BANNER_ID)!;

    expect(banner.classList.contains('start-hidden')).toBe(true);

    // Flip OFF — diverges from boot state, so persist + show the banner.
    toggle!.checked = false;
    toggle!.dispatchEvent(new Event('change'));
    expect(saveSpy).toHaveBeenCalledWith(StorageKey.PLUGIN_ENABLE_OVERRIDES, expect.any(String));
    expect(banner.classList.contains('start-hidden')).toBe(false);

    // Flip back ON — matches boot state again, so the banner clears.
    toggle!.checked = true;
    toggle!.dispatchEvent(new Event('change'));
    expect(banner.classList.contains('start-hidden')).toBe(true);
  });
});
