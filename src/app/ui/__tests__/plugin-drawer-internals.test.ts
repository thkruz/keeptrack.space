import { PluginDrawer } from '@app/app/ui/plugin-drawer';
import { buildRecentGroupFromCache, getShortcutHint, loadRecents, recordRecent, renderStatusFooter } from '@app/app/ui/plugin-drawer-helpers';
import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const group = (over: Record<string, unknown> = {}) => ({
  label: 'Analysis',
  items: [
    { id: 'PluginA', label: 'Plugin A', imgSrc: 'a.png', isTopMenu: false, isDisabled: false, isLoginRequired: false },
    { id: 'PluginB', label: 'Plugin B', imgSrc: 'b.png', isTopMenu: false, isDisabled: true, isLoginRequired: true, shortcutHint: 'B' },
  ],
  ...over,
});

describe('PluginDrawer internals', () => {
  let drawer: PluginDrawer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => drawer as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = PluginDrawer as any;

  beforeEach(() => {
    setupStandardEnvironment();
    PersistenceManager.getInstance().clear();
    for (const id of ['keeptrack-root', 'nav-wrapper', 'ui-wrapper']) {
      if (!getEl(id, true)) {
        document.body.insertAdjacentHTML('beforeend', `<div id="${id}"></div>`);
      }
    }
    drawer = new PluginDrawer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    PersistenceManager.getInstance().clear();
  });

  it('group states round-trip through persistence', () => {
    p().groupStates_ = { analysis: false, sensors: true };
    p().saveGroupStates_();

    const raw = PersistenceManager.getInstance().getItem(StorageKey.DRAWER_GROUP_STATES);

    expect(raw).toContain('analysis');

    p().groupStates_ = {};
    p().loadGroupStates_();
    expect(p().groupStates_.analysis).toBe(false);
  });

  it('loadGroupStates_ ignores malformed persisted JSON', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.DRAWER_GROUP_STATES, 'not-json');

    expect(() => p().loadGroupStates_()).not.toThrow();
  });

  it('renderGroupHtml_ marks disabled, pro-gated and shortcut items', () => {
    const html = C.renderGroupHtml_('analysis', group(), true);

    expect(html).toContain('data-group-key="analysis"');
    expect(html).toContain('data-plugin-id="PluginA"');
    expect(html).toContain('disabled');
    expect(html).toContain('data-pro-gated');
    expect(html).toContain('drawer-item-shortcut');
  });

  it('renderGroupHtml_ adds the collapsed class when not expanded', () => {
    const expanded = C.renderGroupHtml_('analysis', group(), true);
    const collapsed = C.renderGroupHtml_('analysis', group(), false);

    expect(expanded).not.toContain('drawer-group collapsed');
    expect(collapsed).toContain('drawer-group collapsed');
  });

  it('getShortcutHint resolves a registered plugin shortcut', () => {
    vi.spyOn(KeyboardShortcutRegistry, 'getAll').mockReturnValue([{ pluginId: 'PluginA', shortcut: { key: 'A' } }] as never);
    vi.spyOn(KeyboardShortcutRegistry, 'formatShortcut').mockReturnValue('A');

    expect(getShortcutHint('PluginA')).toBe('A');
    expect(getShortcutHint('NoSuchPlugin')).toBeUndefined();
  });

  it('openCommandPalette_ dispatches the Ctrl+Shift+K keydown', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    C.openCommandPalette_();

    const evt = dispatchSpy.mock.calls[0][0] as KeyboardEvent;

    expect(evt.code).toBe('KeyK');
    expect(evt.ctrlKey).toBe(true);
    expect(evt.shiftKey).toBe(true);
  });

  it('openAppLauncher_ dispatches the Shift+Z keydown', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    C.openAppLauncher_();

    const evt = dispatchSpy.mock.calls[0][0] as KeyboardEvent;

    expect(evt.code).toBe('KeyZ');
    expect(evt.shiftKey).toBe(true);
    expect(evt.ctrlKey).toBe(false);
  });

  it('createDrawerDom_ renders the app launcher when LaunchpadPlugin is loaded', () => {
    vi.spyOn(PluginRegistry, 'getPluginByName').mockReturnValue({} as never);

    p().createDrawerDom_();

    expect(p().drawerEl_.querySelector('#drawer-app-launcher')).not.toBeNull();
  });

  it('createDrawerDom_ omits the app launcher when LaunchpadPlugin is absent', () => {
    vi.spyOn(PluginRegistry, 'getPluginByName').mockReturnValue(null as never);

    p().createDrawerDom_();

    expect(p().drawerEl_.querySelector('#drawer-app-launcher')).toBeNull();
  });

  it('refreshRecentGroup_ re-syncs rebuilt rows against live bottom-icon state', () => {
    p().createDrawerDom_();
    // The cached item data holds the stale load-time state (disabled) …
    p().allDrawerItems_.set('recent-sync-icon', {
      id: 'recent-sync-icon',
      label: 'Recent Sync',
      imgSrc: 'a.png',
      isTopMenu: false,
      isDisabled: true,
      order: 0,
    });
    // … while the live bottom icon says the plugin is now enabled and active.
    document.body.insertAdjacentHTML('beforeend', '<div id="recent-sync-icon" class="bmenu-item bmenu-item-selected"></div>');

    p().refreshRecentGroup_([{ id: 'recent-sync-icon', t: 1 }]);

    const item = getEl('drawer-content')!.querySelector('.drawer-item[data-recent-plugin-id="recent-sync-icon"]') as HTMLElement;

    expect(item.classList.contains('disabled')).toBe(false);
    expect(item.classList.contains('active')).toBe(true);
  });

  it('Recent rows use data-recent-plugin-id so the data-plugin-id selector stays unique', () => {
    p().createDrawerDom_();
    p().renderMenuGroups_({ analysis: group() }, { label: 'Recent', items: [group().items[0]] });
    const content = getEl('drawer-content')!;

    expect(content.querySelectorAll('.drawer-item[data-plugin-id="PluginA"]')).toHaveLength(1);
    expect(content.querySelectorAll('.drawer-group[data-group-key="recent"] .drawer-item[data-recent-plugin-id="PluginA"]')).toHaveLength(1);
    expect(content.querySelector('.drawer-group[data-group-key="recent"] [data-plugin-id]')).toBeNull();
  });

  it('a Recent row still activates its plugin on click', () => {
    vi.useFakeTimers();
    p().createDrawerDom_();
    p().wireEventListeners_();
    p().renderMenuGroups_({ analysis: group() }, { label: 'Recent', items: [group().items[0]] });
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    (getEl('drawer-content')!.querySelector('.drawer-item[data-recent-plugin-id="PluginA"]') as HTMLElement).click();
    vi.advanceTimersByTime(200);

    expect(emit).toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, 'PluginA');
    vi.useRealTimers();
  });

  it('buildRecentGroupFromCache skips items excluded from Recent', () => {
    const items = new Map([
      ['kept', { id: 'kept', label: 'Kept', imgSrc: '', isTopMenu: false, order: 0 }],
      ['action', { id: 'action', label: 'Action', imgSrc: '', isTopMenu: false, order: 0, isExcludedFromRecent: true }],
    ]);

    expect(buildRecentGroupFromCache(['action', 'kept'], items).items.map((item) => item.id)).toEqual(['kept']);
  });

  it('buildRecentGroup_ indexes non-top-menu items into the drawer cache', () => {
    const result = p().buildRecentGroup_({ analysis: group() });

    expect(p().allDrawerItems_.has('PluginA')).toBe(true);
    expect(p().allDrawerItems_.has('PluginB')).toBe(true);
    expect(result).toBeDefined();
  });
});

