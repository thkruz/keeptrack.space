/* eslint-disable max-lines */
import { BottomMenu } from '@app/app/ui/bottom-menu';
import { MenuMode, Singletons } from '@app/engine/core/interfaces';
import { adviceManagerInstance } from '@app/engine/utils/adviceManager';
import { t7e, TranslationKey } from '@app/locales/keys';
import { BaseObject } from '@ootk/src/main';
import Module from 'module';
import { SelectSatManager } from '../../plugins/select-sat-manager/select-sat-manager';
import { SoundNames } from '@app/engine/audio/sounds';
import { PluginRegistry } from '../core/plugin-registry';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { clickAndDragWidth } from '../utils/click-and-drag';
import { html } from '../utils/development/formatter';
import { errorManagerInstance } from '../utils/errorManager';
import { getEl, hideEl } from '../utils/get-el';
import { shake } from '../utils/shake';
import { slideInRight, slideOutLeft } from '../utils/slide';

// Component imports for composition-based architecture
import { BottomIconComponent } from './components/bottom-icon/bottom-icon-component';
import { ContextMenuComponent } from './components/context-menu/context-menu-component';
import { HelpComponent } from './components/help/help-component';
import { KeyboardComponent } from './components/keyboard/keyboard-component';
import { SecondaryMenuComponent } from './components/secondary-menu/secondary-menu-component';
import { SideMenuComponent } from './components/side-menu/side-menu-component';

// Type guard imports for capability detection
import {
  hasBottomIcon,
  hasContextMenu,
  hasDownload,
  hasFormSubmit,
  hasHelp,
  hasKeyboardShortcuts,
  hasSecondaryMenu,
  hasSideMenu,
} from './core/plugin-capabilities';

export interface ClickDragOptions {
  leftOffset?: number;
  isDraggable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  attachedElement?: HTMLElement | null;
  callback?: () => void;
}

export interface SideMenuSettingsOptions {
  /**
   * The width of the side menu's settings sub-menu.
   */
  width: number;
  /**
   * Override for the left offset of the side menu's settings sub-menu.
   * If this is not set then it will default to the right edge of the side menu.
   */
  leftOffset?: number | null;
  /**
   * The z-index of the side menu's settings sub-menu.
   */
  zIndex: number;
}

/**
 * Represents a plugin for KeepTrack.
 */
export abstract class KeepTrackPlugin {
  static readonly bottomIconsContainerId = 'bottom-icons';
  static readonly sideMenuContainerId = 'left-menus';
  static readonly rmbMenuL1ContainerId = 'right-btn-menu-ul';
  static readonly rmbMenuL2ContainerId = 'rmb-wrapper';
  static readonly iconSelectedClassString = 'bmenu-item-selected';
  static readonly iconDisabledClassString = 'bmenu-item-disabled';

  /**
   * This should be the same as the class name, but won't be impacted by minification.
   */
  id: string;

  /**
   * The dependencies of the plugin.
   */
  protected dependencies_: string[] = [];
  /**
   * Whether the plugin's HTML has been added.
   */
  isHtmlAdded: boolean;
  /**
   * Whether the plugin's JavaScript has been added.
   */
  isJsAdded: boolean;
  /**
   * Whether the plugin's menu button is currently active.
   */
  isMenuButtonActive: boolean;

  /**
   * The name of the bottom icon element to select.
   * default: `${bottomIconSlug}-bottom-icon` (requires bottomIconLabel to be defined)
   * @example 'menu-day-night'
   */
  bottomIconElementName: string;

  /**
   * The label of the bottom icon element.
   * This should be set in the localization files! Not in the plugin itself.
   * @example 'Countries'
   */
  bottomIconLabel: string;

  /**
   * The name of the side menu element to show.
   * @example 'countries-menu'
   */
  sideMenuElementName: string;

  /**
   * The title of the side menu.
   * @example 'Countries Menu'
   */
  sideMenuTitle: string;

  /**
   * The html to use for the side menu.
   */
  sideMenuElementHtml: string;

  /**
   * The html to use for the side menu's attached settings menu.
   */
  sideMenuSecondaryHtml: string;

  sideMenuSecondaryOptions: SideMenuSettingsOptions = {
    width: 300,
    leftOffset: null,
    zIndex: 3,
  };

  /**
   * The callback to run when the download icon is clicked.
   * Download icon is automatically added if this is defined.
   */
  downloadIconCb: (() => void) | null = null;

  /**
   * Whether the side menu settings are open.
   */
  isSideMenuSettingsOpen = false;
  /**
   * The title of the help dialog.
   * @example 'Countries Menu'
   */
  helpTitle: string;

  /**
   * The body of the help dialog.
   * @example 'The countries menu allows you to...'
   */
  helpBody: string;

  /**
   * Whether the bottom icon is disabled by default.
   */
  isIconDisabledOnLoad = false;

  /**
   * The image to use for the bottom icon.
   */
  bottomIconImg: Module;

