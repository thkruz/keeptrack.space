/* eslint-disable max-classes-per-file */
/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference https://keeptrack.space/license/thingsinspace.txt
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

import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SoundNames } from '@app/plugins/sounds/SoundNames';
import { isThisNode } from '@app/static/isThisNode';
import '@materializecss/materialize';
import { BaseObject, DetailedSatellite, Milliseconds, MILLISECONDS_PER_SECOND } from 'ootk';
import { clickAndDragHeight, clickAndDragWidth } from '../lib/click-and-drag';
import { closeColorbox } from '../lib/colorbox';
import { getClass } from '../lib/get-class';
import { getEl, hideEl, setInnerHtml, showEl } from '../lib/get-el';
import { rgbCss } from '../lib/rgbCss';
import { LegendManager } from '../static/legend-manager';
import { UiValidation } from '../static/ui-validation';
import { ColorScheme } from './color-schemes/color-scheme';
import { errorManagerInstance } from './errorManager';
import { MobileManager } from './mobileManager';
import { SearchManager } from './search-manager';

export class UiManager {
  private static readonly LONG_TIMER_DELAY = MILLISECONDS_PER_SECOND * 100;

  private isFooterVisible_ = true;
  private isInitialized_ = false;

  // materializecss/materialize goes to window.M, but we want a local reference
  M = window.M;
  bottomIconPress: (el: HTMLElement) => void;
  hideSideMenus: () => void;
  isAnalysisMenuOpen = false;
  isCurrentlyTyping = false;
  isUiVisible = true;
  lastBoxUpdateTime = 0;
  lastNextPassCalcSatId = 0;
  lastNextPassCalcSensorShortName: string;
  lastToast: string;
  searchManager: SearchManager;
  updateInterval = 1000;
  updateNextPassOverlay: (arg0: boolean) => void;
  searchHoverSatId = -1;
  isLegendMenuOpen = false;

  static fullscreenToggle() {
    if (!document.fullscreenElement) {
      try {
        document.documentElement?.requestFullscreen().catch((err) => {
          // Might fail on some browsers
          errorManagerInstance.debug(err);
        });
      } catch (e) {
        // Might fail on some browsers
        errorManagerInstance.debug(e);
      }
    } else {
      document.exitFullscreen();
    }

    setTimeout(() => {
      keepTrackApi.getRenderer().resizeCanvas(true);
    }, 100);
  }

  /** This runs after the drawManagerInstance starts */
  static postStart() {
    UiValidation.initUiValidation();

    setTimeout(() => {
      const imageElements = document.querySelectorAll('img') as unknown as {
        src: string;
        attributes: {
          delayedsrc: { value: string };
        };
      }[];

      imageElements.forEach((img) => {
        if (img.src && !img.src.includes('.svg') && !img.src.includes('.png') && !img.src.includes('.jpg')) {
          img.src = img.attributes.delayedsrc?.value;
        }
      });
    }, 0);

    // eslint-disable-next-line multiline-comment-style
    // // Enable Satbox Overlay
    // if (settingsManager.enableHoverOverlay) {
    //   try {
    //     const hoverboxDOM = document.createElement('div');
    //     hoverboxDOM.innerHTML = `
    //     <div id="sat-hoverbox">
    //       <span id="sat-hoverbox1"></span>
    //       <span id="sat-hoverbox2"></span>
    //       <span id="sat-hoverbox3"></span>
    //     </div>`;

    //     getEl('keeptrack-canvas')?.parentElement?.append(hoverboxDOM);
    //   } catch {
    //     /* istanbul ignore next */
    //     console.debug('document.createElement() failed!');
    //   }
    // }
  }

  dismissAllToasts() {
    this.activeToastList_.forEach((toast) => {
      toast.dismiss();
    });
    this.activeToastList_ = [];
  }