describe('shared recents store', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    PersistenceManager.getInstance().clear();
  });

  afterEach(() => {
    PersistenceManager.getInstance().clear();
  });

  it('recordRecent stores newest first and dedupes repeat activations', () => {
    recordRecent('menu-apple');
    recordRecent('menu-banana');
    recordRecent('menu-apple');

    const stored = loadRecents();

    expect(stored.map((e) => e.id)).toEqual(['menu-apple', 'menu-banana']);
    expect(typeof stored[0].t).toBe('number');
  });

  it('recordRecent caps the stored list at 20 entries', () => {
    for (let i = 0; i < 25; i++) {
      recordRecent(`menu-${i.toString()}`);
    }

    const stored = loadRecents();

    expect(stored.length).toBe(20);
    expect(stored[0].id).toBe('menu-24');
  });

  it('loadRecents tolerates malformed or non-array stored data', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.DRAWER_RECENT_PLUGINS, 'not-json');
    expect(loadRecents()).toEqual([]);

    PersistenceManager.getInstance().saveItem(StorageKey.DRAWER_RECENT_PLUGINS, '{"id":"x"}');
    expect(loadRecents()).toEqual([]);
  });

  it('loadRecents migrates the legacy plain-string-array format', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.DRAWER_RECENT_PLUGINS, JSON.stringify(['menu-apple', 'menu-banana']));

    expect(loadRecents()).toEqual([
      { id: 'menu-apple', t: 0 },
      { id: 'menu-banana', t: 0 },
    ]);
  });
});

describe('drawer status footer links', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    getEl('drawer-status-footer', true)?.remove();
    document.body.insertAdjacentHTML('beforeend', '<div id="drawer-status-footer"></div>');
  });

  afterEach(() => {
    getEl('drawer-status-footer', true)?.remove();
  });

  it('renders About, Data, Terms and Privacy as new-tab links under the version', () => {
    renderStatusFooter();

    const footer = getEl('drawer-status-footer')!;
    const links = [...footer.querySelectorAll<HTMLAnchorElement>('.drawer-footer-links a')].map((a) => ({
      key: a.dataset.footerLink,
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      text: a.textContent,
    }));

    expect(links.map((l) => [l.key, l.href])).toEqual([
      ['about', 'https://keeptrack.space/about'],
      ['data', 'https://keeptrack.space/data'],
      ['terms', 'https://keeptrack.space/terms'],
      ['privacy', 'https://keeptrack.space/privacy'],
    ]);
    for (const link of links) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
      expect(link.text?.length).toBeGreaterThan(0);
    }
    // The links row follows the version line.
    expect(footer.querySelector('.drawer-status-version')?.nextElementSibling?.classList.contains('drawer-footer-links')).toBe(true);
    expect(footer.querySelectorAll('.drawer-footer-links__sep')).toHaveLength(3);
  });
});