  /**
   * The singleton values for the plugin if it is registered as a singleton.
   * @deprecated
   */
  singletonValue: Singletons;

  /**
   * The callback to run when the bottom icon is clicked.
   * @example () => { console.log('Bottom icon clicked!'); }
   */
  bottomIconCallback: () => void;

  /**
   * Whether the bottom icon is currently disabled.
   */
  isIconDisabled = false;

  /**
   * Whether the side menus must be hidden when the bottom icon is clicked.
   */
  isForceHideSideMenus = false;

  /**
   * Level 1 Context Menu Html for Right Mouse Button
   */
  rmbL1Html: string;

  /**
   * Level 2 Context Menu Html for Right Mouse Button
   */
  rmbL2Html: string;

  /**
   * Callback for Right Mouse Button
   * @param targetId The id of the menu option clicked.
   * @param clickedSat The id of the satellite clicked.
   */
  rmbCallback: (targetId: string, clickedSat?: number) => void;

  /**
   * The name of the element to select for the right mouse button menu.
   */
  rmbL1ElementName: string;

  /**
   * The name of the container of the right mouse button dropdowns
   */
  rmbL2ElementName: string;

  /**
   * The callback to run when the forms submit event is triggered.
   */
  submitCallback: () => void;

  /**
   * Determins if the side menu is adjustable by clicking and dragging.
   */
  dragOptions: ClickDragOptions;
  /**
   * Determines if the side menu's secondary menu is adjustable by clicking and dragging.
   */
  dragOptionsSecondary: ClickDragOptions;
  menuMode: MenuMode[] = [MenuMode.ALL];

  /**
   * The callback to run when the bottom icon is deselected for any reason
   */
  onSetBottomIconToUnselected: () => void;

  /**
   * The icon to use for the secondary menu button.
   * @default 'settings'
   */
  secondaryMenuIcon = 'settings';
  bottomIconOrder: number | null = null;
  /**
   * The maximum order for the bottom icon.
   * This is used to ensure that the bottom icons are sorted correctly.
   */
  static readonly MAX_BOTTOM_ICON_ORDER: number = 600;
  private isInitialized_ = false;

  // ============================================================================
  // Component instances for composition-based architecture
  // These are initialized when config methods are detected on the plugin
  // ============================================================================

  /**
   * Bottom icon component instance (when using composition pattern).
   */
  protected bottomIconComponent_: BottomIconComponent | null = null;

  /**
   * Side menu component instance (when using composition pattern).
   */
  protected sideMenuComponent_: SideMenuComponent | null = null;

  /**
   * Secondary menu component instance (when using composition pattern).
   */
  protected secondaryMenuComponent_: SecondaryMenuComponent | null = null;

  /**
   * Context menu component instance (when using composition pattern).
   */
  protected contextMenuComponent_: ContextMenuComponent | null = null;

  /**
   * Help component instance (when using composition pattern).
   */
  protected helpComponent_: HelpComponent | null = null;

  /**
   * Keyboard component instance (when using composition pattern).
   */
  protected keyboardComponent_: KeyboardComponent | null = null;

  /**
   * Whether this plugin uses the new composition-based architecture.
   * This is automatically set based on the presence of config methods.
   */
  protected usesCompositionPattern_ = false;

  /**
   * Creates a new instance of the KeepTrackPlugin class.
   * @param pluginName The name of the plugin.
   */
  constructor() {
    this.isJsAdded = false;
    this.isHtmlAdded = false;
    this.isMenuButtonActive = false;
  }

  /**
   * Checks if all the dependencies of the plugin are loaded.
   * @returns {void}
   * @throws {Error} If any of the dependencies are not loaded.
   */
  checkDependencies(): void {
    this.dependencies_?.forEach((dependency) => {
      if (!PluginRegistry.checkIfLoaded(dependency)) {
        throw new Error(`${this.constructor.name} depends on ${dependency}. Please adjust the load order of the plugins.`);
      }
    });
  }

  /**
   * Initializes the KeepTrackPlugin by checking its dependencies.
   * @returns void
   */
  init(): void {
    if (this.isInitialized_) {
      throw new Error(`${this.id} is already initialized.`);
    }

    this.checkDependencies();

    if (settingsManager.plugins[this.id]?.isEnabled === false) {
      errorManagerInstance.debug(`${this.id} is disabled in the settings.`);

      return;
    }

    if (settingsManager.plugins[this.id]?.menuMode) {
      this.menuMode = settingsManager.plugins[this.id].menuMode;
    }

    this.bottomIconOrder = settingsManager.plugins?.[this.id]?.order ?? null;

    // Check if this plugin uses the new composition-based architecture
    this.detectAndInitializeComponents_();

    this.addHtml();
    this.addJs();

    // Register help - prefer config method, fall back to properties
    if (hasHelp(this)) {
      const helpConfig = this.getHelpConfig();

      this.helpComponent_ = new HelpComponent(
        this.id,
        helpConfig,
        () => this.isMenuButtonActive,
      );
      this.helpComponent_.init();
    } else if (this.helpTitle && this.helpBody) {
      this.registerHelp(this.helpTitle, this.helpBody);
    } else if (this.helpBody) {
      throw new Error(`${this.id} help title and body must both be defined.`);
    }

    PluginRegistry.addPlugin(this);

    this.isInitialized_ = true;
  }

