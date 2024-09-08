import { KeepTrackApiEvents, Singletons } from '@app/interfaces';
import { Localization } from '@app/locales/locales';
import { adviceManagerInstance } from '@app/singletons/adviceManager';
import i18next from 'i18next';
import Module from 'module';
import { BaseObject, Sensor } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { clickAndDragWidth } from '../lib/click-and-drag';
import { getEl } from '../lib/get-el';
import { shake } from '../lib/shake';
import { slideInRight, slideOutLeft } from '../lib/slide';
import { errorManagerInstance } from '../singletons/errorManager';
import { SelectSatManager } from './select-sat-manager/select-sat-manager';
import { SoundNames } from './sounds/SoundNames';

export interface clickDragOptions {
  leftOffset?: number;
  isDraggable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  attachedElement?: HTMLElement;
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
  leftOffset?: number;
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

  abstract id: string;

  /**
   * The dependencies of the plugin.
   */
  protected abstract dependencies_: string[];
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
  bottomIconElementName: string;

  /**
   * The label of the bottom icon element.
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
  sideMenuSettingsHtml: string;

  sideMenuSettingsOptions: SideMenuSettingsOptions = {
    width: 300,
    leftOffset: null,
    zIndex: 3,
  };

  /**
   * The callback to run when the download icon is clicked.
   * Download icon is automatically added if this is defined.
   */
  downloadIconCb: () => void = null;

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
  dragOptions: clickDragOptions;

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
      if (!keepTrackApi.loadedPlugins.find((plugin) => plugin.constructor.name === dependency)) {
        throw new Error(`${this.constructor.name} depends on ${dependency}. Please adjust the load order of the plugins.`);
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
    } else if (this.helpBody) {
      throw new Error(`${this.id} help title and body must both be defined.`);
    }

    keepTrackApi.loadedPlugins.push(this);
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

    this.sideMenuSettingsOptions.leftOffset = typeof this.sideMenuSettingsOptions.leftOffset === 'number' ? this.sideMenuSettingsOptions.leftOffset : null;

    this.helpTitle = Localization.plugins[this.id]?.title ?? this.helpTitle ?? this.sideMenuTitle;
    this.helpBody = Localization.plugins[this.id]?.helpBody ?? this.helpBody;
    this.sideMenuTitle = Localization.plugins[this.id]?.title ?? this.sideMenuTitle;
    this.bottomIconLabel = Localization.plugins[this.id]?.bottomIconLabel ?? this.bottomIconLabel;

    if (this.bottomIconLabel) {
      const bottomIconSlug = this.bottomIconLabel.toLowerCase().replace(' ', '-');

      this.bottomIconElementName = this.bottomIconElementName ?? `${bottomIconSlug}-bottom-icon`;
    }

    if (this.bottomIconElementName || this.bottomIconLabel) {
      if (!this.bottomIconElementName || !this.bottomIconLabel) {
        throw new Error(`${this.id} bottom icon element name, image, and label must all be defined.`);
      }
    }

    if (this.bottomIconElementName) {
      this.addBottomIcon(this.bottomIconImg, this.isIconDisabledOnLoad);
    }

    if (this.sideMenuElementName && this.sideMenuElementHtml) {
      if (this.sideMenuSettingsHtml) {
        const sideMenuHtmlWrapped = this.generateSideMenuHtml_();

        this.addSideMenu(sideMenuHtmlWrapped);
      } else {
        this.addSideMenu(this.sideMenuElementHtml);
      }
    } else if (this.sideMenuElementName || this.sideMenuElementHtml) {
      throw new Error(`${this.id} side menu element name and html must both be defined.`);
    }