  private makeToast_(toastText: string, type: ToastMsgType, isLong = false) {
    if (settingsManager.isDisableToasts) {
      return null;
    }

    const toastMsg = window.M.toast({
      unsafeHTML: toastText,
    });

    // Add an on click event to dismiss the toast
    toastMsg.$el[0].addEventListener('click', () => {
      toastMsg.dismiss();
      this.activeToastList_ = this.activeToastList_.filter((t) => t !== toastMsg);
    });

    toastMsg.$el[0].addEventListener('contextmenu', () => {
      this.dismissAllToasts();
    });


    type = type || ToastMsgType.standby;
    if (isLong) {
      toastMsg.timeRemaining = UiManager.LONG_TIMER_DELAY;
    }

    setTimeout(() => {
      this.activeToastList_ = this.activeToastList_.filter((t) => t !== toastMsg);
    }, toastMsg.timeRemaining);

    switch (type) {
      case ToastMsgType.standby:
        toastMsg.$el[0].style.background = 'var(--statusDarkStandby)';
        keepTrackApi.getSoundManager()?.play(SoundNames.WARNING);
        break;
      case ToastMsgType.caution:
        toastMsg.$el[0].style.background = 'var(--statusDarkCaution)';
        keepTrackApi.getSoundManager()?.play(SoundNames.WARNING);
        break;
      case ToastMsgType.serious:
        toastMsg.$el[0].style.background = 'var(--statusDarkSerious)';
        keepTrackApi.getSoundManager()?.play(SoundNames.WARNING);
        break;
      case ToastMsgType.critical:
        toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
        keepTrackApi.getSoundManager()?.play(SoundNames.WARNING);
        break;
      case ToastMsgType.error:
        toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
        keepTrackApi.getSoundManager()?.play(SoundNames.ERROR);
        break;
      case ToastMsgType.normal:
      default:
        toastMsg.$el[0].style.background = 'var(--statusDarkNormal)';
        keepTrackApi.getSoundManager()?.play(SoundNames.WARNING);
        break;
    }

    return toastMsg;
  }

  colorSchemeChangeAlert(newScheme: ColorScheme) {
    /*
     * Don't make an alert unless something has really changed
     * Check if the name of the lastColorScheme function is the same as the name of the new color scheme
     */
    if (keepTrackApi.getColorSchemeManager().lastColorScheme?.id === newScheme.id) {
      return;
    }

    // Make an alert
    this.toast(`Color Scheme Changed to ${newScheme.label}`, ToastMsgType.normal, false);
  }

  doSearch(searchString: string, isPreventDropDown?: boolean) {
    this.searchManager.doSearch(searchString, isPreventDropDown);
  }

  footerToggle() {
    if (this.isFooterVisible_) {
      this.isFooterVisible_ = false;
      getEl('nav-footer')?.classList.add('footer-slide-trans');
      getEl('nav-footer')?.classList.remove('footer-slide-up');
      getEl('nav-footer')?.classList.add('footer-slide-down');
      setInnerHtml('nav-footer-toggle', '&#x25B2;');
    } else {
      this.isFooterVisible_ = true;
      getEl('nav-footer')?.classList.add('footer-slide-trans');
      getEl('nav-footer')?.classList.remove('footer-slide-down');
      getEl('nav-footer')?.classList.add('footer-slide-up');
      setInnerHtml('nav-footer-toggle', '&#x25BC;');
    }
    // After 1 second the transition should be complete so lets stop moving slowly
    setTimeout(() => {
      getEl('nav-footer')?.classList.remove('footer-slide-trans');
    }, 1000);
  }

  hideUi() {
    if (this.isUiVisible) {
      hideEl('keeptrack-header');
      hideEl('ui-wrapper');
      hideEl('nav-footer');
      this.isUiVisible = false;
    } else {
      showEl('keeptrack-header');
      showEl('ui-wrapper');
      showEl('nav-footer');
      this.isUiVisible = true;
    }
  }

  init() {
    if (this.isInitialized_) {
      throw new Error('UiManager already initialized');
    }

    this.searchManager = new SearchManager(this);

    if (settingsManager.isShowPrimaryLogo) {
      getEl('logo-primary')?.classList.remove('start-hidden');
    }
    if (settingsManager.isShowSecondaryLogo) {
      getEl('logo-secondary')?.classList.remove('start-hidden');
    }

    keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerInit);