  /**
   * Detect if this plugin uses config methods and initialize components accordingly.
   * This enables the composition-based architecture when config methods are present.
   */
  private detectAndInitializeComponents_(): void {
    // Check for any config methods to determine if using composition pattern
    this.usesCompositionPattern_ = hasBottomIcon(this) || hasSideMenu(this) ||
      hasSecondaryMenu(this) || hasContextMenu(this) || hasHelp(this) ||
      hasKeyboardShortcuts(this);

    if (!this.usesCompositionPattern_) {
      return;
    }

    // Initialize bottom icon component if config method exists
    if (hasBottomIcon(this)) {
      const config = this.getBottomIconConfig();

      // Sync with legacy properties for backwards compatibility
      this.bottomIconElementName = config.elementName;
      this.bottomIconLabel = config.label;
      this.bottomIconImg = config.image as unknown as Module;
      this.isIconDisabledOnLoad = config.isDisabledOnLoad ?? false;
      if (config.menuMode) {
        this.menuMode = config.menuMode;
      }
      if (config.order !== undefined) {
        this.bottomIconOrder = config.order;
      }

      this.bottomIconComponent_ = new BottomIconComponent(
        this.id,
        config,
        {
          onClick: () => {
            if ('onBottomIconClick' in this && typeof this.onBottomIconClick === 'function') {
              return this.onBottomIconClick();
            }

            return undefined;
          },
          onDeselect: () => {
            if ('onBottomIconDeselect' in this && typeof this.onBottomIconDeselect === 'function') {
              this.onBottomIconDeselect();
            }
          },
        },
      );
    }

    // Initialize side menu component if config method exists
    if (hasSideMenu(this)) {
      const config = this.getSideMenuConfig();

      // Sync with legacy properties for backwards compatibility
      this.sideMenuElementName = config.elementName;
      this.sideMenuTitle = config.title;
      this.sideMenuElementHtml = config.html;
      if (config.dragOptions) {
        this.dragOptions = config.dragOptions as ClickDragOptions;
      }

      this.sideMenuComponent_ = new SideMenuComponent(
        this.id,
        config,
        {
          onOpen: () => {
            if ('onSideMenuOpen' in this && typeof this.onSideMenuOpen === 'function') {
              this.onSideMenuOpen();
            }
          },
          onClose: () => {
            if ('onSideMenuClose' in this && typeof this.onSideMenuClose === 'function') {
              this.onSideMenuClose();
            }
          },
        },
      );
    }

    // Initialize secondary menu component if config method exists
    if (hasSecondaryMenu(this) && hasSideMenu(this)) {
      const config = this.getSecondaryMenuConfig();
      const sideMenuConfig = this.getSideMenuConfig();

      // Sync with legacy properties for backwards compatibility
      this.sideMenuSecondaryHtml = config.html;
      this.sideMenuSecondaryOptions = {
        width: config.width ?? 300,
        leftOffset: config.leftOffset ?? null,
        zIndex: config.zIndex ?? 3,
      };
      if (config.icon) {
        this.secondaryMenuIcon = config.icon;
      }
      if (config.dragOptions) {
        this.dragOptionsSecondary = config.dragOptions as ClickDragOptions;
      }

      this.secondaryMenuComponent_ = new SecondaryMenuComponent(
        this.id,
        sideMenuConfig.elementName,
        config,
        {
          onOpen: () => {
            if ('onSecondaryMenuOpen' in this && typeof this.onSecondaryMenuOpen === 'function') {
              this.onSecondaryMenuOpen();
            }
          },
          onClose: () => {
            if ('onSecondaryMenuClose' in this && typeof this.onSecondaryMenuClose === 'function') {
              this.onSecondaryMenuClose();
            }
          },
          onDownload: hasDownload(this) ? () => this.onDownload() : undefined,
        },
      );
    }

    // Initialize context menu component if config method exists
    if (hasContextMenu(this)) {
      const config = this.getContextMenuConfig();

      // Sync with legacy properties for backwards compatibility
      this.rmbL1Html = config.level1Html;
      this.rmbL1ElementName = config.level1ElementName;
      this.rmbL2Html = config.level2Html;
      this.rmbL2ElementName = config.level2ElementName;
      this.rmbMenuOrder = config.order ?? 100;
      this.isRmbOnEarth = config.isVisibleOnEarth ?? false;
      this.isRmbOffEarth = config.isVisibleOffEarth ?? false;
      this.isRmbOnSat = config.isVisibleOnSatellite ?? false;

      this.contextMenuComponent_ = new ContextMenuComponent(
        this.id,
        config,
        {
          onAction: (targetId: string, clickedSatId?: number) => {
            this.onContextMenuAction(targetId, clickedSatId);
          },
        },
      );
    }

    // Initialize keyboard component if config method exists
    if (hasKeyboardShortcuts(this)) {
      const shortcuts = this.getKeyboardShortcuts();

      this.keyboardComponent_ = new KeyboardComponent(this.id, shortcuts);
      this.keyboardComponent_.init();
    }

    // Sync form submit callback if present
    if (hasFormSubmit(this)) {
      this.submitCallback = () => this.onFormSubmit();
    }

    // Sync download callback if present (and no secondary menu to handle it)
    if (hasDownload(this) && !hasSecondaryMenu(this)) {
      this.downloadIconCb = () => this.onDownload();
    }
  }