    if (this.sideMenuSettingsHtml) {
      const sideMenuHtmlWrapped = keepTrackApi.html`
        <div id="${this.sideMenuElementName}-settings"
          class="side-menu-parent start-hidden text-select"
          style="z-index: ${this.sideMenuSettingsOptions.zIndex.toString()};
          width: ${this.sideMenuSettingsOptions.width.toString()}px;"
        >
          <div id="${this.sideMenuElementName}-settings-content" class="side-menu-settings" style="padding: 0px 10px;">
            <div class="row"></div>
            ${this.sideMenuSettingsHtml}
          </div>
        </div>
      `;

      this.addSideMenu(sideMenuHtmlWrapped);

      keepTrackApi.register({
        event: KeepTrackApiEvents.uiManagerInit,
        cbName: this.id,
        cb: () => {
          getEl(`${this.sideMenuElementName}-settings-btn`).addEventListener('click', () => {
            if (!this.isSettingsMenuEnabled_) {
              return;
            }

            keepTrackApi.getSoundManager().play(SoundNames.CLICK);
            if (this.isSideMenuSettingsOpen) {
              this.closeSettingsMenu();
              getEl(`${this.sideMenuElementName}-settings-btn`).style.color = 'var(--statusDarkStandby)';
            } else {
              this.openSettingsMenu();
              getEl(`${this.sideMenuElementName}-settings-btn`).style.color = 'var(--statusDarkNormal)';
            }
          });

          if (this.downloadIconCb) {
            getEl(`${this.sideMenuElementName}-download-btn`).addEventListener('click', () => {
              keepTrackApi.getSoundManager().play(SoundNames.EXPORT);
              this.downloadIconCb();
            });
          }
        },
      });
    }

    if (this.submitCallback) {
      this.registerSubmitButtonClicked(this.submitCallback);
    }

    if (this.dragOptions) {
      this.registerClickAndDragOptions(this.dragOptions);
    }

