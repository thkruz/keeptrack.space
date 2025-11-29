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
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { slideInRight, slideOutLeft } from '@app/engine/utils/slide';
import { SoundNames } from '@app/engine/audio/sounds';
import { ISecondaryMenuConfig } from '../../core/plugin-capabilities';
import { SideMenuComponent } from '../side-menu/side-menu-component';

/**
 * Default values for secondary menu configuration.
 */
const DEFAULTS = {
  CONTAINER_ID: 'left-menus',
  WIDTH: 300,
  Z_INDEX: 3,
  ICON: 'settings',
  ANIMATION_DURATION: 1000,
  CLOSE_OFFSET: -300,
} as const;

/**
 * Callbacks that can be provided to the SecondaryMenuComponent.
 */
export interface SecondaryMenuCallbacks {
  /**
   * Called when the secondary menu is opened.
   */
  onOpen?: () => void;

  /**
   * Called when the secondary menu is closed.
   */
  onClose?: () => void;

  /**
   * Called when the download button is clicked.
   */
  onDownload?: () => void;
}

/**
 * Component that manages a secondary (settings) menu for a plugin.
 *
 * This component is typically used alongside a SideMenuComponent to provide
 * additional settings or options that appear to the right of the main side menu.
 *
 * This component encapsulates all the logic for:
 * - Creating and managing the DOM element
 * - Opening/closing with animations
 * - Settings button toggle
 * - Download button (optional)
 * - Click-and-drag resizing
 */
export class SecondaryMenuComponent {
  private readonly config: Required<Omit<ISecondaryMenuConfig, 'dragOptions' | 'leftOffset'>> & Pick<ISecondaryMenuConfig, 'dragOptions' | 'leftOffset'>;
  private readonly pluginId: string;
  private readonly sideMenuElementName: string;
  private readonly callbacks: SecondaryMenuCallbacks;

  private isOpen = false;
  private isEnabled = true;
  private isInitialized = false;
  private element: HTMLElement | null = null;

  /**
   * Creates a new SecondaryMenuComponent.
   * @param pluginId The ID of the plugin this menu belongs to.
   * @param sideMenuElementName The element name of the parent side menu.
   * @param config The configuration for the secondary menu.
   * @param callbacks Optional callbacks for menu events.
   */
  constructor(
    pluginId: string,
    sideMenuElementName: string,
    config: ISecondaryMenuConfig,
    callbacks: SecondaryMenuCallbacks = {},
  ) {
    this.pluginId = pluginId;
    this.sideMenuElementName = sideMenuElementName;
    this.callbacks = callbacks;

    // Apply defaults to config
    this.config = {
      html: config.html,
      width: config.width ?? DEFAULTS.WIDTH,
      zIndex: config.zIndex ?? DEFAULTS.Z_INDEX,
      icon: config.icon ?? DEFAULTS.ICON,
      leftOffset: config.leftOffset,
      dragOptions: config.dragOptions,
    };
  }

  /**
   * Gets the DOM element ID for this menu.
   */
  get elementName(): string {
    return `${this.sideMenuElementName}-secondary`;
  }

  /**
   * Gets the button element ID.
   */
  get buttonElementName(): string {
    return `${this.sideMenuElementName}-secondary-btn`;
  }

  /**
   * Gets whether the menu is currently open.
   */
  get opened(): boolean {
    return this.isOpen;
  }

