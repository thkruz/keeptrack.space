import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { vi } from 'vitest';

/**
 * Real-world plugin shortcuts extracted from each plugin's getKeyboardShortcuts(),
 * in approximate load order. Modifiers omitted mean undefined (don't care), which
 * matches the real definitions. Add an entry when a plugin gains a shortcut so the
 * audit below catches overlaps early. Kept at module scope so the audit describe
 * block stays within the max-lines-per-function budget.
 */
const pluginShortcuts: { pluginId: string; shortcuts: Omit<IKeyboardShortcut, 'callback'>[] }[] = [
  // --- Engine / core ---
  // src/engine/camera/camera-input-handler.ts (WASD/QE are intentionally NOT registered)
  {
    pluginId: 'CameraInputHandler',
    shortcuts: [{ key: 'ArrowUp' }, { key: 'ArrowDown' }, { key: 'ArrowLeft' }, { key: 'ArrowRight' }, { key: 'r' }, { key: 'v' }, { key: '`' }, { key: 'Shift' }],
  },
  // src/app/ui/search-manager.ts
  { pluginId: 'SearchManager', shortcuts: [{ key: 'F', ctrl: false }] },
  // src/app/ui/ui-manager.ts
  { pluginId: 'UiManager', shortcuts: [{ key: 'F2', shift: true }] },
  // src/app/rendering/orbit-manager.ts ('L' ctrl:false owns Shift+L / toggles orbit lines; lowercase 'e' toggles ECI/ECF)
  { pluginId: 'OrbitManager', shortcuts: [{ key: 'L', ctrl: false }, { key: 'e' }] },
  // src/engine/input/url-manager.ts (uppercase 'U' = Shift+U force-writes the URL bar)
  { pluginId: 'UrlManager', shortcuts: [{ key: 'U' }] },
  /*
   * NOTE: TimeManager's shortcuts (t , . < > /) are intentionally omitted. They
   * mix `key` and `code` matching across shift states (e.g. Shift+, yields key
   * '<' but code 'Comma'), which the registry's key/code/modifier model cannot
   * represent precisely, so including them produces false positives. Their
   * overlaps are tracked separately (see docs) rather than in this audit.
   */

  // --- OSS plugins ---
  // src/plugins/select-sat-manager/select-sat-manager.ts
  { pluginId: 'SelectSatManager', shortcuts: [{ key: '[' }, { key: ']' }, { key: '{' }, { key: '}' }] },
  // src/plugins/watchlist/watchlist.ts
  { pluginId: 'WatchlistPlugin', shortcuts: [{ key: 'W' }] },
  // src/plugins/watchlist-filter/watchlist-filter.ts (lowercase 'w', distinct from 'W')
  { pluginId: 'WatchlistFilter', shortcuts: [{ key: 'w' }] },
  // src/plugins/find-sat/find-sat.ts
  { pluginId: 'FindSatPlugin', shortcuts: [{ key: 'F', ctrl: true }] },
  // src/plugins/edit-sat/edit-sat.ts (ctrl:false; owns plain Shift+E)
  { pluginId: 'EditSat', shortcuts: [{ key: 'E', ctrl: false }] },
  // src/plugins/dops/dops.ts
  { pluginId: 'DopsPlugin', shortcuts: [{ key: 'D' }] },
  // src/plugins/colors-menu/colors-menu.ts (ctrl:false; owns plain Shift+A)
  { pluginId: 'ColorsMenu', shortcuts: [{ key: 'A', ctrl: false }] },
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
  // src/plugins/sensor-list/sensor-list.ts (uppercase 'S' = Shift+S; case-exact matcher)
  { pluginId: 'SensorListPlugin', shortcuts: [{ key: 'S' }, { key: 'Home', ctrl: true }] },
  // src/plugins/best-pass/best-pass.ts
  { pluginId: 'BestPass', shortcuts: [{ key: 'b' }] },
  // src/plugins/breakup/breakup.ts
  { pluginId: 'Breakup', shortcuts: [{ key: 'B', shift: true }] },
  // src/plugins/calculator/calculator.ts - keyboard shortcut removed (was a dead Shift+c spec)
  // src/plugins/clouds-toggle/clouds-toggle.ts
  { pluginId: 'CloudsToggle', shortcuts: [{ key: 'c' }] },
  // src/plugins/countries/countries.ts
  { pluginId: 'Countries', shortcuts: [{ key: 'O' }] },
  // src/plugins/earth-centered-view/earth-centered-view.ts
  { pluginId: 'EarthCenteredView', shortcuts: [{ key: '1' }] },
  // src/plugins/fps-view/fps-view.ts
  { pluginId: 'FpsView', shortcuts: [{ key: '8' }] },
  // src/plugins/graticule-toggle/graticule-toggle.ts
  { pluginId: 'GraticuleToggle', shortcuts: [{ key: 'G' }] },
  // src/plugins/new-launch/new-launch.ts (Ctrl+Shift+L; plain Shift+L is OrbitManager)
  { pluginId: 'NewLaunch', shortcuts: [{ key: 'L', ctrl: true, shift: true }] },
  // src/plugins/planets-menu/planets-menu.ts (lowercase 'p'; Shift+Home / Home, both ctrl:false)
  { pluginId: 'PlanetsMenuPlugin', shortcuts: [{ key: 'p' }, { key: 'Home', shift: true, ctrl: false }, { key: 'Home', shift: false, ctrl: false }] },
  // src/plugins/polar-plot/polar-plot.ts
  { pluginId: 'PolarPlot', shortcuts: [{ key: 'P' }] },
  // src/plugins/political-map-toggle/political-map-toggle.ts
  { pluginId: 'PoliticalMapToggle', shortcuts: [{ key: 'l' }] },
  // src/plugins/proximity-ops/proximity-ops.ts
  { pluginId: 'ProximityOps', shortcuts: [{ key: 'X' }] },
  // src/plugins/reentries/reentries.ts
  { pluginId: 'Reentries', shortcuts: [{ key: 'R', ctrl: false }] },
  // src/plugins/sat-info-box/sat-info-box.ts
  { pluginId: 'SatInfoBox', shortcuts: [{ key: 'i' }] },
  // src/plugins/satellite-eci-view/satellite-eci-view.ts
  { pluginId: 'SatelliteEciView', shortcuts: [{ key: '3' }] },
  // src/plugins/satellite-fixed-view/satellite-fixed-view.ts
  { pluginId: 'SatelliteFixedView', shortcuts: [{ key: '4' }] },
  // src/plugins/satellite-fov/satellite-fov.ts (both ctrl:false)
  {
    pluginId: 'SatelliteFov',
    shortcuts: [
      { key: 'C', ctrl: false },
      { key: 'V', ctrl: false },
    ],
  },
  // src/plugins/satellite-photos/satellite-photos.ts
  { pluginId: 'SatellitePhotos', shortcuts: [{ key: 'H' }] },
  // src/plugins/satellite-view/satellite-view.ts
  { pluginId: 'SatelliteView', shortcuts: [{ key: '5' }] },
  // src/plugins/settings-menu/settings-menu.ts
  { pluginId: 'SettingsMenuPlugin', shortcuts: [{ key: ',', code: 'Comma', shift: true }] },
  // src/plugins/transponder-channel-data/transponder-channel-data.ts
  { pluginId: 'TransponderChannelData', shortcuts: [{ key: 'T' }] },
  // src/plugins/video-director/video-director.ts
  {
    pluginId: 'VideoDirector',
    shortcuts: [
      { key: 'V', ctrl: true, shift: true },
      { key: 'R', ctrl: true, shift: true },
    ],
  },

  // --- Pro plugins ---
  // src/plugins-pro/alt-inc-heatmap/alt-inc-heatmap.ts
  { pluginId: 'AltIncHeatmap', shortcuts: [{ key: 'J' }] },
  // src/plugins-pro/aurora/aurora.ts (moved to Ctrl+Shift+A; plain Shift+A is ColorsMenu)
  { pluginId: 'Aurora', shortcuts: [{ key: 'A', ctrl: true, shift: true }] },
  // src/plugins-pro/debug/debug.ts
  {
    pluginId: 'DebugPlugin',
    shortcuts: [
      { key: 'F12', shift: true },
      { key: 'd', ctrl: true },
    ],
  },
  // src/plugins-pro/eclipse-solar-analysis/eclipse-solar-analysis.ts (Ctrl+Shift+E; plain Shift+E is EditSat)
  { pluginId: 'EclipseSolarAnalysis', shortcuts: [{ key: 'E', ctrl: true, shift: true }] },
  // src/plugins-pro/flat-map-view/flat-map-view.ts
  { pluginId: 'FlatMapView', shortcuts: [{ key: '2' }] },
  // src/plugins-pro/fov-fade/fov-fade.ts - keyboard shortcut removed (Shift+F was owned by Search)
  // src/plugins-pro/keyboard-shortcuts/keyboard-shortcuts.ts
  { pluginId: 'KeyboardShortcutsPlugin', shortcuts: [{ key: '?' }] },
  // src/plugins-pro/polar-view/polar-view.ts
  { pluginId: 'PolarView', shortcuts: [{ key: '9' }] },
  // src/plugins-pro/scenario-management-pro/scenario-management-pro.ts (lowercase 's', distinct from 'S')
  { pluginId: 'ScenarioManagementMenu', shortcuts: [{ key: 's' }] },
  // src/plugins-pro/seismic-activity/seismic-activity.ts
  { pluginId: 'SeismicActivity', shortcuts: [{ key: 'Q', shift: true }] },
  // src/plugins-pro/symbology/symbology-plugin.ts
  { pluginId: 'SymbologyPlugin', shortcuts: [{ key: 'Y' }] },
  // src/plugins-pro/user-account/user-account.ts (lowercase 'u')
  { pluginId: 'UserAccountPlugin', shortcuts: [{ key: 'u' }] },
];

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
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
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

    it('should conflict when one omits ctrl (wildcard) and the other requires it', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
      const cb = vi.fn();

      // ctrl omitted = wildcard: matches whether or not Ctrl is held, so it
      // overlaps a shortcut that requires Ctrl (both fire on Ctrl+key). This
      // mirrors the runtime matcher, which treats undefined as "don't care".
      KeyboardShortcutRegistry.register('PlainKey', [{ key: 'F', callback: cb }]);
      const result = KeyboardShortcutRegistry.register('CtrlKey', [{ key: 'F', ctrl: true, callback: cb }]);

      expect(result).toHaveLength(0);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(1);
    });

    it('should NOT conflict when both specify the same modifier with opposite values', () => {
      const cb = vi.fn();

      // Both explicit and different (ctrl false vs ctrl true) => disjoint, no overlap.
      KeyboardShortcutRegistry.register('NoCtrl', [{ key: 'F', ctrl: false, callback: cb }]);
      const result = KeyboardShortcutRegistry.register('WithCtrl', [{ key: 'F', ctrl: true, callback: cb }]);

      expect(result).toHaveLength(1);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(0);
    });

    it('should conflict when undefined modifier matches false (both mean not required)', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
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
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
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
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
      const cb = vi.fn();

      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', code: 'KeyF', callback: cb }]);
      const result = KeyboardShortcutRegistry.register('PluginB', [{ key: 'G', code: 'KeyF', callback: cb }]);

      expect(result).toHaveLength(0);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(1);
    });

    it('should conflict when a wildcard modifier overlaps an explicit one on another dimension', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
      const cb = vi.fn();

      // ctrl: true, shift: undefined (wildcard) -> matches Ctrl+F and Ctrl+Shift+F
      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', ctrl: true, callback: cb }]);
      // ctrl: true, shift: true -> matches Ctrl+Shift+F, which PluginA also matches
      const result = KeyboardShortcutRegistry.register('PluginB', [{ key: 'F', ctrl: true, shift: true, callback: cb }]);

      expect(result).toHaveLength(0);
      expect(KeyboardShortcutRegistry.getConflicts()).toHaveLength(1);
    });

    it('should NOT conflict when an explicit modifier differs across dimensions', () => {
      const cb = vi.fn();

      // ctrl: true, shift: false -> only Ctrl+F (no shift)
      KeyboardShortcutRegistry.register('PluginA', [{ key: 'F', ctrl: true, shift: false, callback: cb }]);
      // ctrl: true, shift: true -> only Ctrl+Shift+F; disjoint from PluginA
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
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
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
      callback: () => {
        /* noop */
      },
      ...overrides,
    });

    it('should return false for different keys', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make({ key: 'F' }), make({ key: 'G' }))).toBe(false);
    });

    it('should return true for same key, both undefined modifiers', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make(), make())).toBe(true);
    });

    it('should return true for undefined vs true (undefined is a wildcard)', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make(), make({ ctrl: true }))).toBe(true);
    });

    it('should return true for undefined vs false (undefined is a wildcard)', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make(), make({ ctrl: false }))).toBe(true);
    });

    it('should return false for true vs false', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make({ ctrl: true }), make({ ctrl: false }))).toBe(false);
    });

    it('should return true for true vs true', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make({ ctrl: true }), make({ ctrl: true }))).toBe(true);
    });

    it('should return false when any modifier dimension is exclusive', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make({ ctrl: true, shift: true }), make({ ctrl: true, shift: false }))).toBe(false);
    });

    it('should return true only when all modifier dimensions overlap', () => {
      expect(KeyboardShortcutRegistry.shortcutsConflict(make({ ctrl: true, shift: true }), make({ ctrl: true, shift: true }))).toBe(true);
    });
  });

  describe('formatShortcut', () => {
    it('should format a simple key without modifiers', () => {
      const result = KeyboardShortcutRegistry.formatShortcut({
        key: 'N',
        callback: () => {
          /* noop */
        },
      });

      expect(result).toBe('N');
    });

    it('should include required modifiers', () => {
      const result = KeyboardShortcutRegistry.formatShortcut({
        key: 'F',
        ctrl: true,
        shift: true,
        callback: () => {
          /* noop */
        },
      });

      expect(result).toBe('Ctrl+Shift+F');
    });

    it('should omit modifiers that are false or omitted', () => {
      const result = KeyboardShortcutRegistry.formatShortcut({
        key: 'K',
        ctrl: true,
        shift: false,
        callback: vi.fn(),
      });

      expect(result).toBe('Ctrl+K');
    });
  });

  describe('getConflicts', () => {
    it('should record both sides of the conflict', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
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
   * This registers every registry-based keyboard shortcut in the codebase (in
   * approximate load order) and asserts zero conflicts. When a new plugin adds a
   * shortcut, add it to `pluginShortcuts` so CI catches overlaps early.
   *
   * Keep this list in sync with the actual getKeyboardShortcuts() implementations.
   * NOTE: uppercase letter shortcuts imply Shift (the key char only exists with
   * Shift held), so a bare `{ key: 'A' }` is the same physical chord as
   * `{ key: 'A', shift: true }` and the two WILL be flagged as conflicting.
   */
  describe('real-world shortcut audit', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const noop = () => {
      /* noop */
    };

    it('should have no conflicts across all plugin shortcuts', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });

      for (const { pluginId, shortcuts } of pluginShortcuts) {
        KeyboardShortcutRegistry.register(
          pluginId,
          shortcuts.map((s) => ({ ...s, callback: noop }))
        );
      }

      const conflicts = KeyboardShortcutRegistry.getConflicts();

      if (conflicts.length > 0) {
        const details = conflicts.map(
          (c) => `  "${KeyboardShortcutRegistry.formatShortcut(c.existing.shortcut)}" ` + `registered by "${c.existing.pluginId}" conflicts with "${c.incoming.pluginId}"`
        );

        throw new Error(`Found ${conflicts.length} keyboard shortcut conflict(s):\n${details.join('\n')}`);
      }

      expect(conflicts).toHaveLength(0);
    });
  });
});