    UiManager.initBottomMenuResizing_();

    // Initialize Navigation and Select Menus
    const elems = document.querySelectorAll('.dropdown-button');

    window.M.Dropdown.init(elems);
    this.isInitialized_ = true;
  }

  initMenuController() {
    getEl('legend-hover-menu')?.addEventListener('click', (e: MouseEvent) => {
      const hoverMenuItemClass = (e.target as HTMLElement)?.classList[1];

      if (hoverMenuItemClass) {
        this.legendHoverMenuClick(hoverMenuItemClass);
      }
    });

    getEl('legend-menu')?.addEventListener('click', () => {
      if (this.isLegendMenuOpen) {
        // Closing Legend Menu
        hideEl('legend-hover-menu');
        getEl('legend-icon')?.classList.remove('bmenu-item-selected');
        this.isLegendMenuOpen = false;
      } else {
        // Opening Legend Menu

        if (getEl('legend-hover-menu')?.innerHTML.length === 0) {
          // TODO: Figure out why it is empty sometimes
          errorManagerInstance.debug('Legend Menu is Empty');
        }

        showEl('legend-hover-menu');
        getEl('legend-icon')?.classList.add('bmenu-item-selected');
        this.searchManager.hideResults();
        this.isLegendMenuOpen = true;
      }
    });

    // Resizing Listener
    window.addEventListener('resize', () => {
      MobileManager.checkMobileMode();
      settingsManager.isResizing = true;
    });

    this.addSearchEventListeners_();

    getEl('fullscreen-icon')?.addEventListener('click', () => {
      UiManager.fullscreenToggle();
    });

    getEl('nav-footer-toggle')?.addEventListener('click', () => {
      this.toggleBottomMenu();
    });

    clickAndDragWidth(getEl('settings-menu'));
    clickAndDragWidth(getEl('about-menu'));
  }

  toggleBottomMenu() {
    this.footerToggle();
    const navFooterDom = getEl('nav-footer');

    if (navFooterDom && parseInt(window.getComputedStyle(navFooterDom).bottom.replace('px', '')) < 0) {
      keepTrackApi.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      setTimeout(() => {
        const bottomHeight = getEl('bottom-icons-container')?.offsetHeight;

        document.documentElement.style.setProperty('--bottom-menu-top', `${bottomHeight}px`);
      }, 1000); // Wait for the footer to be fully visible.
    } else {
      // If the footer is open, then it will be hidden shortly but we don't want to wait for it to be hidden
      document.documentElement.style.setProperty('--bottom-menu-top', '0px');
      keepTrackApi.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    }
  }

  private addSearchEventListeners_() {
    getEl('search')?.addEventListener('focus', () => {
      this.isCurrentlyTyping = true;
    });
    getEl('ui-wrapper')?.addEventListener('focusin', () => {
      this.isCurrentlyTyping = true;
    });

    getEl('search')?.addEventListener('blur', () => {
      this.isCurrentlyTyping = false;
    });
    getEl('ui-wrapper')?.addEventListener('focusout', () => {
      this.isCurrentlyTyping = false;
    });
  }

  legendHoverMenuClick(legendType: string) {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const colorSchemeInstance = colorSchemeManagerInstance.currentColorScheme;
    const slug = legendType.split('-')[1];
    let isFlagOn = true;

    if (colorSchemeManagerInstance.objectTypeFlags[slug]) {
      isFlagOn = false;
    }

    if (!isFlagOn) {
      getClass(`legend-${slug}-box`).forEach((el) => {
        el.style.background = 'black';
      });
    } else {
      getClass(`legend-${slug}-box`).forEach((el) => {
        const color = colorSchemeInstance?.colorTheme[slug] ?? null;

        if (!color) {
          errorManagerInstance.log(`Color not found for ${slug}`);
        } else {
          el.style.background = rgbCss(color);
        }
      });
    }

    colorSchemeManagerInstance.objectTypeFlags[slug] = isFlagOn;
    if (colorSchemeInstance) {
      colorSchemeInstance.objectTypeFlags[slug] = colorSchemeManagerInstance.objectTypeFlags[slug];
    }


    colorSchemeManagerInstance.calculateColorBuffers(true);
  }

  onReady() {
    // Code Once index.htm is loaded
    if (settingsManager.offline) {
      this.updateInterval = 250;
    }

    // Setup Legend Colors
    LegendManager.legendColorsChange();

    // Run any plugins code
    keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerOnReady);

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'uiManager',
      cb: () => {
        this.bottomIconPress = (el: HTMLElement) => keepTrackApi.runEvent(KeepTrackApiEvents.bottomMenuClick, el.id);
        const BottomIcons = getEl('bottom-icons');

        BottomIcons?.addEventListener('click', (evt: Event) => {
          const bottomIcons = getEl('bottom-icons');
          let targetElement = <HTMLElement | null>evt.target;

          while (targetElement && targetElement !== bottomIcons) {
            if (targetElement.parentElement === bottomIcons) {
              this.bottomIconPress(targetElement);

              return;
            }
            targetElement = targetElement.parentElement;
          }

          if (targetElement === bottomIcons) {
            return;
          }

          if (!targetElement) {
            errorManagerInstance.debug('targetElement is null');
          } else {
            this.bottomIconPress(targetElement);
          }
        });
        this.hideSideMenus = () => {
          closeColorbox();
          keepTrackApi.runEvent(KeepTrackApiEvents.hideSideMenus);
        };
      },
    });
  }

  toast(toastText: string, type: ToastMsgType, isLong = false) {
    this.lastToast = toastText;

    if (isThisNode()) {
      // Testing environment only
      // eslint-disable-next-line no-console
      console.warn('Toast:', toastText);

      return;
    }

    try {
      // Stop toasts from crashing the app
      if (this.activeToastList_.length > 20) {
        return;
      }
      const toastMsg = this.makeToast_(toastText, type, isLong);

      if (toastMsg) {
        this.activeToastList_.push(toastMsg);
      }
    } catch (e) {
      errorManagerInstance.debug('toast failed');
    }
  }

  private activeToastList_ = [] as {
    $el: NodeListOf<HTMLElement>;
    timeRemaining: number;
    dismiss: () => void;
  }[];

  /**
   * Checks if enough time has elapsed and then calls all queued updateSelectBox callbacks
   */
  updateSelectBox(realTime: Milliseconds, lastBoxUpdateTime: Milliseconds, obj: BaseObject): void {
    if (!obj || obj.id === -1 || obj.isStatic()) {
      return;
    }

    const sat = obj as DetailedSatellite;

    if (realTime * 1 > lastBoxUpdateTime * 1 + this.updateInterval) {
      keepTrackApi.runEvent(KeepTrackApiEvents.updateSelectBox, sat);
      keepTrackApi.getTimeManager().lastBoxUpdateTime = realTime;
    }
  }

  private static initBottomMenuResizing_() {
    // Allow Resizing the bottom menu
    const maxHeight = getEl('bottom-icons') !== null ? getEl('bottom-icons')?.offsetHeight : 0;
    const bottomIconsContainerDom = getEl('bottom-icons-container');

    if (!bottomIconsContainerDom) {
      errorManagerInstance.debug('bottomIconsContainerDom is null');
    } else {
      clickAndDragHeight(bottomIconsContainerDom, maxHeight, () => {
        let bottomHeight = bottomIconsContainerDom.offsetHeight;

        document.documentElement.style.setProperty('--bottom-menu-height', `${bottomHeight}px`);
        const navFooterDom = getEl('nav-footer');

        if (navFooterDom && window.getComputedStyle(navFooterDom).bottom !== '0px') {
          document.documentElement.style.setProperty('--bottom-menu-top', '0px');
        } else {
          bottomHeight = bottomIconsContainerDom.offsetHeight;
          document.documentElement.style.setProperty('--bottom-menu-top', `${bottomHeight}px`);
        }
      });
    }
  }
}
