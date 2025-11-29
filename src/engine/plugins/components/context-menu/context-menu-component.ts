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

import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { IContextMenuConfig } from '../../core/plugin-capabilities';

/**
 * Default values for context menu configuration.
 */
const DEFAULTS = {
  L1_CONTAINER_ID: 'right-btn-menu-ul',
  L2_CONTAINER_ID: 'rmb-wrapper',
  ORDER: 100,
} as const;

/**
 * Context menu item registration info for the InputManager.
 */
export interface ContextMenuItemInfo {
  elementIdL1: string;
  elementIdL2: string;
  order: number;
  isRmbOnEarth: boolean;
  isRmbOffEarth: boolean;
  isRmbOnSat: boolean;
}

/**
 * Callbacks that can be provided to the ContextMenuComponent.
 */
export interface ContextMenuCallbacks {
  /**
   * Called when a context menu action is triggered.
   * @param targetId The ID of the menu item clicked.
   * @param clickedSatId The ID of the satellite that was right-clicked, if any.
   */
  onAction: (targetId: string, clickedSatId?: number) => void;
}

/**
 * Component that manages a context menu (right-click menu) for a plugin.
 *
 * This component encapsulates all the logic for:
 * - Creating level 1 (main) and level 2 (submenu) DOM elements
 * - Registering visibility conditions (on earth, off earth, on satellite)
 * - Handling menu item actions
 */
export class ContextMenuComponent {
  private readonly config: Required<IContextMenuConfig>;
  private readonly pluginId: string;
  private readonly callbacks: ContextMenuCallbacks;

  private isInitialized = false;
  private level1Element: HTMLElement | null = null;
  private level2Element: HTMLElement | null = null;

  /**
   * Creates a new ContextMenuComponent.
   * @param pluginId The ID of the plugin this menu belongs to.
   * @param config The configuration for the context menu.
   * @param callbacks Callbacks for menu events.
   */
  constructor(
    pluginId: string,
    config: IContextMenuConfig,
    callbacks: ContextMenuCallbacks,
  ) {
    this.pluginId = pluginId;
    this.callbacks = callbacks;

    // Apply defaults to config
    this.config = {
      level1Html: config.level1Html,
      level1ElementName: config.level1ElementName,
      level2Html: config.level2Html,
      level2ElementName: config.level2ElementName,
      order: config.order ?? DEFAULTS.ORDER,
      isVisibleOnEarth: config.isVisibleOnEarth ?? false,
      isVisibleOffEarth: config.isVisibleOffEarth ?? false,
      isVisibleOnSatellite: config.isVisibleOnSatellite ?? false,
    };
  }

  /**
   * Gets the menu item info for registration with InputManager.
   */
  getMenuItemInfo(): ContextMenuItemInfo {
    return {
      elementIdL1: this.config.level1ElementName,
      elementIdL2: this.config.level2ElementName,
      order: this.config.order,
      isRmbOnEarth: this.config.isVisibleOnEarth,
      isRmbOffEarth: this.config.isVisibleOffEarth,
      isRmbOnSat: this.config.isVisibleOnSatellite,
    };
  }

  /**
   * Initialize the component by creating DOM elements and registering events.
   */
  init(): void {
    if (this.isInitialized) {
      throw new Error(`ContextMenuComponent for ${this.pluginId} is already initialized.`);
    }

    this.registerLevel1Creation();
    this.registerLevel2Creation();
    this.registerActionHandler();
    this.registerWithInputManager();

    this.isInitialized = true;
  }

  /**
   * Clean up the component by removing DOM elements.
   */
  destroy(): void {
    if (this.level1Element) {
      this.level1Element.remove();
      this.level1Element = null;
    }
    if (this.level2Element) {
      this.level2Element.remove();
      this.level2Element = null;
    }
    this.isInitialized = false;
  }

  /**
   * Register the level 1 menu item creation.
   */
  private registerLevel1Creation(): void {
    EventBus.getInstance().on(EventBusEvent.rightBtnMenuAdd, () => {
      this.createLevel1Element();
    });
  }

  /**
   * Create the level 1 (main) menu item.
   */
  private createLevel1Element(): void {
    const item = document.createElement('div');

    item.innerHTML = this.config.level1Html;

    // Trim empty text nodes
    item.childNodes.forEach((child) => {
      if (child.nodeType === 3 && child.textContent?.trim() === '') {
        item.removeChild(child);
      }
    });

    const lastChild = item.lastChild;

    if (lastChild) {
      const container = getEl(DEFAULTS.L1_CONTAINER_ID);

      if (container) {
        container.appendChild(lastChild);
        this.level1Element = lastChild as HTMLElement;
      }
    }
  }

  /**
   * Register the level 2 submenu creation.
   */
  private registerLevel2Creation(): void {
    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.createLevel2Element();
    });
  }

  /**
   * Create the level 2 (submenu) element.
   */
  private createLevel2Element(): void {
    const item = document.createElement('div');

    item.id = this.config.level2ElementName;
    item.className = 'right-btn-menu';
    item.innerHTML = this.config.level2Html;

    const container = getEl(DEFAULTS.L2_CONTAINER_ID);

    if (container) {
      container.appendChild(item);
      this.level2Element = item;
    }
  }

  /**
   * Register the action handler for menu item clicks.
   */
  private registerActionHandler(): void {
    EventBus.getInstance().on(
      EventBusEvent.rmbMenuActions,
      (targetId: string, clickedSatId?: number) => {
        this.callbacks.onAction(targetId, clickedSatId);
      },
    );
  }

  /**
   * Register this menu item with the InputManager.
   */
  private registerWithInputManager(): void {
    const inputManager = ServiceLocator.getInputManager();

    if (inputManager) {
      inputManager.rmbMenuItems.push(this.getMenuItemInfo());
    }
  }

  /**
   * Get the level 1 DOM element.
   */
  getLevel1Element(): HTMLElement | null {
    return this.level1Element ?? getEl(this.config.level1ElementName);
  }

  /**
   * Get the level 2 DOM element.
   */
  getLevel2Element(): HTMLElement | null {
    return this.level2Element ?? getEl(this.config.level2ElementName);
  }
}
