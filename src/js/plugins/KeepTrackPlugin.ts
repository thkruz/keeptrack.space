import { SatObject, SensorObject, Singletons } from '@app/js/interfaces';
import { adviceManagerInstance } from '@app/js/singletons/adviceManager';
import Module from 'module';
import { KeepTrackApiEvents, keepTrackApi } from '../keepTrackApi';
import { clickAndDragWidth } from '../lib/click-and-drag';
import { getEl } from '../lib/get-el';
import { shake } from '../lib/shake';
import { slideInRight, slideOutLeft } from '../lib/slide';
import { errorManagerInstance } from '../singletons/errorManager';

export interface clickDragOptions {
  isDraggable?: boolean;
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Represents a plugin for KeepTrack.
 */
export class KeepTrackPlugin {
  static readonly bottomIconsContainerId = 'bottom-icons';
  static readonly sideMenuContainerId = 'left-menus';
  static readonly rmbMenuL1ContainerId = 'right-btn-menu-ul';
  static readonly rmbMenuL2ContainerId = 'rmb-wrapper';
  static readonly iconSelectedClassString = 'bmenu-item-selected';
  static readonly iconDisabledClassString = 'bmenu-item-disabled';

  /**
   * The name of the plugin.
   */
  PLUGIN_NAME: string;
  /**
   * The dependencies of the plugin.
   */
  dependencies = <string[]>[];
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
   * @example 'menu-day-night'
   */
  bottomIconElementName: string = null;

  /**
   * The label of the bottom icon element.
   * @example 'Countries'
   */
  bottomIconLabel: string = null;

  /**
   * The name of the side menu element to show.
   * @example 'countries-menu'
   */
  sideMenuElementName: string = null;

  /**
   * The html to use for the side menu.
   */
  sideMenuElementHtml: string = null;

  /**
   * The title of the help dialog.
   * @example 'Countries Menu'
   */
  helpTitle: string = null;

  /**
   * The body of the help dialog.
   * @example 'The countries menu allows you to...'
   */
  helpBody: string = null;

  /**
   * Whether the bottom icon is disabled by default.
   */
  isIconDisabledOnLoad: boolean = false;

  /**
   * The image to use for the bottom icon.
   */
  bottomIconImg: Module = null;

  /**
   * The singleton values for the plugin if it is registered as a singleton.
   * @deprecated
   */
  singletonValue: Singletons = null;

  /**
   * The callback to run when the bottom icon is clicked.
   * @example () => { console.log('Bottom icon clicked!'); }
   */
  bottomIconCallback: () => void;

  /**
   * Whether the bottom icon is currently disabled.
   */
  isIconDisabled: boolean = false;

  /**
   * Whether the side menus must be hidden when the bottom icon is clicked.
   */
  isForceHideSideMenus: boolean = false;

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
  dragOptions: clickDragOptions;

  /**
   * Creates a new instance of the KeepTrackPlugin class.
   * @param pluginName The name of the plugin.
   */
  constructor(pluginName: string) {
    this.PLUGIN_NAME = pluginName;
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
    this.dependencies.forEach((dependency) => {
      if (!keepTrackApi.loadedPlugins.find((plugin) => plugin.PLUGIN_NAME === dependency)) {
        throw new Error(`${this.PLUGIN_NAME} depends on ${dependency}. Please adjust the load order of the plugins.`);
      }
    });
  }

  /**
   * Initializes the KeepTrackPlugin by checking its dependencies.
   * @returns void
   */
  init(): void {
    this.checkDependencies();
    this.addHtml();
    this.addJs();

    if (this.helpTitle && this.helpBody) {
      this.registerHelp(this.helpTitle, this.helpBody);
    } else if (this.helpTitle || this.helpBody) {
      throw new Error(`${this.PLUGIN_NAME} help title and body must both be defined.`);
    } else if (this.sideMenuElementHtml) {
      throw new Error(`${this.PLUGIN_NAME} help is not defined!`);
    }

    keepTrackApi.loadedPlugins.push(this);
  }