  protected isSettingsMenuEnabled_ = true;


  /**
   * Adds HTML for the KeepTrackPlugin.
   * @throws {Error} If HTML has already been added.
   */
  addHtml(): void {
    if (this.isHtmlAdded) {
      throw new Error(`${this.id} HTML already added.`);
    }

    this.sideMenuSecondaryOptions.leftOffset = typeof this.sideMenuSecondaryOptions.leftOffset === 'number' ? this.sideMenuSecondaryOptions.leftOffset : null;

    this.helpTitle = t7e(`plugins.${[this.id]}.title` as TranslationKey) ?? this.helpTitle ?? this.sideMenuTitle;
    this.helpBody = t7e(`plugins.${[this.id]}.helpBody` as TranslationKey) ?? this.helpBody;
    this.sideMenuTitle = t7e(`plugins.${[this.id]}.title` as TranslationKey) ?? this.sideMenuTitle;
    this.bottomIconLabel = t7e(`plugins.${[this.id]}.bottomIconLabel` as TranslationKey) ?? this.bottomIconLabel;

    if (this.bottomIconLabel) {
      const bottomIconSlug = this.bottomIconLabel.toLowerCase().replace(' ', '-');

      this.bottomIconElementName = this.bottomIconElementName ?? `${bottomIconSlug}-bottom-icon`;
    }

    if (this.bottomIconImg || this.bottomIconElementName || this.bottomIconLabel) {
      if (!this.bottomIconElementName || !this.bottomIconLabel) {
        throw new Error(`${this.id} bottom icon element name, image, and label must all be defined.`);
      }
    }

    if (this.bottomIconImg && this.bottomIconElementName) {
      this.addBottomIcon(this.bottomIconImg, this.isIconDisabledOnLoad);
    }

    if (this.sideMenuElementName && this.sideMenuElementHtml) {
      if (this.sideMenuSecondaryHtml) {
        const sideMenuHtmlWrapped = this.generateSideMenuHtml_();

        this.addSideMenu(sideMenuHtmlWrapped);
      } else {
        this.addSideMenu(this.sideMenuElementHtml);
      }
    } else if (this.sideMenuElementName || this.sideMenuElementHtml) {
      throw new Error(`${this.id} side menu element name and html must both be defined.`);
    }

    if (this.sideMenuSecondaryHtml) {
      const sideMenuHtmlWrapped = html`
        <div id="${this.sideMenuElementName}-secondary"
          class="side-menu-parent start-hidden text-select"
          style="z-index: ${this.sideMenuSecondaryOptions.zIndex.toString()};
          width: ${this.sideMenuSecondaryOptions.width.toString()}px;"
        >
          <div id="${this.sideMenuElementName}-secondary-content" class="side-menu-settings" style="padding: 0px 10px;">
            <div class="row"></div>
            ${this.sideMenuSecondaryHtml}
          </div>
        </div>
      `;

      this.addSideMenu(sideMenuHtmlWrapped);

      EventBus.getInstance().on(
        EventBusEvent.uiManagerFinal,
        () => {
          getEl(`${this.sideMenuElementName}-secondary-btn`)?.addEventListener('click', () => {
            if (!this.isSettingsMenuEnabled_) {
              errorManagerInstance.debug('Settings menu is disabled');

              return;
            }

            ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
            if (this.isSideMenuSettingsOpen) {
              this.closeSecondaryMenu();

              const settingsButtonElement = getEl(`${this.sideMenuElementName}-secondary-btn`);

              if (settingsButtonElement) {
                settingsButtonElement.style.color = 'var(--color-dark-text-accent)';
              }
            } else {
              this.openSecondaryMenu();
              const settingsButtonElement = getEl(`${this.sideMenuElementName}-secondary-btn`);

              if (settingsButtonElement) {
                settingsButtonElement.style.color = 'var(--statusDarkNormal)';
              }
            }
          });

          if (this.downloadIconCb) {
            getEl(`${this.sideMenuElementName}-download-btn`)?.addEventListener('click', () => {
              ServiceLocator.getSoundManager()?.play(SoundNames.EXPORT);

              if (this.downloadIconCb) {
                this.downloadIconCb();
              }
            });
          }
        },
      );
    }

    if (this.submitCallback) {
      this.registerSubmitButtonClicked(this.submitCallback);
    }

    if (this.dragOptions) {
      this.registerClickAndDragOptions(this.dragOptions);
    }

    if (this.dragOptionsSecondary) {
      this.registerClickAndDragOptionsSecondary(this.dragOptionsSecondary);
    }

    if ((this.rmbL1Html || this.rmbL2Html) && !this.rmbCallback) {
      throw new Error(`${this.id} right mouse button callback must be defined if right mouse button html is defined.`);
    }

    if (this.rmbL1Html && this.rmbL1ElementName && this.rmbL2Html && this.rmbL2ElementName) {
      ServiceLocator.getInputManager().rmbMenuItems.push({
        elementIdL1: this.rmbL1ElementName,
        elementIdL2: this.rmbL2ElementName,
        order: this.rmbMenuOrder,
        isRmbOnEarth: this.isRmbOnEarth,
        isRmbOffEarth: this.isRmbOffEarth,
        isRmbOnSat: this.isRmbOnSat,
      });
      this.addContextMenuLevel1Item(this.rmbL1Html);
      this.addContextMenuLevel2Item(this.rmbL2ElementName, this.rmbL2Html);
    } else if (this.rmbL1Html || this.rmbL1ElementName || this.rmbL2Html || this.rmbL2ElementName) {
      throw new Error(`${this.id} right mouse button level 1 html, element name, level 2 html, and element name must all be defined.`);
    }

    this.isHtmlAdded = true;
  }

