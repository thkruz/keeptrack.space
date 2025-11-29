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

import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { shake } from '@app/engine/utils/shake';
import { IBottomIconConfig } from '../../core/plugin-capabilities';

/**
 * CSS class constants for bottom icon states.
 */
const CSS_CLASSES = {
  ITEM: 'bmenu-item',
  SELECTED: 'bmenu-item-selected',
  DISABLED: 'bmenu-item-disabled',
} as const;

/**
 * Default values for bottom icon configuration.
 */
const DEFAULTS = {
  MAX_ORDER: 600,
  CONTAINER_ID: 'bottom-icons',
} as const;

/**
 * Callbacks that can be provided to the BottomIconComponent.
 */
export interface BottomIconCallbacks {
  /**
   * Called when the icon is clicked.
   * Return false to prevent default toggle behavior.
   */
  onClick?: () => void | boolean;

  /**
   * Called when the icon is deselected.
   */
  onDeselect?: () => void;

  /**
   * Called to verify if requirements are met (e.g., sensor/satellite selected).
   * Return false to prevent icon activation.
   */
  onVerifyRequirements?: () => boolean;

  /**
   * Called when the icon should trigger side menu toggle.
   */
  onToggleSideMenu?: (isOpening: boolean) => void;
}

/**
 * Component that manages a bottom menu icon for a plugin.
 *
 * This component encapsulates all the logic for:
 * - Creating and managing the DOM element
 * - Handling selection/deselection state
 * - Handling enabled/disabled state
 * - Visual feedback (shake animation)
 * - Event handling
 */
export class BottomIconComponent {
  private readonly config: Required<IBottomIconConfig>;
  private readonly pluginId: string;
  private readonly callbacks: BottomIconCallbacks;

  private isSelected = false;
  private isDisabled = false;
  private isInitialized = false;
  private element: HTMLElement | null = null;

  /**
   * Creates a new BottomIconComponent.
   * @param pluginId The ID of the plugin this icon belongs to.
   * @param config The configuration for the bottom icon.
   * @param callbacks Optional callbacks for icon events.
   */
  constructor(
    pluginId: string,
    config: IBottomIconConfig,
    callbacks: BottomIconCallbacks = {},
  ) {
    this.pluginId = pluginId;
    this.callbacks = callbacks;

    // Apply defaults to config
    this.config = {
      elementName: config.elementName,
      label: config.label,
      image: config.image,
      menuMode: config.menuMode ?? [MenuMode.ALL],
      order: config.order ?? DEFAULTS.MAX_ORDER,
      isDisabledOnLoad: config.isDisabledOnLoad ?? false,
    };
  }

  /**
   * Gets the DOM element ID for this icon.
   */
  get elementName(): string {
    return this.config.elementName;
  }

  /**
   * Gets whether the icon is currently selected.
   */
  get selected(): boolean {
    return this.isSelected;
  }

  /**
   * Gets whether the icon is currently disabled.
   */
  get disabled(): boolean {
    return this.isDisabled;
  }

  /**
   * Gets the menu modes this icon is visible in.
   */
  get menuModes(): MenuMode[] {
    return [...this.config.menuMode];
  }

  /**
   * Initialize the component by creating the DOM element and registering events.
   */
  init(): void {
    if (this.isInitialized) {
      throw new Error(`BottomIconComponent for ${this.pluginId} is already initialized.`);
    }

    this.registerDomCreation();
    this.registerClickHandler();
    this.registerMenuModeHandler();

    this.isDisabled = this.config.isDisabledOnLoad;
    this.isInitialized = true;
  }

