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

import { isCameraMovementKey, KEYBOARD_DRIVEN_CAMERA_TYPES } from '@app/engine/camera/camera-type';
import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
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
  private readonly loginGateCheck_?: () => boolean;
  private readonly onLoginGateRejected_?: () => void;
  private isInitialized_ = false;

  /**
   * Creates a new KeyboardComponent.
   * @param pluginId The ID of the plugin this component belongs to.
   * @param shortcuts The list of keyboard shortcuts to register.
   * @param loginGateCheck Optional callback that returns true if the login gate allows activation.
   * @param onLoginGateRejected Optional callback invoked when the login gate rejects activation.
   */
  constructor(pluginId: string, shortcuts: IKeyboardShortcut[], loginGateCheck?: () => boolean, onLoginGateRejected?: () => void) {
    this.pluginId_ = pluginId;
    this.shortcuts_ = shortcuts;
    this.loginGateCheck_ = loginGateCheck;
    this.onLoginGateRejected_ = onLoginGateRejected;
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

    const validShortcuts = KeyboardShortcutRegistry.register(this.pluginId_, this.shortcuts_);

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, code: string, isRepeat: boolean, isShift: boolean, isCtrl: boolean) => {
      if (isRepeat) {
        return;
      }

      /*
       * A keyboard-driven camera mode (FPS / Satellite First Person / Astronomy /
       * Planetarium) owns the WASD/QE/arrow/numpad keys for movement. Suppress
       * plugin shortcuts bound to those keys while such a mode is active, so
       * flying the camera doesn't also open and close menus. Other keys
       * (M, N, Space, Ctrl-combos, etc.) are unaffected.
       */
      if (isCameraMovementKey(key, code) && KeyboardComponent.isCameraKeyboardModeActive_()) {
        return;
      }

      for (const shortcut of validShortcuts) {
        if (this.matchesShortcut_(shortcut, key, code, isShift, isCtrl)) {
          if (this.loginGateCheck_ && !this.loginGateCheck_()) {
            this.onLoginGateRejected_?.();
            break;
          }
          shortcut.callback();
          break;
        }
      }
    });

    this.isInitialized_ = true;
  }

  /**
   * True when the main camera is in a mode that drives itself from the keyboard
   * (see {@link KEYBOARD_DRIVEN_CAMERA_TYPES}). Resolved lazily so it reflects
   * the camera state at the moment the key is pressed. Returns false when no
   * camera is registered (e.g. during isolated unit tests).
   */
  private static isCameraKeyboardModeActive_(): boolean {
    const cameraType = ServiceLocator.getMainCamera()?.cameraType;

    return cameraType !== undefined && KEYBOARD_DRIVEN_CAMERA_TYPES.has(cameraType);
  }

  /**
   * Check if a shortcut matches the current key event.
   *
   * Modifier matching logic:
   * - `undefined` → don't care, matches regardless of modifier state
   * - `true` → modifier must be pressed
   * - `false` → modifier must NOT be pressed
   */
  private matchesShortcut_(shortcut: IKeyboardShortcut, key: string, code: string, isShift: boolean, isCtrl: boolean): boolean {
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