  /**
   * Adds HTML for the KeepTrackPlugin.
   * @throws {Error} If HTML has already been added.
   */
  addHtml(): void {
    if (this.isHtmlAdded) {
      throw new Error(`${this.PLUGIN_NAME} HTML already added.`);
    }

    if (this.bottomIconElementName || this.bottomIconLabel) {
      if (!this.bottomIconElementName || !this.bottomIconLabel) {
        throw new Error(`${this.PLUGIN_NAME} bottom icon element name, image, and label must all be defined.`);
      }
    }

    if (this.bottomIconElementName) {
      this.addBottomIcon(this.bottomIconImg, this.isIconDisabledOnLoad);
    }

    if (this.sideMenuElementName && this.sideMenuElementHtml) {
      this.addSideMenu(this.sideMenuElementHtml);
    } else if (this.sideMenuElementName || this.sideMenuElementHtml) {
      throw new Error(`${this.PLUGIN_NAME} side menu element name and html must both be defined.`);
    }

    if (this.submitCallback) {
      this.registerSubmitButtonClicked(this.submitCallback);
    }

    if (this.dragOptions?.isDraggable) {
      this.registerClickAndDragOptions(this.dragOptions);
    }

    if ((this.rmbL1Html || this.rmbL2Html) && !this.rmbCallback) {
      throw new Error(`${this.PLUGIN_NAME} right mouse button callback must be defined if right mouse button html is defined.`);
    }

    if (this.rmbL1Html && this.rmbL1ElementName && this.rmbL2Html && this.rmbL2ElementName) {
      keepTrackApi.rmbMenuItems.push({
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
      throw new Error(`${this.PLUGIN_NAME} right mouse button level 1 html, element name, level 2 html, and element name must all be defined.`);
    }

    this.isHtmlAdded = true;
  }

  rmbMenuOrder: number = 100;

  /**
   * Whether the context menu opens when earth is clicked
   */
  isRmbOnEarth: boolean = false;

  /**
   * Whether the context menu opens when earth is not clicked (space)
   */
  isRmbOffEarth: boolean = false;

  /**
   * Whether the context menu opens when a satellite is clicked
   */
  isRmbOnSat: boolean = false;

  /**
   * Adds the JS for the KeepTrackPlugin.
   * @throws {Error} If the JS has already been added.
   */
  addJs(): void {
    if (this.isJsAdded) {
      throw new Error(`${this.PLUGIN_NAME} JS already added.`);
    }

    if (this.bottomIconElementName) {
      if (this.bottomIconCallback) {
        this.registerBottomMenuClicked(this.bottomIconCallback);
      } else {
        this.registerBottomMenuClicked();
      }
    }

    if (this.sideMenuElementName) {
      this.registerHideSideMenu(this.bottomIconElementName, this.sideMenuElementName);
    }

    if (this.rmbCallback) {
      this.registerRmbCallback(this.rmbCallback);
    }

    this.isJsAdded = true;
  }

  registerRmbCallback(callback: (targetId: string, clickedSat?: number) => void): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.rmbMenuActions,
      cbName: this.PLUGIN_NAME,
      cb: callback,
    });
  }