  /**
   * Clean up the component by removing the DOM element and unregistering events.
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.isInitialized = false;
    this.isSelected = false;
    this.isDisabled = false;
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
   * Create the DOM element for the bottom icon.
   */
  private createDomElement(): void {
    const button = document.createElement('div');

    button.id = this.config.elementName;
    button.setAttribute('data-order', this.config.order.toString());
    button.classList.add(CSS_CLASSES.ITEM);

    if (this.config.isDisabledOnLoad) {
      button.classList.add(CSS_CLASSES.DISABLED);
    }

    button.innerHTML = `
      <div class="bmenu-item-inner">
        <img
          alt="${this.pluginId}"
          src=""
          delayedsrc="${this.config.image}"
        />
      </div>
      <span class="bmenu-title">${this.config.label}</span>
    `;

    const container = getEl(DEFAULTS.CONTAINER_ID);

    if (container) {
      container.appendChild(button);
      this.element = button;
    }
  }

  /**
   * Register the click handler for the bottom icon.
   */
  private registerClickHandler(): void {
    EventBus.getInstance().on(EventBusEvent.bottomMenuClick, (iconName: string) => {
      if (iconName !== this.config.elementName) {
        return;
      }

      this.handleClick();
    });
  }

  /**
   * Handle a click on the bottom icon.
   */
  private handleClick(): void {
    if (this.isSelected) {
      // Deselecting
      this.callbacks.onToggleSideMenu?.(false);
      this.deselect(false); // Don't emit hideSideMenus since we're handling it
    } else {
      // Selecting - first verify requirements
      if (this.callbacks.onVerifyRequirements) {
        if (!this.callbacks.onVerifyRequirements()) {
          return;
        }
      }

      // If disabled, don't allow selection but still call callback
      if (!this.isDisabled) {
        this.callbacks.onToggleSideMenu?.(true);
        this.select();
      }
    }

    // Always call onClick callback, even if disabled
    this.callbacks.onClick?.();
  }

  /**
   * Register the menu mode change handler.
   */
  private registerMenuModeHandler(): void {
    EventBus.getInstance().on(EventBusEvent.bottomMenuModeChange, () => {
      this.updateVisibilityForMenuMode();
    });
  }

  /**
   * Update visibility based on current menu mode.
   */
  private updateVisibilityForMenuMode(): void {
    const currentMode = settingsManager.activeMenuMode;

    if (this.config.menuMode.includes(currentMode)) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Select the icon (mark as active).
   */
  select(): void {
    if (this.isSelected) {
      return;
    }

    this.isSelected = true;
    this.element?.classList.add(CSS_CLASSES.SELECTED);
  }

  /**
   * Deselect the icon (mark as inactive).
   * @param emitHideSideMenus Whether to emit the hideSideMenus event.
   */
  deselect(emitHideSideMenus = true): void {
    if (!this.isSelected) {
      return;
    }

    this.isSelected = false;
    this.callbacks.onDeselect?.();

    if (emitHideSideMenus) {
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
    }

    this.element?.classList.remove(CSS_CLASSES.SELECTED);
  }

  /**
   * Enable the icon.
   */
  enable(): void {
    if (!this.isDisabled) {
      return;
    }

    this.isDisabled = false;
    this.element?.classList.remove(CSS_CLASSES.DISABLED);
  }

  /**
   * Disable the icon.
   * @param alsoDeselect Whether to also deselect the icon.
   */
  disable(alsoDeselect = true): void {
    if (this.isDisabled) {
      return;
    }

    if (alsoDeselect) {
      this.deselect();
    }

    this.isDisabled = true;
    this.element?.classList.add(CSS_CLASSES.DISABLED);
  }

  /**
   * Show the icon (make visible).
   */
  show(): void {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  /**
   * Hide the icon (make invisible).
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Shake the icon to draw attention to it.
   */
  shake(): void {
    shake(this.element);
  }

  /**
   * Toggle the selected state.
   * @returns The new selected state.
   */
  toggle(): boolean {
    if (this.isSelected) {
      this.deselect();
    } else {
      this.select();
    }

    return this.isSelected;
  }

  /**
   * Get the current DOM element.
   */
  getElement(): HTMLElement | null {
    return this.element ?? getEl(this.config.elementName);
  }
}
