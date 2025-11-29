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
import { clickAndDragWidth } from '@app/engine/utils/click-and-drag';
import { getEl } from '@app/engine/utils/get-el';
import { slideInRight, slideOutLeft } from '@app/engine/utils/slide';
import { ISideMenuConfig } from '../../core/plugin-capabilities';

/**
 * Default values for side menu configuration.
 */
const DEFAULTS = {
  CONTAINER_ID: 'left-menus',
  Z_INDEX: 5,
  ANIMATION_DURATION: 1000,
} as const;

/**
 * Callbacks that can be provided to the SideMenuComponent.
 */
export interface SideMenuCallbacks {
  /**
   * Called when the side menu is opened.
   */
  onOpen?: () => void;

  /**
   * Called when the side menu is closed.
   */
  onClose?: () => void;

  /**
   * Called when the form is submitted.
   */
  onFormSubmit?: () => void;
}

/**
 * Component that manages a side menu for a plugin.
 *
 * This component encapsulates all the logic for:
 * - Creating and managing the DOM element
 * - Opening/closing with animations
 * - Form submission handling
 * - Click-and-drag resizing
 */
export class SideMenuComponent {
  private readonly config: Required<Omit<ISideMenuConfig, 'dragOptions'>> & Pick<ISideMenuConfig, 'dragOptions'>;
  private readonly pluginId: string;
  private readonly callbacks: SideMenuCallbacks;

  private isOpen = false;
  private isInitialized = false;
  private element: HTMLElement | null = null;

  /**
   * Creates a new SideMenuComponent.
   * @param pluginId The ID of the plugin this menu belongs to.
   * @param config The configuration for the side menu.
   * @param callbacks Optional callbacks for menu events.
   */
  constructor(
    pluginId: string,
    config: ISideMenuConfig,
    callbacks: SideMenuCallbacks = {},
  ) {
    this.pluginId = pluginId;
    this.callbacks = callbacks;

    // Apply defaults to config
    this.config = {
      elementName: config.elementName,
      title: config.title,
      html: config.html,
      zIndex: config.zIndex ?? DEFAULTS.Z_INDEX,
      width: config.width ?? 300,
      dragOptions: config.dragOptions,
    };
  }

  /**
   * Gets the DOM element ID for this menu.
   */
  get elementName(): string {
    return this.config.elementName;
  }

  /**
   * Gets whether the menu is currently open.
   */
  get opened(): boolean {
    return this.isOpen;
  }

  /**
   * Initialize the component by creating the DOM element and registering events.
   */
  init(): void {
    if (this.isInitialized) {
      throw new Error(`SideMenuComponent for ${this.pluginId} is already initialized.`);
    }

    this.registerDomCreation();
    this.registerHideSideMenusHandler();

    if (this.config.dragOptions) {
      this.registerDragHandler();
    }

    this.isInitialized = true;
  }

  /**
   * Clean up the component by removing the DOM element.
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.isInitialized = false;
    this.isOpen = false;
  }

  /**
   * Register the DOM creation on uiManagerInit event.
   */
  private registerDomCreation(): void {
    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.createDomElement();
    });
  }

  /**
   * Create the DOM element for the side menu.
   */
  private createDomElement(): void {
    const container = getEl(DEFAULTS.CONTAINER_ID);

    if (container) {
      container.insertAdjacentHTML('beforeend', this.config.html);
      this.element = getEl(this.config.elementName);
    }
  }

  /**
   * Register the handler for hiding side menus.
   */
  private registerHideSideMenusHandler(): void {
    EventBus.getInstance().on(EventBusEvent.hideSideMenus, () => {
      this.close();
    });
  }

  /**
   * Register the click-and-drag handler.
   */
  private registerDragHandler(): void {
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      if (this.config.dragOptions) {
        clickAndDragWidth(this.getElement(), this.config.dragOptions);
      }
    });
  }

  /**
   * Register form submit handler.
   * @param callback The callback to run when the form is submitted.
   */
  registerFormSubmit(callback?: () => void): void {
    const submitCallback = callback ?? this.callbacks.onFormSubmit;

    if (!submitCallback) {
      return;
    }

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      const form = getEl(`${this.config.elementName}-form`);

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          submitCallback();
        });
      }
    });
  }

  /**
   * Open the side menu with animation.
   */
  open(): void {
    if (this.isOpen) {
      return;
    }

    // First hide any other open side menus
    this.hideAllSideMenus();

    const element = this.getElement();

    if (element) {
      slideInRight(element, DEFAULTS.ANIMATION_DURATION);
      this.isOpen = true;
      SideMenuComponent.onSideMenuOpened();
      this.callbacks.onOpen?.();
    }
  }

  /**
   * Close the side menu with animation.
   */
  close(): void {
    if (!this.isOpen) {
      return;
    }

    const element = this.getElement();

    if (element) {
      slideOutLeft(element, DEFAULTS.ANIMATION_DURATION);
      this.isOpen = false;
      SideMenuComponent.onSideMenuClosed();
      this.callbacks.onClose?.();
    }
  }

  /**
   * Toggle the side menu open/closed.
   * @returns The new open state.
   */
  toggle(): boolean {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }

    return this.isOpen;
  }

  /**
   * Hide all side menus via the UI manager.
   */
  private hideAllSideMenus(): void {
    if (settingsManager.isMobileModeEnabled) {
      ServiceLocator.getUiManager()?.searchManager?.closeSearch();
    }
    ServiceLocator.getUiManager()?.hideSideMenus();
  }

  /**
   * Called when any side menu is opened.
   * Enables the tutorial button.
   */
  private static onSideMenuOpened(): void {
    getEl('tutorial-btn', true)?.classList.remove('bmenu-item-disabled');
  }

  /**
   * Called when any side menu is closed.
   * Disables the tutorial button.
   */
  private static onSideMenuClosed(): void {
    getEl('tutorial-btn', true)?.classList.add('bmenu-item-disabled');
  }

  /**
   * Get the current DOM element.
   */
  getElement(): HTMLElement | null {
    return this.element ?? getEl(this.config.elementName);
  }

  /**
   * Get the element's current width.
   */
  getWidth(): number {
    const element = this.getElement();

    return element?.offsetWidth ?? this.config.width;
  }

  /**
   * Get the element's bounding rectangle.
   */
  getBoundingRect(): DOMRect | null {
    return this.getElement()?.getBoundingClientRect() ?? null;
  }
}
