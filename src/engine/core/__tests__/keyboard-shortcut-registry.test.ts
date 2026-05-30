import { vi } from 'vitest';

import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';

describe('KeyboardShortcutRegistry', () => {
  beforeEach(() => {
    KeyboardShortcutRegistry.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should accept shortcuts with different keys', () => {
      const cb = vi.fn();
      const result1 = KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', callback: cb }]);
      const result2 = KeyboardShortcutRegistry.register('PluginB', [{ key: 'G', callback: cb }]);

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(KeyboardShortcutRegistry.getAll()).toHaveLength(2);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(0);
    });

    it('should reject a shortcut that conflicts with an existing registration', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', callback: cb }]);
      const result = KeyboardShortcutRegistry.register('PluginB', [{ key: 'F', callback: cb }]);

      expect(result).toHaveLength(0);
      expect(KeyboardShortcutRegistry.getAll()).toHaveLength(1);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('PluginA');
      expect(warnSpy.mock.calls[0][0]).toContain('PluginB');
    });

    it('should NOT conflict when one requires ctrl and the other does not', () => {
      const cb = vi.fn();

      // FilterMenu-like: plain F (ctrl omitted = not required)
      KeyboardShortcutRegistry.register('FilterMenu', [{ key: 'F', callback: cb }]);
      // FindSat-like: Ctrl+F
      const result = KeyboardShortcutRegistry.register('FindSat', [{ key: 'F', ctrl: true, callback: cb }]);

      expect(result).toHaveLength(1);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(0);
    });

    it('should conflict when undefined modifier matches false (both mean not required)', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', callback: cb }]);
      const result = KeyboardShortcutRegistry.register('PluginB', [{ key: 'F', ctrl: false, callback: cb }]);

      expect(result).toHaveLength(0);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(1);
    });

    it('should NOT conflict when true vs false on the same modifier', () => {
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', ctrl: true, callback: cb }]);
      const result = KeyboardShortcutRegistry.register('PluginB', [{ key: 'F', ctrl: false, callback: cb }]);

      expect(result).toHaveLength(1);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(0);
    });

    it('should accept a partial list when some shortcuts conflict', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', callback: cb }]);
      const result = KeyboardShortcutRegistry.register('PluginB', [
        { key: 'F', callback: cb },
        { key: 'H', callback: cb },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('H');
      expect(KeyboardShortcutRegistry.getAll()).toHaveLength(2);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(1);
    });

    it('should detect conflict via code field', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', code: 'KeyF', callback: cb }]);
      const result = KeyboardShortcutRegistry.register('PluginB', [{ key: 'G', code: 'KeyF', callback: cb }]);

      expect(result).toHaveLength(0);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(1);
    });

    it('should NOT conflict when modifiers differ across dimensions', () => {
      const cb = vi.fn();

      // ctrl: true, shift: undefined (=false)
      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', ctrl: true, callback: cb }]);
      // ctrl: true, shift: true
      const result = KeyboardShortcutRegistry.register('PluginB', [{ key: 'F', ctrl: true, shift: true, callback: cb }]);

      expect(result).toHaveLength(1);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(0);
    });

    it('should NOT conflict when shift differs (true vs false)', () => {
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', ctrl: true, shift: false, callback: cb }]);
      const result = KeyboardShortcutRegistry.register('PluginB', [{ key: 'F', ctrl: true, shift: true, callback: cb }]);

      expect(result).toHaveLength(1);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should reset all state', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', callback: cb }]);
      KeyboardShortcutRegistry.register('PluginB', [{ key: 'F', callback: cb }]);

      expect(KeyboardShortcutRegistry.getAll()).toHaveLength(1);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(1);

      KeyboardShortcutRegistry.clear();

      expect(KeyboardShortcutRegistry.getAll()).toHaveLength(0);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(0);

      // Re-register the same key — should succeed now
      const result = KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', callback: cb }]);

      expect(result).toHaveLength(1);
    });
  });

  describe('shortcutsConflict', () => {
    const make = (overrides: Partial<IKeyboardShortcut> = {}): IKeyboardShortcut => ({
      key: 'F',
      callback: () => {},
      ...overrides,
    });

    it('should return false for different keys', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make({ key: 'F' }), make({ key: 'G' }))).toBe(false);
    });

    it('should return true for same key, both undefined modifiers', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make(), make())).toBe(true);
    });

    it('should return false for undefined vs true (undefined treated as false)', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make(), make({ ctrl: true }))).toBe(false);
    });

    it('should return true for undefined vs false (both effectively false)', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make(), make({ ctrl: false }))).toBe(true);
    });

    it('should return false for true vs false', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make({ ctrl: true }), make({ ctrl: false }))).toBe(false);
    });

    it('should return true for true vs true', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make({ ctrl: true }), make({ ctrl: true }))).toBe(true);
    });

    it('should return false when any modifier dimension is exclusive', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(
        make({ ctrl: true, shift: true }),
        make({ ctrl: true, shift: false }),
      )).toBe(false);
    });

    it('should return true only when all modifier dimensions overlap', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(
        make({ ctrl: true, shift: true }),
        make({ ctrl: true, shift: true }),
      )).toBe(true);
    });
  });

  describe('formatShortcut', () => {
    it('should format a simple key without modifiers', () => {
      const result = KeyboardShortcutRegistry.formatShortcut({ key: 'N', callback: () => {} });

      expect(result).toBe('N');
    });

    it('should include required modifiers', () => {
      const result = KeyboardShortcutRegistry.formatShortcut({ key: 'F', ctrl: true, shift: true, callback: () => {} });

      expect(result).toBe('Ctrl+Shift+F');
    });

    it('should omit modifiers that are false or omitted', () => {
      const result = KeyboardShortcutRegistry.formatShortcut({
        key: 'K', ctrl: true, shift: false, callback: vi.fn(),
      });

      expect(result).toBe('Ctrl+K');
    });
  });

  describe('getConflicts', () => {
    it('should record both sides of the conflict', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('Winner', [{ key: 'X', callback: cb }]);
      KeyboardShortcutRegistry.register('Loser', [{ key: 'X', callback: cb }]);

      const conflicts = KeyboardShortcutRegistry.getConflicts();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].existing.pluginId).toBe('Winner');
      expect(conflicts[0].incoming.pluginId).toBe('Loser');
    });
  });

  /**
   * Real-world shortcut audit.
   *
   * This registers every keyboard shortcut from every plugin in the codebase
   * (in approximate load order) and asserts zero conflicts. When a new plugin
   * adds a shortcut, add it here so CI catches overlaps early.
   *
   * Keep this list in sync with the actual getKeyboardShortcuts() implementations.
   */
  describe('real-world shortcut audit', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const noop = () => {};

    // Shortcuts extracted from each plugin's getKeyboardShortcuts(), in approximate load order.
    // Modifiers omitted = undefined (don't care) — matches the real definitions.
    const pluginShortcuts: { pluginId: string; shortcuts: Omit<IKeyboardShortcut, 'callback'>[] }[] = [
      // src/app/ui/search-manager.ts
      { pluginId: 'SearchManager', shortcuts: [{ key: 'F', ctrl: false, shift: false }] },
      // src/plugins/select-sat-manager/select-sat-manager.ts
      { pluginId: 'SelectSatManager', shortcuts: [{ key: '[' }, { key: ']' }, { key: '{' }, { key: '}' }] },
      // src/plugins/watchlist/watchlist.ts
      { pluginId: 'WatchlistPlugin', shortcuts: [{ key: 'W' }] },
      // src/plugins/find-sat/find-sat.ts
      { pluginId: 'FindSatPlugin', shortcuts: [{ key: 'F', ctrl: true }] },
      // src/plugins/edit-sat/edit-sat.ts
      { pluginId: 'EditSat', shortcuts: [{ key: 'E' }] },
      // src/plugins/dops/dops.ts
      { pluginId: 'DopsPlugin', shortcuts: [{ key: 'D' }] },
      // src/plugins/colors-menu/colors-menu.ts
      { pluginId: 'ColorsMenu', shortcuts: [{ key: 'A' }] },
      // src/plugins/filter-menu/filter-menu.ts
      { pluginId: 'FilterMenuPlugin', shortcuts: [{ key: 'f' }] },
      // src/plugins/sound-toggle/sound-toggle.ts
      { pluginId: 'SoundToggle', shortcuts: [{ key: 'M' }] },
      // src/plugins/night-toggle/night-toggle.ts
      { pluginId: 'NightToggle', shortcuts: [{ key: 'N' }] },
      // src/plugins/stereo-map/stereo-map.ts
      { pluginId: 'StereoMap', shortcuts: [{ key: 'm' }] },
      // src/plugins/vcr/vcr.ts
      { pluginId: 'VcrPlugin', shortcuts: [{ key: ' ' }] },
      // src/plugins/plot-analysis/inc2alt.ts
      { pluginId: 'Inc2AltPlots', shortcuts: [{ key: 'I' }] },
      // src/plugins/plot-analysis/inc2lon.ts
      { pluginId: 'Inc2LonPlots', shortcuts: [{ key: 'g' }] },
      // src/plugins-pro/symbology/symbology-plugin.ts
      { pluginId: 'SymbologyPlugin', shortcuts: [{ key: 'Y' }] },
    ];

    it('should have no conflicts across all plugin shortcuts', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      for (const { pluginId, shortcuts } of pluginShortcuts) {
        KeyboardShortcutRegistry.register(
          pluginId,
          shortcuts.map((s) => ({ ...s, callback: noop })),
        );
      }

      const conflicts = KeyboardShortcutRegistry.getConflicts();

      if (conflicts.length > 0) {
        const details = conflicts.map(
          (c) =>
            `  "${KeyboardShortcutRegistry.formatShortcut(c.existing.shortcut)}" ` +
            `registered by "${c.existing.pluginId}" conflicts with "${c.incoming.pluginId}"`,
        );

        throw new Error(`Found ${conflicts.length} keyboard shortcut conflict(s):\n${details.join('\n')}`);
      }

      expect(conflicts).toHaveLength(0);
    });
  });
});