  rmbMenuOrder: number = 100;

  /**
   * Whether the context menu opens when earth is clicked
   */
  isRmbOnEarth = false;

  /**
   * Whether the context menu opens when earth is not clicked (space)
   */
  isRmbOffEarth = false;

  /**
   * Whether the context menu opens when a satellite is clicked
   */
  isRmbOnSat = false;

  private generateSideMenuHtml_() {
    const menuWidthStr = `${this.sideMenuSecondaryOptions.width.toString()} px !important`;
    const downloadIconHtml = this.downloadIconCb ? html`
      <button id="${this.sideMenuElementName}-download-btn";
        class="center-align btn btn-ui waves-effect waves-light"
        style="padding: 2px; margin: 0px 0px 0px 5px; color: var(--color-dark-text-accent); background-color: rgba(0, 0, 0, 0);box-shadow: none;"
        type="button">
        <i class="material-icons" style="font-size: 2em;height: 30px;width: 30px;display: flex;justify-content: center;align-items: center;">
          file_download
        </i>
      </button>
    ` : '';
    const settingsIconHtml = html`
      <button id="${this.sideMenuElementName}-secondary-btn"
        class="center-align btn btn-ui waves-effect waves-light"
        style="padding: 2px; margin: 0px 0px 0px 5px; color: var(--color-dark-text-accent); background-color: rgba(0, 0, 0, 0);box-shadow: none;"
        type="button">
        <i class="material-icons" style="font-size: 2em;height: 30px;width: 30px;display: flex;justify-content: center;align-items: center;">
          ${this.secondaryMenuIcon}
        </i>
      </button>`;
    const spacerDiv = html`<div style="width: 30px; height: 30px; display: block; margin: 0px 5px 0px 0px;"></div>`;

    const sideMenuHtmlWrapped = html`
          <div id="${this.sideMenuElementName}" class="side-menu-parent start-hidden text-select"
            style="z-index: 5; width: ${menuWidthStr};">
            <div id="${this.sideMenuElementName}-content" class="side-menu">
              <div class="row" style="margin-top: 5px;margin-bottom: 0px;display: flex;justify-content: space-evenly;align-items: center;flex-direction: row;flex-wrap: nowrap;">
                ${spacerDiv}
                ${this.downloadIconCb ? spacerDiv : ''}
                <h5 class="center-align" style="margin: 0px auto">${this.sideMenuTitle}</h5>
                ${downloadIconHtml}
                ${settingsIconHtml}
              </div>
              <li class="divider" style="padding: 2px !important;"></li>
              <div class="row"></div>
              ${this.sideMenuElementHtml}
            </div>
          </div>`;


    return sideMenuHtmlWrapped;
  }

  /**
   * Adds the JS for the KeepTrackPlugin.
   * @throws {Error} If the JS has already been added.
   */
  addJs(): void {
    if (this.isJsAdded) {
      throw new Error(`${this.id} JS already added.`);
    }

    if (this.bottomIconElementName) {
      if (this.bottomIconCallback) {
        this.registerBottomMenuClicked(this.bottomIconCallback);
      } else {
        this.registerBottomMenuClicked();
      }
    }

    if (this.sideMenuElementName) {
      this.registerHideSideMenu(this.bottomIconElementName, this.closeSideMenu.bind(this));
    }

    if (this.sideMenuSecondaryHtml) {
      this.registerHideSideMenu(this.bottomIconElementName, this.closeSecondaryMenu.bind(this));
    }

    if (this.rmbCallback) {
      this.registerRmbCallback(this.rmbCallback);
    }

    if (this.bottomIconElementName) {
      this.registerMenuMode();
      this.menuMode.forEach((menuMode) => {
        KeepTrackPlugin.registeredMenus[menuMode].push(this.bottomIconElementName);
      });
    }

    this.isJsAdded = true;
  }

