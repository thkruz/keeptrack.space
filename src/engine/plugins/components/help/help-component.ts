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
import { adviceManagerInstance } from '@app/engine/utils/adviceManager';
import { IHelpConfig } from '../../core/plugin-capabilities';

/**
 * Callback to check if the plugin's menu is currently active.
 */
export type IsActiveCallback = () => boolean;

/**
 * Component that manages help content for a plugin.
 *
 * This component encapsulates the logic for:
 * - Registering help content with the advice system
 * - Showing help when the help button is clicked and the plugin is active
 */
export class HelpComponent {
  private readonly config: IHelpConfig;
  private readonly pluginId: string;
  private readonly isActiveCallback: IsActiveCallback;

  private isInitialized = false;

  /**
   * Creates a new HelpComponent.
   * @param pluginId The ID of the plugin this help belongs to.
   * @param config The configuration for the help content.
   * @param isActiveCallback Callback to check if the plugin's menu is currently active.
   */
  constructor(
    pluginId: string,
    config: IHelpConfig,
    isActiveCallback: IsActiveCallback,
  ) {
    this.pluginId = pluginId;
    this.config = config;
    this.isActiveCallback = isActiveCallback;
  }

  /**
   * Gets the help title.
   */
  get title(): string {
    return this.config.title;
  }

  /**
   * Gets the help body.
   */
  get body(): string {
    return this.config.body;
  }

  /**
   * Initialize the component by registering the help handler.
   */
  init(): void {
    if (this.isInitialized) {
      throw new Error(`HelpComponent for ${this.pluginId} is already initialized.`);
    }

    this.registerHelpHandler();
    this.isInitialized = true;
  }

  /**
   * Clean up the component.
   * Note: EventBus subscriptions are not currently unregistered as the
   * EventBus doesn't have an unsubscribe method. This will be addressed
   * when the PluginEventManager is implemented.
   */
  destroy(): void {
    this.isInitialized = false;
  }

  /**
   * Register the help button click handler.
   */
  private registerHelpHandler(): void {
    EventBus.getInstance().on(EventBusEvent.onHelpMenuClick, (): boolean => {
      if (this.isActiveCallback()) {
        this.showHelp();

        return true;
      }

      return false;
    });
  }

  /**
   * Show the help content using the advice manager.
   */
  showHelp(): void {
    adviceManagerInstance.showAdvice(this.config.title, this.config.body);
  }
}
