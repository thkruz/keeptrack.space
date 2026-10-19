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

import { TranslationKey, t7e } from '@app/locales/keys';
import { PluginRegistry } from '../../core/plugin-registry';
import { EventBus } from '../../events/event-bus';
import { EventBusEvent } from '../../events/event-bus-events';
import { errorManagerInstance } from '../../utils/errorManager';
import { KeepTrackPlugin } from '../base-plugin';

/**
 * Generic enforcement for login-gated plugins.
 *
 * The drawer/bottom-icon click path checks the gate before a plugin activates,
 * but some paths change app state directly (a scenario restore setting the
 * camera type, for example) and a logout leaves already-open gated plugins on
 * screen. These helpers close any active gated plugin whose gate is not
 * currently satisfied, using the same toggle path as a user click, so every
 * gated plugin benefits without per-plugin code.
 *
 * In OSS builds no plugin has `isLoginRequired` set, so these are no-ops.
 */

export interface EnforceLoginGatesOptions {
  /**
   * Show the same "requires login" toast, icon shake and login modal that the
   * drawer click shows. Leave off for logout, where the user just chose to leave.
   */
  isNotify?: boolean;
}

/** True when the plugin is gated, currently locked, and active (menu open or mode on). */
const isActiveLockedPlugin_ = (plugin: KeepTrackPlugin): boolean => plugin.isLoginRequired && plugin.isMenuButtonActive && !plugin.isLoginGateValid_();

/**
 * Turn a plugin off through the same event a second click on its icon sends:
 * the base class hides its side menu, clears the selected state, and runs the
 * plugin's own bottomIconCallback (camera-mode plugins return to the default
 * 3D view there).
 */
const closePlugin_ = (plugin: KeepTrackPlugin): void => {
  if (plugin.bottomIconElementName) {
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, plugin.bottomIconElementName);
  }

  // A plugin without a bottom icon (or one that did not handle the click) must still end up closed.
  if (plugin.isMenuButtonActive) {
    if (plugin.sideMenuElementName) {
      plugin.hideSideMenus();
    }
    plugin.isMenuButtonActive = false;
  }
};

/**
 * Close every active gated plugin whose login gate is not satisfied.
 * @returns the plugins that were closed.
 */
export const enforceLoginGates = (options: EnforceLoginGatesOptions = {}): KeepTrackPlugin[] => {
  const closed: KeepTrackPlugin[] = [];

  for (const plugin of PluginRegistry.plugins) {
    if (isActiveLockedPlugin_(plugin)) {
      closePlugin_(plugin);
      closed.push(plugin);
    }
  }

  if (options.isNotify && closed.length > 0) {
    errorManagerInstance.warn(t7e('errorMsgs.LoginRequired' as TranslationKey) ?? 'This feature requires login. Please sign in to continue.', true);
    for (const plugin of closed) {
      plugin.shakeBottomIcon();
    }
    KeepTrackPlugin.loginGateOpenModal?.();
  }

  return closed;
};

/**
 * Enforce the gates now and again after the next update tick.
 *
 * Camera-mode plugins (Flat Map and friends) mirror the camera type into
 * `isMenuButtonActive` inside their own updateLoop listener, so a path that
 * sets `camera.cameraType` directly is only visible to the gate one tick later.
 * This listener is registered after every plugin's, so it runs after they sync.
 */
export const enforceLoginGatesAfterNextUpdate = (options: EnforceLoginGatesOptions = {}): void => {
  const closedNow = enforceLoginGates(options);
  const eventBus = EventBus.getInstance();

  let isDone = false;
  const onUpdate = (): void => {
    if (isDone) {
      return;
    }
    isDone = true;
    /*
     * Unregister after the emit finishes: splicing the listener array while
     * emit iterates it would make the next listener skip this tick.
     */
    queueMicrotask(() => eventBus.unregister(EventBusEvent.updateLoop, onUpdate));
    // Only notify once per enforcement request.
    enforceLoginGates({ isNotify: options.isNotify && closedNow.length === 0 });
  };

  eventBus.on(EventBusEvent.updateLoop, onUpdate);
};