  static readonly registeredMenus = {
    [MenuMode.BASIC]: [] as string[],
    [MenuMode.ADVANCED]: [] as string[],
    [MenuMode.ANALYSIS]: [] as string[],
    [MenuMode.EXPERIMENTAL]: [] as string[],
    [MenuMode.SETTINGS]: [] as string[],
    [MenuMode.ALL]: [] as string[],
  };

  static hideUnusedMenuModes(): void {
    for (const menuMode in Object.keys(KeepTrackPlugin.registeredMenus)) {
      if (Object.hasOwn(KeepTrackPlugin.registeredMenus, menuMode)) {
        const menuElements = KeepTrackPlugin.registeredMenus[menuMode];

        if (menuElements.length === 0) {
          switch (parseInt(menuMode)) {
            case MenuMode.BASIC:
              hideEl(BottomMenu.basicMenuId);
              break;
            case MenuMode.ADVANCED:
              hideEl(BottomMenu.advancedMenuId);
              break;
            case MenuMode.ANALYSIS:
              hideEl(BottomMenu.analysisMenuId);
              break;
            case MenuMode.SETTINGS:
              hideEl(BottomMenu.settingsMenuId);
              break;
            case MenuMode.EXPERIMENTAL:
              hideEl(BottomMenu.experimentalMenuId);
              break;
            default:
              break;
          }
        }
      }
    }
  }

  registerMenuMode(): void {
    EventBus.getInstance().on(EventBusEvent.bottomMenuModeChange, (): void => {
      this.hideBottomIcon();
      if (this.menuMode.includes(settingsManager.activeMenuMode)) {
        this.showBottomIcon();
      }
    });
  }

  showBottomIcon(): void {
    if (!this.bottomIconImg) {
      return;
    }

    const bottomIconElement = getEl(this.bottomIconElementName);

    if (bottomIconElement) {
      bottomIconElement.style.display = 'block';
    }
  }

  hideBottomIcon(): void {
    if (!this.bottomIconImg) {
      return;
    }

    const bottomIconElement = getEl(this.bottomIconElementName);

    if (bottomIconElement) {
      bottomIconElement.style.display = 'none';
    }
  }

  registerRmbCallback(callback: (targetId: string, clickedSatId?: number) => void): void {
    EventBus.getInstance().on(EventBusEvent.rmbMenuActions, callback);
  }

  addContextMenuLevel1Item(html: string): void {
    EventBus.getInstance().on(
      EventBusEvent.rightBtnMenuAdd,
      () => {
        const item = document.createElement('div');

        item.innerHTML = html;

        // Trim empty child nodes
        item.childNodes.forEach((child) => {
          if (child.nodeType === 3 && child.textContent?.trim() === '') {
            item.removeChild(child);
          }
        });

        const lastChild = item.lastChild;

        // Replace outer element with first child
        if (lastChild) {
          getEl(KeepTrackPlugin.rmbMenuL1ContainerId)?.appendChild(lastChild);
        }
      },
    );
  }

