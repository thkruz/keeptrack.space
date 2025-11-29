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

import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IKeyboardShortcut } from '../../core/plugin-capabilities';

/**
 * Component that manages keyboard shortcuts for a plugin.
 *
 * This component encapsulates the logic for:
 * - Listening to keyboard events
 * - Matching shortcuts by key/code with optional modifiers
 * - Invoking callbacks when shortcuts are triggered
 */
export class KeyboardComponent {
  private readonly pluginId_: string;
  private readonly shortcuts_: IKeyboardShortcut[];
  private isInitialized_ = false;

  /**
   * Creates a new KeyboardComponent.
   * @param pluginId The ID of the plugin this component belongs to.
   * @param shortcuts The list of keyboard shortcuts to register.
   */
  constructor(pluginId: string, shortcuts: IKeyboardShortcut[]) {
    this.pluginId_ = pluginId;
    this.shortcuts_ = shortcuts;
  }

  /**
   * Gets the plugin ID this component belongs to.
   */
  get pluginId(): string {
    return this.pluginId_;
  }

  /**
   * Gets whether this component is initialized.
   */
  get isInitialized(): boolean {
    return this.isInitialized_;
  }

  /**
   * Initialize the component by registering keyboard event handlers.
   */
  init(): void {
    if (this.isInitialized_) {
      return;
    }

    EventBus.getInstance().on(
      EventBusEvent.KeyDown,
      (key: string, code: string, isRepeat: boolean, isShift: boolean, isCtrl: boolean) => {
        if (isRepeat) {
          return;
        }

        for (const shortcut of this.shortcuts_) {
          if (this.matchesShortcut_(shortcut, key, code, isShift, isCtrl)) {
            shortcut.callback();
            break;
          }
        }
      },
    );

    this.isInitialized_ = true;
  }

  /**
   * Check if a shortcut matches the current key event.
   *
   * Modifier matching logic:
   * - `undefined` → don't care, matches regardless of modifier state
   * - `true` → modifier must be pressed
   * - `false` → modifier must NOT be pressed
   */
  private matchesShortcut_(
    shortcut: IKeyboardShortcut,
    key: string,
    code: string,
    isShift: boolean,
    isCtrl: boolean,
  ): boolean {
    // Match by key or code
    const keyMatch = shortcut.key === key || shortcut.code === code;

    if (!keyMatch) {
      return false;
    }

    // Match modifiers (undefined = don't care)
    const shiftMatch = shortcut.shift === undefined || shortcut.shift === isShift;
    const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === isCtrl;

    return shiftMatch && ctrlMatch;
  }

  /**
   * Clean up the component.
   * Note: EventBus doesn't support unsubscribing, so we just mark as not initialized.
   */
  destroy(): void {
    this.isInitialized_ = false;
  }
}