  addContextMenuLevel1Item(html: string): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.rightBtnMenuAdd,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        const item = document.createElement('div');
        item.innerHTML = html;
        // Replace outer element with first child
        getEl(KeepTrackPlugin.rmbMenuL1ContainerId).appendChild(item.lastChild);
      },
    });
  }

  addContextMenuLevel2Item(elementId: string, html: string): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        const item = document.createElement('div');
        item.id = elementId;
        item.className = 'right-btn-menu';
        item.innerHTML = html;
        getEl(KeepTrackPlugin.rmbMenuL2ContainerId).appendChild(item);
      },
    });
  }

  /**
   * Registers a callback function to add the bottom icon element to the bottom menu.
   * @param icon The icon to add to the bottom menu.
   */
  addBottomIcon(icon: Module, isDisabled = false): void {
    keepTrackApi.register({
      event: 'uiManagerInit',
      cbName: this.PLUGIN_NAME,
      cb: () => {
        const button = document.createElement('div');
        button.id = this.bottomIconElementName;
        button.classList.add('bmenu-item');
        if (isDisabled) button.classList.add('bmenu-item-disabled');
        button.innerHTML = `
            <img
              alt="${this.PLUGIN_NAME}"
              src=""
              delayedsrc="${icon}"
            />
            <span class="bmenu-title">${this.bottomIconLabel}</span>
            <div class="status-icon"></div>
          `;
        getEl(KeepTrackPlugin.bottomIconsContainerId).appendChild(button);
      },
    });
  }

  shakeBottomIcon(): void {
    shake(getEl(this.bottomIconElementName));
  }

  setBottomIconToSelected(): void {
    if (this.isMenuButtonActive) return;
    this.isMenuButtonActive = true;
    getEl(this.bottomIconElementName).classList.add('bmenu-item-selected');
  }

  setBottomIconToUnselected(): void {
    if (!this.isMenuButtonActive) return;
    this.isMenuButtonActive = false;
    getEl(this.bottomIconElementName).classList.remove('bmenu-item-selected');
  }

  setBottomIconToDisabled(): void {
    if (this.isIconDisabled) return;
    this.setBottomIconToUnselected();
    this.isIconDisabled = true;
    getEl(this.bottomIconElementName).classList.add('bmenu-item-disabled');
  }

  setBottomIconToEnabled(): void {
    if (!this.isIconDisabled) return;
    this.isIconDisabled = false;
    getEl(this.bottomIconElementName).classList.remove('bmenu-item-disabled');
  }

  /**
   * Requires the user to select a sensor before opening their bottom menu.
   */
  isRequireSensorSelected: boolean = false;

  verifySensorSelected(): boolean {
    if (!keepTrackApi.getSensorManager().isSensorSelected()) {
      errorManagerInstance.warn(`Select a Sensor First!`);
      shake(getEl(this.bottomIconElementName));
      return false;
    }
    return true;
  }

  /**
   * Requires the user to select a satellite before opening their bottom menu.
   */
  isRequireSatelliteSelected: boolean = false;

  verifySatelliteSelected(): boolean {
    const searchDom = getEl('search', true);
    if (keepTrackApi.getCatalogManager().selectedSat === -1 && (!searchDom || (<HTMLInputElement>searchDom).value === '')) {
      errorManagerInstance.warn(`Select a Satellite First!`);
      shake(getEl(this.bottomIconElementName));
      return false;
    }
    return true;
  }

  addSideMenu(sideMenuHtml: string): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl(KeepTrackPlugin.sideMenuContainerId).insertAdjacentHTML('beforeend', sideMenuHtml);
      },
    });
  }

  /**
   * Registers a callback function to show the side menu and select the bottom icon element.
   * @param callback The callback function to run when the bottom icon is clicked. This is run
   * even if the bottom icon is disabled.
   */
  registerBottomMenuClicked(callback: () => void = null) {
    if (this.isRequireSensorSelected && this.isRequireSatelliteSelected) {
      keepTrackApi.register({
        event: KeepTrackApiEvents.selectSatData,
        cbName: this.PLUGIN_NAME,
        cb: (sat: SatObject): void => {
          if (!sat?.TLE1 || !keepTrackApi.getSensorManager().isSensorSelected()) {
            this.setBottomIconToDisabled();
            this.setBottomIconToUnselected();
          } else {
            this.setBottomIconToEnabled();
          }
        },
      });
    }
    if (this.isRequireSatelliteSelected && !this.isRequireSensorSelected) {
      keepTrackApi.register({
        event: KeepTrackApiEvents.selectSatData,
        cbName: this.PLUGIN_NAME,
        cb: (sat: SatObject): void => {
          if (!sat) {
            this.setBottomIconToDisabled();
            this.setBottomIconToUnselected();
          } else {
            this.setBottomIconToEnabled();
          }
        },
      });
    }

    if (this.isRequireSensorSelected && !this.isRequireSatelliteSelected) {
      keepTrackApi.register({
        event: KeepTrackApiEvents.setSensor,
        cbName: this.PLUGIN_NAME,
        cb: (sensor: SensorObject | string, staticNum: number): void => {
          if (!sensor && !staticNum) {
            this.setBottomIconToDisabled();
            this.setBottomIconToUnselected();
          } else {
            this.setBottomIconToEnabled();
          }
        },
      });
    }

    keepTrackApi.register({
      event: KeepTrackApiEvents.bottomMenuClick,
      cbName: this.PLUGIN_NAME,
      cb: (iconName: string): void => {
        if (iconName === this.bottomIconElementName) {
          if (this.isMenuButtonActive) {
            if (this.sideMenuElementName || this.isForceHideSideMenus) {
              this.hideSideMenus();
            }
            this.isMenuButtonActive = false;
            getEl(this.bottomIconElementName).classList.remove(KeepTrackPlugin.iconSelectedClassString);
          } else {
            // Verifiy that the user has selected a sensor and/or satellite if required
            if (this.isRequireSensorSelected) {
              if (!this.verifySensorSelected()) return;
            }

            if (this.isRequireSatelliteSelected) {
              if (!this.verifySatelliteSelected()) return;
            }

            // If the icon is disabled, skip automatically selecting it
            if (!this.isIconDisabled) {
              // Show the side menu if it exists
              if (this.sideMenuElementName) {
                this.openSideMenu();
              }

              // Show the bottom icon as selected
              this.isMenuButtonActive = true;
              getEl(this.bottomIconElementName).classList.add(KeepTrackPlugin.iconSelectedClassString);
            }
          }

          // If a callback is defined, call it even if the icon is disabled
          if (callback) callback();
        }
      },
    });
  }

  hideSideMenus(): void {
    if (settingsManager.isMobileModeEnabled) {
      keepTrackApi.getUiManager().searchManager.searchToggle(false);
    }
    keepTrackApi.getUiManager().hideSideMenus();
    this.isMenuButtonActive = false;
  }

  openSideMenu() {
    this.hideSideMenus();
    slideInRight(getEl(this.sideMenuElementName), 1000);
  }

  closeSideMenu() {
    slideOutLeft(getEl(this.sideMenuElementName), 1000);
  }

  registerSubmitButtonClicked(callback: () => void = null) {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        const form = getEl(`${this.sideMenuElementName}-form`);
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (callback) callback();
          });
        } else {
          throw new Error(`Form not found for ${this.sideMenuElementName}`);
        }
      },
    });
  }

  registerClickAndDragOptions(opts?: clickDragOptions): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        clickAndDragWidth(getEl(this.sideMenuElementName), opts);
      },
    });
  }

  /**
   * Registers a callback function to show help text when the help menu button is clicked.
   * @param helpTitle The title of the help text to show.
   * @param helpText The help text to show.
   */
  registerHelp(helpTitle: string, helpText: string) {
    keepTrackApi.register({
      event: 'onHelpMenuClick',
      cbName: `${this.PLUGIN_NAME}`,
      cb: (): boolean => {
        if (this.isMenuButtonActive) {
          adviceManagerInstance.showAdvice(helpTitle, helpText);
          return true;
        }
        return false;
      },
    });
  }

  /**
   * Registers a callback function to hide the side menu and deselect the bottom icon element.
   * @param bottomIconElementName The name of the bottom icon element to deselect.
   * @param sideMenuElementName The name of the side menu element to hide.
   */
  registerHideSideMenu(bottomIconElementName: string, sideMenuElementName: string): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.hideSideMenus,
      cbName: this.PLUGIN_NAME,
      cb: (): void => {
        slideOutLeft(getEl(sideMenuElementName), 1000);
        getEl(bottomIconElementName).classList.remove(KeepTrackPlugin.iconSelectedClassString);
        this.isMenuButtonActive = false;
      },
    });
  }
}
