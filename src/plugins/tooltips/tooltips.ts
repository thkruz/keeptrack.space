import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';

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

export class TooltipsPlugin extends KeepTrackPlugin {
  readonly id = 'TooltipsPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [];

  private isVisible_ = false;
  private showTimer_: ReturnType<typeof setTimeout> | null = null;
  tooltipTag = 'kt-tooltip';
  /** Attribute that opts a target into tap-to-toggle on touch devices. */
  tapAttr = 'kt-tooltip-tap';
  private shownFor_: HTMLElement | null = null;
  private readonly wired_ = new WeakSet<HTMLElement>();

  private static readonly SHOW_DELAY_ = 150;
  private static readonly WATCH_INTERVAL_ = 400;
  /** The element the visible tooltip belongs to, so a watchdog can clear it when that element stops being hovered or shown (#287). */
  private activeTarget_: HTMLElement | null = null;
  private watchTimer_: ReturnType<typeof setInterval> | null = null;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.ensureTooltipDiv_();
    });

    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
      this.initTooltips();
    });

    /*
     * Targets rendered after onKeepTrackReady (sat info box circles, menus built on demand) were never wired.
     * Wire them on first pointer contact; capture phase so the listeners exist before the target's own phase.
     */
    const wireLate = (e: Event) => {
      const target = e.target as Element | null;
      const el = typeof target?.closest === 'function' ? (target.closest(`[${this.tooltipTag}]`) as HTMLElement | null) : null;

      if (el && !this.wired_.has(el) && el.getAttribute(this.tooltipTag)) {
        this.createTooltip(el);
      }
    };

    document.addEventListener('pointerdown', wireLate, true);
    document.addEventListener('mouseover', wireLate, true);

    // A tap-shown tooltip stays until the next tap elsewhere
    document.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.shownFor_ && !this.shownFor_.contains(e.target as Node | null)) {
        this.hideTooltip();
        this.isVisible_ = false;
        this.shownFor_ = null;
      }
    });
  }

  initTooltips(): void {
    // Search the entire dom tree for kt-tooltip attributes
    const elements = document.querySelectorAll(`[${this.tooltipTag}]`);

    elements.forEach((el) => {
      const text = el.getAttribute(this.tooltipTag);

      if (!text) {
        errorManagerInstance.warn(t7e('plugins.Tooltips.errorMsgs.missingAttribute'));

        return;
      }

      this.createTooltip(el as HTMLElement);
    });
  }

  createTooltip(el: HTMLElement | string): void {
    if (typeof el === 'string') {
      el = getEl(el) as HTMLElement;
    }

    if (!el) {
      errorManagerInstance.warn(t7e('plugins.Tooltips.errorMsgs.missingElement'));

      return;
    }

    if (this.wired_.has(el)) {
      return;
    }
    this.wired_.add(el);

    let isHovered = false;

    const dismiss = () => {
      if (this.showTimer_) {
        clearTimeout(this.showTimer_);
        this.showTimer_ = null;
      }
      this.hideTooltip();
      this.isVisible_ = false;
      this.shownFor_ = null;
    };

    el.addEventListener('mouseenter', () => {
      // Touch screens emulate mouseenter after a tap; hover tooltips would then stick over neighbouring labels (#217).
      if (typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches && !el.hasAttribute(this.tapAttr)) {
        return;
      }

      isHovered = true;

      // A pending show for another element would otherwise leak through the shared timer
      if (this.showTimer_) {
        clearTimeout(this.showTimer_);
        this.showTimer_ = null;
      }

      if (this.isVisible_) {
        return;
      }

      const text = (el as HTMLElement).getAttribute(this.tooltipTag) ?? '';

      // Targets may drop their tooltip text while registered (e.g. a summary that only needs one when truncated).
      if (!text) {
        return;
      }

      // Delay showing tooltip to avoid flicker on fast mouse movement
      this.showTimer_ = setTimeout(() => {
        this.showTimer_ = null;

        // The target may be gone or no longer hovered by the time the delay elapses
        if (!isHovered || !(el as HTMLElement).isConnected) {
          return;
        }

        this.showTooltip(el as HTMLElement, text);
        this.isVisible_ = true;
      }, TooltipsPlugin.SHOW_DELAY_);
    });

    el.addEventListener('mouseleave', () => {
      isHovered = false;
      dismiss();
    });

    // Keyboard users reach tooltipped controls with Tab: show on keyboard focus, hide on blur.
    el.addEventListener('focus', () => {
      const text = (el as HTMLElement).getAttribute(this.tooltipTag) ?? '';

      if (!text || !(el as HTMLElement).matches(':focus-visible')) {
        return;
      }

      this.showTooltip(el as HTMLElement, text);
      this.isVisible_ = true;
    });
    el.addEventListener('blur', dismiss);

    /*
     * Clicking a tooltipped control usually toggles UI that hides or replaces the
     * target (e.g. a drawer item closing the drawer); no mouseleave fires for an
     * element hidden under the cursor, which left the tooltip stuck on screen.
     */
    /*
     * Touch has no hover: a tap on a tap-to-toggle target (info circles) shows its tooltip and a second tap hides it.
     * The toggle runs on pointerup so it does not depend on the emulated mouse events a touch screen sends afterwards
     * (mouseenter would otherwise race the click); the click that follows is swallowed.
     */
    let handledByTouch = false;
    const toggleForTouch = () => {
      const wasShownHere = this.isVisible_ && this.shownFor_ === el;

      dismiss();

      if (wasShownHere) {
        return;
      }

      const text = (el as HTMLElement).getAttribute(this.tooltipTag) ?? '';

      if (text) {
        this.showTooltip(el as HTMLElement, text);
        this.isVisible_ = true;
        this.shownFor_ = el as HTMLElement;
      }
    };

    el.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.pointerType === 'touch' && (el as HTMLElement).hasAttribute(this.tapAttr)) {
        handledByTouch = true;
        toggleForTouch();
      }
    });
    // Tap-to-toggle targets toggle on click for any pointer type (phone harnesses and hybrid devices send mouse events)
    el.addEventListener('click', () => {
      if (handledByTouch) {
        handledByTouch = false;

        return;
      }

      if ((el as HTMLElement).hasAttribute(this.tapAttr)) {
        toggleForTouch();

        return;
      }

      dismiss();
    });

    el.style.cursor = 'pointer';
  }

  /** Re-renders the visible tooltip when it belongs to `el` and the element's text changed while it was showing (#274). */
  refreshTooltip(el: HTMLElement): void {
    if (this.activeTarget_ !== el || !el.isConnected) {
      return;
    }
    const text = el.getAttribute(this.tooltipTag) ?? '';

    if (text) {
      this.showTooltip(el, text);
    } else {
      this.hideTooltip();
    }
  }

  /** True while the tooltip's element is still attached, rendered and under the pointer or keyboard focus. */
  private isTargetStillActive_(): boolean {
    const target = this.activeTarget_;

    if (!target || !target.isConnected) {
      return false;
    }
    const rect = target.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      return false;
    }
    if (target === this.shownFor_) {
      return true;
    }

    return target.matches(':hover') || target.matches(':focus-visible');
  }

  private startWatchdog_(): void {
    this.stopWatchdog_();
    this.watchTimer_ = setInterval(() => {
      if (!this.isTargetStillActive_()) {
        this.hideTooltip();
        this.isVisible_ = false;
        this.shownFor_ = null;
      }
    }, TooltipsPlugin.WATCH_INTERVAL_);
  }

  private stopWatchdog_(): void {
    if (this.watchTimer_) {
      clearInterval(this.watchTimer_);
      this.watchTimer_ = null;
    }
    this.activeTarget_ = null;
  }

  hideTooltip() {
    this.stopWatchdog_();
    const tooltipDiv = document.getElementById('tooltip');

    if (tooltipDiv) {
      tooltipDiv.classList.remove('kt-tooltip-visible');
    }
  }

  /** Returns the popup div, creating it when missing (phone boots can skip or miss uiManagerInit). */
  private ensureTooltipDiv_(): HTMLElement {
    const existing = document.getElementById('tooltip');

    if (existing) {
      return existing;
    }

    const tooltipDiv = document.createElement('div');

    tooltipDiv.id = 'tooltip';
    tooltipDiv.className = 'kt-tooltip-popup';
    document.body.appendChild(tooltipDiv);

    return tooltipDiv;
  }

  showTooltip(targetEl: HTMLElement, text: string): void {
    const tooltipDiv = this.ensureTooltipDiv_();

    if (!tooltipDiv) {
      return;
    }

    // Set tooltip content
    tooltipDiv.innerHTML = text;

    // Make the tooltip measurable, then read both rects back-to-back. The target's
    // bounds are independent of the measuring class, so reading them before removing
    // the class keeps the second read on the same clean layout instead of forcing a
    // second reflow (batched read → single forced layout).
    tooltipDiv.classList.add('kt-tooltip-measuring');
    const tooltipRect = tooltipDiv.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    tooltipDiv.classList.remove('kt-tooltip-measuring');

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default: position above the element, centered horizontally
    let top = targetRect.top + window.scrollY - tooltipRect.height - 8;
    let left = targetRect.left + window.scrollX + targetRect.width / 2 - tooltipRect.width / 2;

    // If not enough space above, position below
    if (targetRect.top < tooltipRect.height + 16) {
      top = targetRect.bottom + window.scrollY + 8;
    }

    // Clamp horizontally to viewport
    left = Math.max(8, Math.min(left, viewportWidth - tooltipRect.width - 8));

    // Clamp vertically to viewport
    top = Math.max(8, Math.min(top, viewportHeight + window.scrollY - tooltipRect.height - 8));

    // Left drawer rows: open beside the drawer so the popup never covers a neighbouring row's label or shortcut (#298).
    const drawerEl = targetEl.closest<HTMLElement>('.plugin-drawer');

    if (drawerEl) {
      const drawerRect = drawerEl.getBoundingClientRect();
      const sideLeft = drawerRect.right + 8;

      if (sideLeft + tooltipRect.width + 8 > viewportWidth) {
        // No room beside the drawer (phone): the row label is already on screen, so show nothing.
        return;
      }
      left = sideLeft;
      top = Math.max(8, Math.min(targetRect.top + window.scrollY + targetRect.height / 2 - tooltipRect.height / 2, viewportHeight + window.scrollY - tooltipRect.height - 8));
    }

    // Info box rows: open beside the box (left, else right) so the popup never hides the neighbouring values (#273)
    const infoBoxEl = targetEl.closest<HTMLElement>('#sat-infobox');

    if (infoBoxEl) {
      const boxRect = infoBoxEl.getBoundingClientRect();
      const sideTop = Math.max(
        8,
        Math.min(targetRect.top + window.scrollY + targetRect.height / 2 - tooltipRect.height / 2, viewportHeight + window.scrollY - tooltipRect.height - 8)
      );

      if (boxRect.left - 8 - tooltipRect.width >= 8) {
        left = boxRect.left - 8 - tooltipRect.width;
        top = sideTop;
      } else if (boxRect.right + 8 + tooltipRect.width + 8 <= viewportWidth) {
        left = boxRect.right + 8;
        top = sideTop;
      }
    }

    tooltipDiv.style.left = `${left}px`;
    tooltipDiv.style.top = `${top}px`;
    tooltipDiv.classList.add('kt-tooltip-visible');
    // startWatchdog_ clears activeTarget_ (via stopWatchdog_), so assign it afterwards or the watchdog hides the
    // bubble at its first tick (#277) and refreshTooltip never matches (#274).
    this.startWatchdog_();
    this.activeTarget_ = targetEl;
  }
}
