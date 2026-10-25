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

import { SoundNames } from '@app/engine/audio/sounds';
import { ToastAction, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EngineEventMap, EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { KeyboardComponent } from '@app/engine/plugins/components/keyboard/keyboard-component';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { TranslationKey, t7e } from '@app/locales/keys';
import { Dropdown, Toast } from '@materializecss/materialize';
import { BaseObject, MILLISECONDS_PER_SECOND, Milliseconds } from '@ootk/src/main';
import cancelPng from '@public/img/icons/cancel.png';
import checkCirclePng from '@public/img/icons/check-circle.png';
import infoPng from '@public/img/icons/info.png';
import warningPng from '@public/img/icons/warning.png';
import { ColorScheme } from '../../engine/rendering/color-schemes/color-scheme';
import { clickAndDragHeight, clickAndDragWidth } from '../../engine/utils/click-and-drag';
import { closeColorbox } from '../../engine/utils/colorbox';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl, hideEl, setInnerHtml, showEl } from '../../engine/utils/get-el';
import { LayersManager } from './layers-manager';
import { MobileManager } from './mobileManager';
import { PluginDrawer } from './plugin-drawer';
import { SearchManager } from './search-manager';
import { UiValidation } from './ui-validation';

export class UiManager {
  private static readonly LONG_TIMER_DELAY = MILLISECONDS_PER_SECOND * 100;
  /** Upper bound for an isLong toast that is not critical or an error. */
  private static readonly LONG_NON_CRITICAL_MAX_MS = MILLISECONDS_PER_SECOND * 20;
  private static readonly TOAST_TEMPLATE_ID = 'kt-toast';
  /** Minimum time a toast with an action button stays up, so the action can still be reached. */
  static readonly TOAST_ACTION_MIN_MS = MILLISECONDS_PER_SECOND * 10;

  private isFooterVisible_ = true;
  private isInitialized_ = false;

