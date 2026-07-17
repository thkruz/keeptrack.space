/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { IKeyboardShortcut } from '../plugins/core/plugin-capabilities';

/**
 * A registered keyboard shortcut with its owning plugin.
 */
export interface RegisteredShortcut {
  pluginId: string;
  shortcut: IKeyboardShortcut;
}

/**
 * A detected conflict between two shortcut registrations.
 */
export interface ShortcutConflict {
  /** The shortcut that was already registered (winner). */
  existing: RegisteredShortcut;
  /** The shortcut that was rejected (loser). */
  incoming: RegisteredShortcut;
}

/**
 * Central registry for keyboard shortcuts across all plugins.
 * Detects and warns about conflicting shortcuts at registration time.
 *
 * Two shortcuts conflict when they share the same key (or code) and their
 * modifier patterns overlap. Modifier matching uses the same semantics as
 * KeyboardComponent: `undefined` means "don't care" and overlaps with both
 * `true` and `false`.
 */
export class KeyboardShortcutRegistry {
  private static readonly instance_ = new KeyboardShortcutRegistry();
  private registeredShortcuts_: RegisteredShortcut[] = [];
  private conflicts_: ShortcutConflict[] = [];

  /**
   * Register shortcuts for a plugin.
   * Returns only the non-conflicting shortcuts (first registration wins).
   */
  static register(pluginId: string, shortcuts: IKeyboardShortcut[]): IKeyboardShortcut[] {
    const accepted: IKeyboardShortcut[] = [];

    for (const shortcut of shortcuts) {
      const conflict = KeyboardShortcutRegistry.findConflict_(pluginId, shortcut);

      if (conflict) {
        KeyboardShortcutRegistry.instance_.conflicts_.push(conflict);
        // eslint-disable-next-line no-console
        console.warn(
          `[KeyboardShortcutRegistry] Shortcut conflict: "${KeyboardShortcutRegistry.formatShortcut(shortcut)}" ` +
          `registered by "${conflict.existing.pluginId}" overlaps with "${pluginId}". ` +
          'The first registration wins.',
        );
      } else {
        const entry: RegisteredShortcut = { pluginId, shortcut };

        KeyboardShortcutRegistry.instance_.registeredShortcuts_.push(entry);
        accepted.push(shortcut);
      }
    }

    return accepted;
  }

  /**
   * Check if two shortcuts conflict (their key/code and modifier patterns overlap).
   */
  static shortcutsConflict(a: IKeyboardShortcut, b: IKeyboardShortcut): boolean {
    const keyMatch = a.key === b.key;
    const codeMatch = a.code !== undefined && b.code !== undefined && a.code === b.code;

    if (!keyMatch && !codeMatch) {
      return false;
    }

    return (
      KeyboardShortcutRegistry.modifiersOverlap_(a.ctrl, b.ctrl) &&
      KeyboardShortcutRegistry.modifiersOverlap_(a.shift, b.shift) &&
      KeyboardShortcutRegistry.modifiersOverlap_(a.alt, b.alt)
    );
  }

  /**
   * Get all registered shortcuts.
   */
  static getAll(): readonly RegisteredShortcut[] {
    return KeyboardShortcutRegistry.instance_.registeredShortcuts_;
  }

  /**
   * Get all detected conflicts.
   */
  static getConflicts(): readonly ShortcutConflict[] {
    return KeyboardShortcutRegistry.instance_.conflicts_;
  }

  /**
   * Clear all registered shortcuts and conflicts. Used in tests.
   */
  static clear(): void {
    KeyboardShortcutRegistry.instance_.registeredShortcuts_ = [];
    KeyboardShortcutRegistry.instance_.conflicts_ = [];
  }

  /**
   * Format a shortcut as a human-readable string (e.g. "Ctrl+Shift+F").
   * Omitted modifiers are treated as not required and are not shown.
   */
  static formatShortcut(shortcut: IKeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.ctrl === true) {
      parts.push('Ctrl');
    }
    if (shortcut.shift === true) {
      parts.push('Shift');
    }
    if (shortcut.alt === true) {
      parts.push('Alt');
    }
    parts.push(shortcut.key);

    return parts.join('+');
  }

  /**
   * Check if two modifier requirements can be satisfied by the same key event.
   *
   * This MUST mirror the runtime matcher in KeyboardComponent, which treats an
   * `undefined` modifier as a wildcard ("don't care") that matches whether or
   * not the modifier is held. So `undefined` overlaps BOTH `true` and `false`;
   * two explicit values overlap only when equal.
   *
   * Consequence: a shortcut with `shift` undefined conflicts with one that
   * requires `shift: true`, because both fire when Shift is held. (This is why
   * a bare uppercase-letter shortcut such as `{ key: 'A' }` collides with
   * `{ key: 'A', shift: true }` — the uppercase char is only produced with
   * Shift, so they are the same physical chord.)
   */
  private static modifiersOverlap_(a: boolean | undefined, b: boolean | undefined): boolean {
    if (a === undefined || b === undefined) {
      return true;
    }

    return a === b;
  }

  /**
   * Find a conflicting registration for the given shortcut, or null if none.
   */
  private static findConflict_(pluginId: string, shortcut: IKeyboardShortcut): ShortcutConflict | null {
    for (const existing of KeyboardShortcutRegistry.instance_.registeredShortcuts_) {
      if (KeyboardShortcutRegistry.shortcutsConflict(existing.shortcut, shortcut)) {
        return {
          existing,
          incoming: { pluginId, shortcut },
        };
      }
    }

    return null;
  }
}