    if ((this.rmbL1Html || this.rmbL2Html) && !this.rmbCallback) {
      throw new Error(`${this.id} right mouse button callback must be defined if right mouse button html is defined.`);
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
    const menuWidthStr = `${this.sideMenuSettingsOptions.width.toString()} px !important`;
    const downloadIconHtml = this.downloadIconCb ? keepTrackApi.html`
      <button id="${this.sideMenuElementName}-download-btn";
        class="center-align btn btn-ui waves-effect waves-light"
        style="padding: 2px; margin: 0px 0px 0px 5px; color: var(--statusDarkStandby); background-color: rgba(0, 0, 0, 0);box-shadow: none;"
        type="button">
        <i class="material-icons" style="font-size: 2em;height: 30px;width: 30px;display: flex;justify-content: center;align-items: center;">
          file_download
        </i>
      </button>
    ` : '';
    const settingsIconHtml = keepTrackApi.html`
      <button id="${this.sideMenuElementName}-settings-btn"
        class="center-align btn btn-ui waves-effect waves-light"
        style="padding: 2px; margin: 0px 0px 0px 5px; color: var(--statusDarkStandby); background-color: rgba(0, 0, 0, 0);box-shadow: none;"
        type="button">
        <i class="material-icons" style="font-size: 2em;height: 30px;width: 30px;display: flex;justify-content: center;align-items: center;">
          settings
        </i>
      </button>`;
    const spacerDiv = keepTrackApi.html`<div style="width: 30px; height: 30px; display: block; margin: 0px 5px 0px 0px;"></div>`;

    const sideMenuHtmlWrapped = keepTrackApi.html`
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

    if (this.sideMenuSettingsHtml) {
      this.registerHideSideMenu(this.bottomIconElementName, this.closeSettingsMenu.bind(this));
    }

    if (this.rmbCallback) {
      this.registerRmbCallback(this.rmbCallback);
    }

    this.isJsAdded = true;
  }

  registerRmbCallback(callback: (targetId: string, clickedSatId?: number) => void): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.rmbMenuActions,
      cbName: this.id,
      cb: callback,
    });
  }

  addContextMenuLevel1Item(html: string): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.rightBtnMenuAdd,
      cbName: this.id,
      cb: () => {
        const item = document.createElement('div');

        item.innerHTML = html;

        // Trim empty child nodes
        item.childNodes.forEach((child) => {
          if (child.nodeType === 3 && child.textContent.trim() === '') {
            item.removeChild(child);
          }
        });

        // Replace outer element with first child
        getEl(KeepTrackPlugin.rmbMenuL1ContainerId).appendChild(item.lastChild);
      },
    });
  }

  addContextMenuLevel2Item(elementId: string, html: string): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.id,
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
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.id,
      cb: () => {
        const button = document.createElement('div');

        button.id = this.bottomIconElementName;
        button.classList.add('bmenu-item');
        if (isDisabled) {
          button.classList.add('bmenu-item-disabled');
        }
        button.innerHTML = `
          <div class="bmenu-item-inner">
            <div class="status-icon"></div>
            <img
              alt="${this.id}"
              src=""
              delayedsrc="${icon}"
            />
          </div>
          <span class="bmenu-title">${this.bottomIconLabel}</span>
          `;
        getEl(KeepTrackPlugin.bottomIconsContainerId).appendChild(button);
      },
    });
  }

  shakeBottomIcon(): void {
    shake(getEl(this.bottomIconElementName));
  }

  setBottomIconToSelected(): void {
    if (this.isMenuButtonActive) {
      return;
    }
    this.isMenuButtonActive = true;
    getEl(this.bottomIconElementName).classList.add('bmenu-item-selected');
  }

  setBottomIconToUnselected(isHideSideMenus = true): void {
    if (!this.isMenuButtonActive) {
      return;
    }
    this.isMenuButtonActive = false;
    if (isHideSideMenus) {
      keepTrackApi.runEvent(KeepTrackApiEvents.hideSideMenus);
    }
    getEl(this.bottomIconElementName).classList.remove('bmenu-item-selected');
  }

  setBottomIconToDisabled(isHideSideMenus = true): void {
    if (this.isIconDisabled) {
      return;
    }
    this.setBottomIconToUnselected(isHideSideMenus);
    this.isIconDisabled = true;
    getEl(this.bottomIconElementName).classList.add('bmenu-item-disabled');
  }

  setBottomIconToEnabled(): void {
    if (!this.isIconDisabled) {
      return;
    }
    this.isIconDisabled = false;
    getEl(this.bottomIconElementName).classList.remove('bmenu-item-disabled');
  }

  /**
   * Requires the user to select a sensor before opening their bottom menu.
   */
  isRequireSensorSelected = false;

  verifySensorSelected(isMakeToast = true): boolean {
    if (!keepTrackApi.getSensorManager().isSensorSelected()) {
      if (isMakeToast) {
        errorManagerInstance.warn(i18next.t('errorMsgs.SelectSensorFirst'), true);
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
    if (!(keepTrackApi.getPlugin(SelectSatManager)?.selectedSat > -1)) {
      errorManagerInstance.warn(i18next.t('errorMsgs.SelectSatelliteFirst'), true);
      shake(getEl(this.bottomIconElementName));

      return false;
    }

    return true;
  }

  addSideMenu(sideMenuHtml: string): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.id,
      cb: () => {
        getEl(KeepTrackPlugin.sideMenuContainerId)?.insertAdjacentHTML('beforeend', sideMenuHtml);
      },
    });
  }

  /**
   * Registers a callback function to show the side menu and select the bottom icon element.
   * @param callback The callback function to run when the bottom icon is clicked. This is run
   * even if the bottom icon is disabled.
   */
  registerBottomMenuClicked(callback: () => void = () => { }) {
    if (this.isRequireSensorSelected && this.isRequireSatelliteSelected) {
      keepTrackApi.register({
        event: KeepTrackApiEvents.selectSatData,
        cbName: this.id,
        cb: (obj: BaseObject): void => {
          if (!obj?.isSatellite() || !keepTrackApi.getSensorManager().isSensorSelected()) {
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
        cbName: this.id,
        cb: (obj: BaseObject): void => {
          if (!obj) {
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
        cbName: this.id,
        cb: (sensor: Sensor | string, sensorId: number): void => {
          if (!sensor && !sensorId) {
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
      cbName: this.id,
      cb: (iconName: string): void => {
        if (iconName === this.bottomIconElementName) {
          keepTrackApi.analytics.track('bottom_menu_click', {
            plugin: this.id,
            iconName,
          });

          if (this.isMenuButtonActive) {
            if (this.sideMenuElementName || this.isForceHideSideMenus) {
              this.hideSideMenus();
            }
            this.isMenuButtonActive = false;
            getEl(this.bottomIconElementName).classList.remove(KeepTrackPlugin.iconSelectedClassString);
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
              getEl(this.bottomIconElementName).classList.add(KeepTrackPlugin.iconSelectedClassString);
            }
          }

          // If a callback is defined, call it even if the icon is disabled
          if (callback) {
            // eslint-disable-next-line callback-return
            callback();
          }
        }
      },
    });
  }

  protected static genH5Title_(title: string): string {
    return keepTrackApi.html`
      <div class="divider flow5out"></div>
        <h5 class="center-align side-menu-row-header">${title}</h5>
      <div class="divider flow5out"></div>
    `;
  }

  hideSideMenus(): void {
    if (settingsManager.isMobileModeEnabled) {
      keepTrackApi.getUiManager().searchManager.closeSearch();
    }
    keepTrackApi.getUiManager().hideSideMenus();
    this.isMenuButtonActive = false;
  }

  openSideMenu() {
    this.hideSideMenus();
    slideInRight(getEl(this.sideMenuElementName), 1000);
  }

  openSettingsMenu() {
    const settingsMenuElement = getEl(`${this.sideMenuElementName}-settings`);
    const sideMenuElement = getEl(this.sideMenuElementName);

    if (settingsMenuElement) {
      this.isSideMenuSettingsOpen = true;
      if (this.sideMenuSettingsOptions.leftOffset !== null) {
        settingsMenuElement.style.left = `${this.sideMenuSettingsOptions.leftOffset}px`;
      } else {
        settingsMenuElement.style.left = `${sideMenuElement.getBoundingClientRect().right}px`;
      }
      slideInRight(settingsMenuElement, 1000);
    }
  }

  closeSideMenu() {
    const settingsMenuElement = getEl(`${this.sideMenuElementName}`);

    slideOutLeft(settingsMenuElement, 1000);
  }

  closeSettingsMenu() {
    this.isSideMenuSettingsOpen = false;
    getEl(`${this.sideMenuElementName}-settings-btn`).style.color = 'var(--statusDarkStandby)';
    slideOutLeft(getEl(`${this.sideMenuElementName}-settings`), 1500, null, -300);
  }

  registerSubmitButtonClicked(callback: () => void = null) {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
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
    });
  }

  registerClickAndDragOptions(opts?: clickDragOptions): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        if (this.sideMenuSettingsHtml) {
          opts.attachedElement = getEl(`${this.sideMenuElementName}-settings`);
        }
        if (this.sideMenuSettingsOptions.leftOffset) {
          opts.leftOffset = this.sideMenuSettingsOptions.leftOffset;
        }
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
      event: KeepTrackApiEvents.onHelpMenuClick,
      cbName: `${this.id}`,
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
   * @param slideCb The callback function to run when the side menu is hidden.
   */
  registerHideSideMenu(bottomIconElementName: string, slideCb: () => void): void {
    keepTrackApi.register({
      event: KeepTrackApiEvents.hideSideMenus,
      cbName: this.id,
      cb: (): void => {
        slideCb();
        getEl(bottomIconElementName).classList.remove(KeepTrackPlugin.iconSelectedClassString);
        this.isMenuButtonActive = false;
      },
    });
  }
}
