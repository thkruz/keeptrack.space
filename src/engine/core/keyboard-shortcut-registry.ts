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
  /**
   * True for bindings that are documented here but dispatched elsewhere (raw
   * window listeners, the camera's EventBus handlers). They appear in the
   * overlay, help and splash tips but take no part in conflict detection.
   */
  isInfoOnly?: boolean;
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

/** Display names for keys whose `event.key` value is not readable on its own. */
const KEY_DISPLAY_NAMES: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
};

/** A single ASCII letter key ('f', 'F'). Ctrl/Alt chords of these are browser/OS shortcuts. */
const LETTER_KEY_PATTERN = /^[a-z]$/iu;
/** An uppercase ASCII letter: `event.key` is uppercase only while Shift is held. */
const UPPERCASE_LETTER_PATTERN = /^[A-Z]$/u;

/** The modifier requirements a shortcut really has once the letter-key defaults are applied. */
export interface ResolvedModifiers {
  ctrl: boolean | undefined;
  shift: boolean | undefined;
  alt: boolean | undefined;
}

/**
 * Central registry for keyboard shortcuts across all plugins.
 * Detects and warns about conflicting shortcuts at registration time.
 *
 * Two shortcuts conflict when they share the same key (or code) and their
 * modifier patterns overlap. Modifier matching uses the same semantics as
 * KeyboardComponent (both go through {@link KeyboardShortcutRegistry.resolveModifiers}):
 * `undefined` means "don't care" and overlaps with both `true` and `false`,
 * EXCEPT Ctrl and Alt on a letter key, where `undefined` means "not held".
 */
export class KeyboardShortcutRegistry {
  private static readonly instance_ = new KeyboardShortcutRegistry();
  private registeredShortcuts_: RegisteredShortcut[] = [];
  private infoShortcuts_: RegisteredShortcut[] = [];
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
            'The first registration wins.'
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
   * Document shortcuts that are dispatched outside the registry (raw window
   * listeners, camera movement keys). They never conflict with, or suppress,
   * a registered shortcut; they only show up in {@link getAllForDisplay}.
   */
  static registerInfo(pluginId: string, shortcuts: IKeyboardShortcut[]): void {
    for (const shortcut of shortcuts) {
      KeyboardShortcutRegistry.instance_.infoShortcuts_.push({ pluginId, shortcut, isInfoOnly: true });
    }
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

    const modsA = KeyboardShortcutRegistry.resolveModifiers(a);
    const modsB = KeyboardShortcutRegistry.resolveModifiers(b);

    return (
      KeyboardShortcutRegistry.modifiersOverlap_(modsA.ctrl, modsB.ctrl) &&
      KeyboardShortcutRegistry.modifiersOverlap_(modsA.shift, modsB.shift) &&
      KeyboardShortcutRegistry.modifiersOverlap_(modsA.alt, modsB.alt)
    );
  }

  /**
   * The effective modifier requirements of a shortcut, shared by the conflict
   * detector and the runtime matcher (KeyboardComponent) so the two never drift.
   *
   * An omitted modifier is a wildcard ("don't care"), with one exception: on a
   * single letter key an omitted Ctrl or Alt means "must NOT be held". A plain
   * `{ key: 'f' }` therefore fires on F only, never on Ctrl+F (the browser's find,
   * and Find Satellite's chord) or Alt+F. Non-letter keys keep the wildcard so
   * AltGr layouts (which report Ctrl+Alt for `[`, `{`, `@`...) still work.
   */
  static resolveModifiers(shortcut: IKeyboardShortcut): ResolvedModifiers {
    const isLetter = typeof shortcut.key === 'string' && LETTER_KEY_PATTERN.test(shortcut.key);

    return {
      ctrl: shortcut.ctrl ?? (isLetter ? false : undefined),
      shift: shortcut.shift,
      alt: shortcut.alt ?? (isLetter ? false : undefined),
    };
  }

  /**
   * Get all registered (dispatching) shortcuts.
   */
  static getAll(): readonly RegisteredShortcut[] {
    return KeyboardShortcutRegistry.instance_.registeredShortcuts_;
  }

  /**
   * Registered shortcuts plus the info-only ones, for guides and tips.
   */
  static getAllForDisplay(): readonly RegisteredShortcut[] {
    return [...KeyboardShortcutRegistry.instance_.registeredShortcuts_, ...KeyboardShortcutRegistry.instance_.infoShortcuts_];
  }

  /**
   * Every displayable shortcut owned by one plugin, in registration order.
   */
  static getForPlugin(pluginId: string): RegisteredShortcut[] {
    return KeyboardShortcutRegistry.getAllForDisplay().filter((entry) => entry.pluginId === pluginId);
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
    KeyboardShortcutRegistry.instance_.infoShortcuts_ = [];
    KeyboardShortcutRegistry.instance_.conflicts_ = [];
  }

  /**
   * The key chips for a shortcut, modifiers first (e.g. ["Ctrl", "Shift", "F"]),
   * naming the chord the user really presses. Omitted modifiers are not required
   * and are not shown, except that an uppercase letter key implies Shift
   * (`{ key: 'N' }` is pressed as Shift+N). Letters show as key caps (uppercase),
   * so `{ key: 'f' }` reads "F".
   */
  static formatShortcutKeys(shortcut: IKeyboardShortcut): string[] {
    const parts: string[] = [];
    const key = shortcut.key ?? '';
    const isUppercaseLetter = UPPERCASE_LETTER_PATTERN.test(key);

    if (shortcut.ctrl === true) {
      parts.push('Ctrl');
    }
    if (shortcut.shift === true || (isUppercaseLetter && shortcut.shift !== false)) {
      parts.push('Shift');
    }
    if (shortcut.alt === true) {
      parts.push('Alt');
    }
    parts.push(KEY_DISPLAY_NAMES[key] ?? (LETTER_KEY_PATTERN.test(key) ? key.toUpperCase() : key));

    return parts;
  }

  /**
   * Format a shortcut as a human-readable string (e.g. "Ctrl+Shift+F", "Shift+N").
   * Omitted modifiers are treated as not required and are not shown (an uppercase
   * letter still shows its implied Shift).
   */
  static formatShortcut(shortcut: IKeyboardShortcut): string {
    return KeyboardShortcutRegistry.formatShortcutKeys(shortcut).join('+');
  }

  /**
   * Check if two modifier requirements (already passed through
   * {@link resolveModifiers}) can be satisfied by the same key event.
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