  addContextMenuLevel2Item(elementId: string, html: string): void {
    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        const item = document.createElement('div');

        item.id = elementId;
        item.className = 'right-btn-menu';
        item.innerHTML = html;
        getEl(KeepTrackPlugin.rmbMenuL2ContainerId)?.appendChild(item);
      },
    );
  }

  /**
   * Registers a callback function to add the bottom icon element to the bottom menu.
   * @param icon The icon to add to the bottom menu.
   */
  addBottomIcon(icon: Module, isDisabled = false): void {
    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        const button = document.createElement('div');

        button.id = this.bottomIconElementName;
        // embed an order id to allow for sorting
        button.setAttribute('data-order', this.bottomIconOrder?.toString() ?? KeepTrackPlugin.MAX_BOTTOM_ICON_ORDER.toString());
        button.classList.add('bmenu-item');
        if (isDisabled) {
          button.classList.add('bmenu-item-disabled');
        }
        button.innerHTML = `
          <div class="bmenu-item-inner">
            <img
              alt="${this.id}"
              src=""
              delayedsrc="${icon}"
            />
          </div>
          <span class="bmenu-title">${this.bottomIconLabel}</span>
          `;
        getEl(KeepTrackPlugin.bottomIconsContainerId)?.appendChild(button);
      },
    );
  }

  shakeBottomIcon(): void {
    shake(getEl(this.bottomIconElementName));
  }

  setBottomIconToSelected(): void {
    if (this.isMenuButtonActive) {
      return;
    }
    this.isMenuButtonActive = true;
    getEl(this.bottomIconElementName)?.classList.add('bmenu-item-selected');
  }

  setBottomIconToUnselected(isHideSideMenus = true): void {
    if (!this.isMenuButtonActive) {
      return;
    }
    this.isMenuButtonActive = false;
    if (this.onSetBottomIconToUnselected) {
      this.onSetBottomIconToUnselected();
    }
    if (isHideSideMenus) {
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
    }
    getEl(this.bottomIconElementName)?.classList.remove('bmenu-item-selected');
  }

  setBottomIconToDisabled(isHideSideMenus = true): void {
    if (this.isIconDisabled) {
      return;
    }
    this.setBottomIconToUnselected(isHideSideMenus);
    this.isIconDisabled = true;
    getEl(this.bottomIconElementName)?.classList.add('bmenu-item-disabled');
  }

  setBottomIconToEnabled(): void {
    if (!this.isIconDisabled) {
      return;
    }
    this.isIconDisabled = false;
    getEl(this.bottomIconElementName)?.classList.remove('bmenu-item-disabled');
  }

  /**
   * Requires the user to select a sensor before opening their bottom menu.
   */
  isRequireSensorSelected = false;

  verifySensorSelected(isMakeToast = true): boolean {
    if (!ServiceLocator.getSensorManager().isSensorSelected()) {
      if (isMakeToast) {
        errorManagerInstance.warn(t7e('errorMsgs.SelectSensorFirst'), true);
        shake(getEl(this.bottomIconElementName));
      }

      return false;
    }

    return true;
  }

  /**
   * Requires the user to select a satellite before opening their bottom menu.
   */
  isRequireSatelliteSelected = false;

  verifySatelliteSelected(): boolean {
    /*
     * const searchDom = getEl('search', true);
     * if (!selectSatManagerInstance || (selectSatManagerInstance?.selectedSat === -1 && (!searchDom || (<HTMLInputElement>searchDom).value === ''))) {
     */
    if ((PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) <= -1) {
      errorManagerInstance.warn(t7e('errorMsgs.SelectSatelliteFirst'), true);
      shake(getEl(this.bottomIconElementName));

      return false;
    }

    return true;
  }

  addSideMenu(sideMenuHtml: string): void {
    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      getEl(KeepTrackPlugin.sideMenuContainerId)?.insertAdjacentHTML('beforeend', sideMenuHtml);
    });
  }

  /**
   * Registers a callback function to show the side menu and select the bottom icon element.
   * @param callback The callback function to run when the bottom icon is clicked. This is run
   * even if the bottom icon is disabled.
   */
  registerBottomMenuClicked(callback: () => void = () => {
    // Do Nothing
  }) {
    if (this.isRequireSensorSelected && this.isRequireSatelliteSelected) {
      EventBus.getInstance().on(
        EventBusEvent.selectSatData,
        (obj: BaseObject): void => {
          if (!obj?.isSatellite() || !ServiceLocator.getSensorManager().isSensorSelected()) {
            this.setBottomIconToDisabled();
            this.setBottomIconToUnselected();
          } else {
            this.setBottomIconToEnabled();
          }
        },
      );
    }
    if (this.isRequireSatelliteSelected && !this.isRequireSensorSelected) {
      EventBus.getInstance().on(
        EventBusEvent.selectSatData,
        (obj: BaseObject): void => {
          if (!obj) {
            this.setBottomIconToDisabled();
            this.setBottomIconToUnselected();
          } else {
            this.setBottomIconToEnabled();
          }
        },
      );
    }

    if (this.isRequireSensorSelected && !this.isRequireSatelliteSelected) {
      EventBus.getInstance().on(
        EventBusEvent.setSensor,
        (sensor, sensorId): void => {
          if (!sensor && !sensorId) {
            this.setBottomIconToDisabled();
            this.setBottomIconToUnselected();
          } else {
            this.setBottomIconToEnabled();
          }
        },
      );
    }

    EventBus.getInstance().on(
      EventBusEvent.bottomMenuClick,
      (iconName: string): void => {
        if (iconName === this.bottomIconElementName) {
          if (this.isMenuButtonActive) {
            if (this.sideMenuElementName || this.isForceHideSideMenus) {
              this.hideSideMenus();
            }
            this.isMenuButtonActive = false;
            getEl(this.bottomIconElementName)?.classList.remove(KeepTrackPlugin.iconSelectedClassString);
          } else {
            // Verifiy that the user has selected a sensor and/or satellite if required
            if (this.isRequireSensorSelected) {
              if (!this.verifySensorSelected()) {
                return;
              }
            }

            if (this.isRequireSatelliteSelected) {
              if (!this.verifySatelliteSelected()) {
                return;
              }
            }

            // If the icon is disabled, skip automatically selecting it
            if (!this.isIconDisabled) {
              // Show the side menu if it exists
              if (this.sideMenuElementName) {
                this.openSideMenu();
              }

              // Show the bottom icon as selected
              this.isMenuButtonActive = true;
              getEl(this.bottomIconElementName)?.classList.add(KeepTrackPlugin.iconSelectedClassString);
            }
          }

          // If a callback is defined, call it even if the icon is disabled
          if (callback) {
            // eslint-disable-next-line callback-return
            callback();
          }
        }
      },
    );
  }

  bottomMenuClicked() {
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, this.bottomIconElementName);
  }

  protected static genH5Title_(title: string): string {
    return html`
      <div class="divider flow5out"></div>
        <h5 class="center-align side-menu-row-header">${title}</h5>
      <div class="divider flow5out"></div>
    `;
  }

  hideSideMenus(): void {
    if (settingsManager.isMobileModeEnabled) {
      ServiceLocator.getUiManager().searchManager.closeSearch();
    }
    ServiceLocator.getUiManager().hideSideMenus();
    this.isMenuButtonActive = false;
  }

  openSideMenu() {
    this.hideSideMenus();
    slideInRight(getEl(this.sideMenuElementName), 1000);
    KeepTrackPlugin.openSideMenu_();
  }

  /**
   * This runs after a side menu is opened.
   */
  private static openSideMenu_() {
    getEl('tutorial-btn', true)?.classList.remove('bmenu-item-disabled');
  }

  private static closeSideMenu_() {
    getEl('tutorial-btn', true)?.classList.add('bmenu-item-disabled');
  }

  openSecondaryMenu() {
    const secondaryMenuElement = getEl(`${this.sideMenuElementName}-secondary`);
    const sideMenuElement = getEl(this.sideMenuElementName);

    if (secondaryMenuElement) {
      this.isSideMenuSettingsOpen = true;
      if (this.sideMenuSecondaryOptions.leftOffset !== null) {
        secondaryMenuElement.style.left = `${this.sideMenuSecondaryOptions.leftOffset}px`;
      } else {
        secondaryMenuElement.style.left = `${sideMenuElement?.getBoundingClientRect().right ?? 0}px`;
      }
      slideInRight(secondaryMenuElement, 1000);
    }
  }

  closeSideMenu() {
    const settingsMenuElement = getEl(`${this.sideMenuElementName}`);

    slideOutLeft(settingsMenuElement, 1000);
    KeepTrackPlugin.closeSideMenu_();
  }

  closeSecondaryMenu() {
    this.isSideMenuSettingsOpen = false;
    const secondaryButtonElement = getEl(`${this.sideMenuElementName}-secondary-btn`);

    if (secondaryButtonElement) {
      secondaryButtonElement.style.color = 'var(--color-dark-text-accent)';
    }
    slideOutLeft(getEl(`${this.sideMenuElementName}-secondary`), 1500, null, -300);
  }

  registerSubmitButtonClicked(callback: ((() => void) | null) = null) {
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        const form = getEl(`${this.sideMenuElementName}-form`);

        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (callback) {
              // eslint-disable-next-line callback-return
              callback();
            }
          });
        } else {
          throw new Error(`Form not found for ${this.sideMenuElementName}`);
        }
      },
    );
  }

  registerClickAndDragOptions(opts: ClickDragOptions = {} as ClickDragOptions): void {
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        if (this.sideMenuSecondaryHtml) {
          opts.attachedElement = getEl(`${this.sideMenuElementName}-secondary`);
        }
        if (this.sideMenuSecondaryOptions.leftOffset) {
          opts.leftOffset = this.sideMenuSecondaryOptions.leftOffset;
        }
        clickAndDragWidth(getEl(this.sideMenuElementName), opts);
      },
    );
  }

  registerClickAndDragOptionsSecondary(opts: ClickDragOptions = {} as ClickDragOptions): void {
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        const edgeEl = clickAndDragWidth(getEl(`${this.sideMenuElementName}-secondary`), opts);

        if (edgeEl) {
          edgeEl.style.top = '0px';
          edgeEl.style.position = 'absolute';
        }
      },
    );
  }

  /**
   * Registers a callback function to show help text when the help menu button is clicked.
   * @param helpTitle The title of the help text to show.
   * @param helpText The help text to show.
   */
  registerHelp(helpTitle: string, helpText: string) {
    EventBus.getInstance().on(
      EventBusEvent.onHelpMenuClick,
      (): boolean => {
        if (this.isMenuButtonActive) {
          adviceManagerInstance.showAdvice(helpTitle, helpText);

          return true;
        }

        return false;
      },
    );
  }

  /**
   * Registers a callback function to hide the side menu and deselect the bottom icon element.
   * @param bottomIconElementName The name of the bottom icon element to deselect.
   * @param slideCb The callback function to run when the side menu is hidden.
   */
  registerHideSideMenu(bottomIconElementName: string, slideCb: () => void): void {
    EventBus.getInstance().on(
      EventBusEvent.hideSideMenus,
      (): void => {
        slideCb();
        getEl(bottomIconElementName)?.classList.remove(KeepTrackPlugin.iconSelectedClassString);
        this.isMenuButtonActive = false;
      },
    );
  }
}