  /**
   * Gets/sets whether the menu is enabled.
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  set enabled(value: boolean) {
    this.isEnabled = value;
  }

  /**
   * Initialize the component by creating the DOM element and registering events.
   * @param parentSideMenu Optional reference to the parent side menu for positioning.
   */
  init(parentSideMenu?: SideMenuComponent): void {
    if (this.isInitialized) {
      throw new Error(`SecondaryMenuComponent for ${this.pluginId} is already initialized.`);
    }

    this.registerDomCreation();
    this.registerButtonHandler(parentSideMenu);
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
   * Generate the HTML for the secondary menu wrapper.
   */
  generateHtml(): string {
    return html`
      <div id="${this.elementName}"
        class="side-menu-parent start-hidden text-select"
        style="z-index: ${this.config.zIndex.toString()};
        width: ${this.config.width.toString()}px;"
      >
        <div id="${this.elementName}-content" class="side-menu-settings" style="padding: 0px 10px;">
          <div class="row"></div>
          ${this.config.html}
        </div>
      </div>
    `;
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
   * Create the DOM element for the secondary menu.
   */
  private createDomElement(): void {
    const container = getEl(DEFAULTS.CONTAINER_ID);

    if (container) {
      container.insertAdjacentHTML('beforeend', this.generateHtml());
      this.element = getEl(this.elementName);
    }
  }

  /**
   * Register the settings button click handler.
   * @param parentSideMenu Optional reference to the parent side menu for positioning.
   */
  private registerButtonHandler(parentSideMenu?: SideMenuComponent): void {
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      const button = getEl(this.buttonElementName);

      button?.addEventListener('click', () => {
        if (!this.isEnabled) {
          return;
        }

        ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);

        if (this.isOpen) {
          this.close();
        } else {
          this.open(parentSideMenu);
        }
      });

      // Register download button if callback provided
      if (this.callbacks.onDownload) {
        const downloadBtn = getEl(`${this.sideMenuElementName}-download-btn`);

        downloadBtn?.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.EXPORT);
          this.callbacks.onDownload?.();
        });
      }
    });
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
        const edgeEl = clickAndDragWidth(this.getElement(), this.config.dragOptions);

        if (edgeEl) {
          edgeEl.style.top = '0px';
          edgeEl.style.position = 'absolute';
        }
      }
    });
  }

  /**
   * Open the secondary menu with animation.
   * @param parentSideMenu Optional reference to the parent side menu for positioning.
   */
  open(parentSideMenu?: SideMenuComponent): void {
    if (this.isOpen || !this.isEnabled) {
      return;
    }

    const element = this.getElement();

    if (element) {
      // Position the menu
      if (this.config.leftOffset !== null && typeof this.config.leftOffset !== 'undefined') {
        element.style.left = `${this.config.leftOffset}px`;
      } else {
        const sideMenuRect = parentSideMenu?.getBoundingRect() ?? getEl(this.sideMenuElementName)?.getBoundingClientRect();

        element.style.left = `${sideMenuRect?.right ?? 0}px`;
      }

      slideInRight(element, DEFAULTS.ANIMATION_DURATION);
      this.isOpen = true;
      this.updateButtonStyle(true);
      this.callbacks.onOpen?.();
    }
  }

  /**
   * Close the secondary menu with animation.
   */
  close(): void {
    if (!this.isOpen) {
      return;
    }

    const element = this.getElement();

    if (element) {
      slideOutLeft(element, DEFAULTS.ANIMATION_DURATION * 1.5, null, DEFAULTS.CLOSE_OFFSET);
      this.isOpen = false;
      this.updateButtonStyle(false);
      this.callbacks.onClose?.();
    }
  }

  /**
   * Toggle the secondary menu open/closed.
   * @param parentSideMenu Optional reference to the parent side menu for positioning.
   * @returns The new open state.
   */
  toggle(parentSideMenu?: SideMenuComponent): boolean {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(parentSideMenu);
    }

    return this.isOpen;
  }

  /**
   * Update the button style based on open state.
   * @param isOpen Whether the menu is open.
   */
  private updateButtonStyle(isOpen: boolean): void {
    const button = getEl(this.buttonElementName);

    if (button) {
      button.style.color = isOpen
        ? 'var(--statusDarkNormal)'
        : 'var(--color-dark-text-accent)';
    }
  }

  /**
   * Get the current DOM element.
   */
  getElement(): HTMLElement | null {
    return this.element ?? getEl(this.elementName);
  }
}
