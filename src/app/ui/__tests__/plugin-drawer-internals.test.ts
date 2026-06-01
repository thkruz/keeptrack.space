import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { PluginDrawer } from '@app/app/ui/plugin-drawer';
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

  it('getShortcutHint_ resolves a registered plugin shortcut', () => {
    vi.spyOn(KeyboardShortcutRegistry, 'getAll').mockReturnValue([{ pluginId: 'PluginA', shortcut: { key: 'A' } }] as never);
    vi.spyOn(KeyboardShortcutRegistry, 'formatShortcut').mockReturnValue('A');

    expect(C.getShortcutHint_('PluginA')).toBe('A');
    expect(C.getShortcutHint_('NoSuchPlugin')).toBeUndefined();
  });

  it('openCommandPalette_ dispatches the Ctrl+Shift+K keydown', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    C.openCommandPalette_();

    const evt = dispatchSpy.mock.calls[0][0] as KeyboardEvent;

    expect(evt.code).toBe('KeyK');
    expect(evt.ctrlKey).toBe(true);
    expect(evt.shiftKey).toBe(true);
  });

  it('buildRecentGroup_ indexes non-top-menu items into the drawer cache', () => {
    const result = p().buildRecentGroup_({ analysis: group() });

    expect(p().allDrawerItems_.has('PluginA')).toBe(true);
    expect(p().allDrawerItems_.has('PluginB')).toBe(true);
    expect(result).toBeDefined();
  });
});