  bottomIconPress = (el: HTMLElement) => {
    ServiceLocator.getSoundManager()?.play(SoundNames.BEEP);
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, el.id);
  };
  hideSideMenus = () => {
    closeColorbox();
    EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
  };
  isCurrentlyTyping = false;
  isUiVisible = true;
  lastBoxUpdateTime = 0;
  lastToast: string;
  searchManager: SearchManager;
  updateInterval = 1000;
  updateNextPassOverlay: (arg0: boolean) => void;
  searchHoverSatId = -1;
  layersManager: LayersManager;
  pluginDrawer: PluginDrawer;

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
      ServiceLocator.getRenderer().resizeCanvas(true);
    }, 100);
  }

  /** This runs after the drawManagerInstance starts */
  static postStart() {
    UiValidation.initUiValidation();
    ServiceLocator.getRenderer().resizeCanvas(true);

    setTimeout(() => {
      const imageElements = document.querySelectorAll('img') as unknown as {
        src: string;
        attributes: {
          delayedsrc: { value: string };
        };
      }[];

      imageElements.forEach((img) => {
        if (img.src && !img.src.includes('.svg') && !img.src.includes('.png') && !img.src.includes('.jpg')) {
          const delayedSrc = img.attributes.delayedsrc?.value;

          if (delayedSrc) {
            img.src = delayedSrc;
          }
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

  /**
   * Tracks toasts that have already been dismissed so a single toast is never
   * dismissed twice. Materialize's `Toast.dismiss()` is not idempotent: each call
   * schedules a teardown timer, and a second teardown runs `_removeContainer()`
   * against an already-null `_container`, throwing "Cannot read properties of null
   * (reading 'remove')". See issue #1394.
   */
  private readonly dismissedToasts_ = new WeakSet<Toast>();

  /**
   * Replaces the toast's own `dismiss()` with a once-only version. Guarding only
   * KeepTrack's callers is not enough: a swipe or mouse drag makes Materialize call
   * `toast.dismiss()` itself from `Toast._onDragEnd`, and KeepTrack's auto-dismiss timer
   * then queued a second teardown (#1425). Wrapping the instance routes every caller,
   * the library included, through `dismissedToasts_`.
   */
  private guardDismiss_(toast: Toast) {
    const libraryDismiss = toast.dismiss.bind(toast);

    toast.dismiss = () => {
      this.activeToastList_ = this.activeToastList_.filter((t) => t !== toast);
      if (this.dismissedToasts_.has(toast)) {
        return;
      }
      this.dismissedToasts_.add(toast);
      try {
        libraryDismiss();
      } catch {
        /*
         * Only covers the synchronous part; the container teardown runs later in a library
         * setTimeout, which is why the once-only guard above is the real fix. A stale toast
         * must never reach the global error trapper (#1425, #1433).
         */
      }
    };
  }

  dismissAllToasts() {
    const toasts = this.activeToastList_;

    this.activeToastList_ = [];
    toasts.forEach((toast) => {
      toast.dismiss();
    });
  }

  /**
   * Ensure the toast template exists. Injected from code (not index.html) so every
   * entry point (main, embed, celestrak) gets it. Toast clones this per toast via
   * the v2 toastId option.
   */
  private static ensureToastTemplate_(): void {
    if (document.getElementById(UiManager.TOAST_TEMPLATE_ID)) {
      return;
    }

    const template = document.createElement('template');

    template.id = UiManager.TOAST_TEMPLATE_ID;
    template.innerHTML = '<div><img class="kt-toast-icon" alt="" /><span class="kt-toast-msg"></span><div class="kt-toast-progress"></div></div>';
    document.body.appendChild(template);
  }

  /**
   * How long a toast stays up. Every errorManager warn/info/log toast passes
   * isLong, which used to mean 100 s for all of them: a "Max Results" caution
   * sat over the search results for over a minute. Only critical and error
   * toasts keep the long timer; everything else auto-dismisses within
   * LONG_NON_CRITICAL_MAX_MS even when isLong is set.
   */
  private static toastDuration_(toastText: string, type: ToastMsgType, isLong: boolean): number {
    // About 100 ms per character so longer messages stay readable.
    const readingTime = toastText.length * 100;

    if (!isLong) {
      return Math.min(Math.max(readingTime, 4000), 12000);
    }

    if (type === ToastMsgType.critical || type === ToastMsgType.error) {
      return UiManager.LONG_TIMER_DELAY;
    }

    return Math.min(Math.max(readingTime, 8000), UiManager.LONG_NON_CRITICAL_MAX_MS);
  }

  /**
   * The toast container spans the full width of the page under the top menu
   * (#toast-container min-width: 100%), so while any toast was up the whole
   * band swallowed clicks meant for the search results and menus beneath it.
   * The container lets clicks through; only the toast card itself takes them
   * (click dismisses it).
   */
  private static makeToastClickThrough_(toastEl: HTMLElement): void {
    const container = toastEl.parentElement;

    if (container) {
      container.style.pointerEvents = 'none';
    }
    toastEl.style.pointerEvents = 'auto';
  }

  /**
   * Adds the action button to a toast. A real <button> keeps it reachable with Tab and
   * operable with Enter/Space; the click must not bubble to the toast's own
   * click-to-dismiss handler, and the callback runs at most once.
   */
  private static attachToastAction_(toastEl: HTMLElement, toastMsg: Toast, action: ToastAction): void {
    const button = document.createElement('button');
    let isDone = false;

    button.type = 'button';
    button.className = 'kt-toast-action';
    button.textContent = action.label;
    button.addEventListener('click', (evt: MouseEvent) => {
      evt.stopPropagation();
      if (isDone) {
        return;
      }
      isDone = true;
      try {
        action.callback();
      } catch (error) {
        errorManagerInstance.debug(`toast action failed: ${String(error)}`);
      }
      toastMsg.dismiss();
    });

    toastEl.insertBefore(button, toastEl.querySelector('.kt-toast-progress'));
  }

  private makeToast_(toastText: string, type: ToastMsgType, isLong = false, action?: ToastAction) {
    if (settingsManager.isDisableToasts) {
      return null;
    }

    type = type || ToastMsgType.standby;

    // Icon source is based on type
    let iconSrc: string;

    switch (type) {
      case ToastMsgType.standby:
        iconSrc = infoPng;
        break;
      case ToastMsgType.caution:
        iconSrc = warningPng;
        break;
      case ToastMsgType.serious:
        iconSrc = warningPng;
        break;
      case ToastMsgType.critical:
        iconSrc = cancelPng;
        break;
      case ToastMsgType.error:
        iconSrc = cancelPng;
        break;
      case ToastMsgType.normal:
      default:
        iconSrc = checkCirclePng;
        break;
    }

    /*
     * Clone the toast structure from the template (v2 toastId option). `text` must
     * stay empty — Toast renders it via innerText, which would wipe the children.
     */
    UiManager.ensureToastTemplate_();
    /*
     * displayLength: Infinity disables Materialize's own 20 ms auto-dismiss interval. The
     * library's dismiss() is not idempotent, and its timer never consulted dismissedToasts_,
     * so a tap on a toast that was already fading tore the container down twice (#1425,
     * #1433). KeepTrack owns the auto-dismiss below; guardDismiss_ makes every dismiss once-only.
     */
    const toastMsg = new Toast({ text: '', toastId: UiManager.TOAST_TEMPLATE_ID, displayLength: Infinity });

    this.guardDismiss_(toastMsg);
    const toastEl = toastMsg.el;

    const icon = toastEl.querySelector<HTMLImageElement>('.kt-toast-icon');

    if (icon) {
      icon.src = iconSrc;
    }

    const message = toastEl.querySelector<HTMLElement>('.kt-toast-msg');

    if (message) {
      message.textContent = toastText;
    }

    // Add an on click event to dismiss the toast
    toastEl.addEventListener('click', () => {
      toastMsg.dismiss();
    });

    toastEl.addEventListener('contextmenu', () => {
      this.dismissAllToasts();
    });

    toastMsg.timeRemaining = UiManager.toastDuration_(toastText, type, isLong);
    if (action) {
      UiManager.attachToastAction_(toastEl, toastMsg, action);
      toastMsg.timeRemaining = action.durationMs ?? Math.max(toastMsg.timeRemaining, UiManager.TOAST_ACTION_MIN_MS);
    }
    UiManager.makeToastClickThrough_(toastEl);

    // Auto-dismiss progress bar (part of the template)
    const progressBar = toastEl.querySelector<HTMLElement>('.kt-toast-progress');

    if (progressBar) {
      progressBar.style.animationDuration = `${toastMsg.timeRemaining}ms`;
    }

    // Auto-dismiss, click, contextmenu and a library swipe all share the guarded dismiss(),
    // so a toast can only ever be torn down once no matter which trigger fires first.
    setTimeout(() => {
      toastMsg.dismiss();
    }, toastMsg.timeRemaining);

    switch (type) {
      case ToastMsgType.standby:
        toastEl.style.setProperty('--kt-toast-accent', '#2dccff');
        ServiceLocator.getSoundManager()?.play(SoundNames.WARNING);
        break;
      case ToastMsgType.caution:
        toastEl.style.setProperty('--kt-toast-accent', '#fce83a');
        ServiceLocator.getSoundManager()?.play(SoundNames.WARNING);
        break;
      case ToastMsgType.serious:
        toastEl.style.setProperty('--kt-toast-accent', '#ffb302');
        ServiceLocator.getSoundManager()?.play(SoundNames.WARNING);
        break;
      case ToastMsgType.critical:
        toastEl.style.setProperty('--kt-toast-accent', '#ff3838');
        ServiceLocator.getSoundManager()?.play(SoundNames.WARNING);
        break;
      case ToastMsgType.error:
        toastEl.style.setProperty('--kt-toast-accent', '#ff3838');
        ServiceLocator.getSoundManager()?.play(SoundNames.ERROR);
        break;
      case ToastMsgType.normal:
      default:
        toastEl.style.setProperty('--kt-toast-accent', '#56f000');
        ServiceLocator.getSoundManager()?.play(SoundNames.WARNING);
        break;
    }

    return toastMsg;
  }

  colorSchemeChangeAlert(newScheme: ColorScheme) {
    /*
     * Don't make an alert unless something has really changed
     * Check if the name of the lastColorScheme function is the same as the name of the new color scheme
     */
    if (ServiceLocator.getColorSchemeManager().lastColorScheme?.id === newScheme.id) {
      return;
    }

    // Make an alert
    this.toast(t7e('toasts.colorSchemeChanged' as TranslationKey).replace('{scheme}', newScheme.label), ToastMsgType.normal, false);
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
      hideEl('search-results');
      hideEl('nav-footer');
      hideEl('plugin-drawer');
      hideEl('drawer-overlay');
      hideEl('drawer-utility-footer');
      hideEl('drawer-hamburger');
      this.pluginDrawer?.close();
      this.isUiVisible = false;
    } else {
      showEl('keeptrack-header');
      showEl('search-results');
      showEl('nav-footer');
      showEl('plugin-drawer', 'flex');
      showEl('drawer-overlay');
      showEl('drawer-utility-footer', 'flex');
      showEl('drawer-hamburger');
      this.isUiVisible = true;
    }
  }

  init() {
    if (this.isInitialized_) {
      throw new Error('UiManager already initialized');
    }

    this.searchManager = new SearchManager();
    this.searchManager.init();

    this.layersManager = new LayersManager();
    this.layersManager.init();

    this.pluginDrawer = new PluginDrawer();
    this.pluginDrawer.init();

    if (settingsManager.isShowPrimaryLogo && settingsManager.isShowFloatingLogos) {
      getEl('logo-primary')?.classList.remove('start-hidden');
    }
    if (settingsManager.isShowSecondaryLogo && settingsManager.isShowFloatingLogos) {
      getEl('logo-secondary')?.classList.remove('start-hidden');
    }

    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

    this.sortBottomIcons();
    this.sortUtilityIcons_();

    UiManager.initBottomMenuResizing_();

    // Initialize Navigation and Select Menus
    const elems = document.querySelectorAll('.dropdown-button');

    new KeyboardComponent('UiManager', [
      {
        key: 'F2',
        shift: true,
        description: t7e('keyboard.descriptions.hideUi' as TranslationKey),
        callback: () => this.hideUi(),
      },
    ]).init();

    Dropdown.init(elems);
    this.isInitialized_ = true;
  }

  private sortBottomIcons() {
    const bottomIcons = document.querySelectorAll('#bottom-icons > div');
    const sortedIcons = Array.from(bottomIcons).sort((a, b) => {
      const aOrder = Number.parseInt((a as HTMLElement).dataset.order ?? KeepTrackPlugin.MAX_BOTTOM_ICON_ORDER.toString(), 10);
      const bOrder = Number.parseInt((b as HTMLElement).dataset.order ?? KeepTrackPlugin.MAX_BOTTOM_ICON_ORDER.toString(), 10);

      return aOrder - bOrder;
    });
    const bottomIconsContainer = getEl('bottom-icons');

    if (bottomIconsContainer) {
      // Clear the container before appending sorted icons
      bottomIconsContainer.innerHTML = '';
      sortedIcons.forEach((icon) => {
        bottomIconsContainer.appendChild(icon);
      });
    }
  }

  private sortUtilityIcons_() {
    const sortWithinContainer = (containerId: string) => {
      const container = getEl(containerId);

      if (!container) {
        return;
      }

      const icons = Array.from(container.querySelectorAll(':scope > div'));
      const sorted = [...icons].sort((a, b) => {
        const aOrder = Number.parseInt((a as HTMLElement).dataset.order ?? '100', 10);
        const bOrder = Number.parseInt((b as HTMLElement).dataset.order ?? '100', 10);

        return aOrder - bOrder;
      });

      sorted.forEach((icon) => {
        container.appendChild(icon);
      });
    };

    sortWithinContainer('utility-camera-icons');
    sortWithinContainer('utility-layer-icons');
  }

  initMenuController() {
    // Resizing Listener
    window.addEventListener('resize', () => {
      MobileManager.checkMobileMode();
      settingsManager.isResizing = true;
    });

    this.addSearchEventListeners_();

    getEl('fullscreen-btn')?.addEventListener('click', () => {
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

    if (navFooterDom && Number.parseInt(window.getComputedStyle(navFooterDom).bottom.replace('px', '')) < 0) {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      setTimeout(() => {
        const bottomHeight = getEl('bottom-icons-container')?.offsetHeight;

        document.documentElement.style.setProperty('--bottom-menu-top', `${bottomHeight}px`);
      }, 1000); // Wait for the footer to be fully visible.
    } else {
      // If the footer is open, then it will be hidden shortly but we don't want to wait for it to be hidden
      document.documentElement.style.setProperty('--bottom-menu-top', '0px');
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
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

  onReady() {
    // Code Once index.htm is loaded
    if (settingsManager.offlineMode) {
      this.updateInterval = 250;
    }

    // Run any plugins code
    EventBus.getInstance().emit(EventBusEvent.uiManagerOnReady);

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
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
    });
  }

  /**
   * Shows a toast. `action` adds one button (e.g. Undo) that runs its callback once
   * and closes the toast; such toasts stay up at least TOAST_ACTION_MIN_MS.
   */
  toast(toastText: string, type: ToastMsgType, isLong = false, action?: ToastAction) {
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
      const toastMsg = this.makeToast_(toastText, type, isLong, action);

      if (toastMsg) {
        this.activeToastList_.push(toastMsg);
      }
    } catch {
      errorManagerInstance.debug('toast failed');
    }
  }

  private activeToastList_ = [] as Toast[];

  /**
   * Checks if enough time has elapsed and then calls all queued updateSelectBox callbacks
   */
  updateSelectBox(realTime: Milliseconds, lastBoxUpdateTime: Milliseconds, obj: BaseObject): void {
    if (!obj || obj.id === -1 || obj.isStatic()) {
      return;
    }

    if (realTime * 1 > lastBoxUpdateTime * 1 + this.updateInterval) {
      EventBus.getInstance().emit(EventBusEvent.updateSelectBox, obj as EngineEventMap[EventBusEvent.updateSelectBox][0]);
      ServiceLocator.getTimeManager().lastBoxUpdateTime = realTime;
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
