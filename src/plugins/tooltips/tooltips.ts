import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
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

  private static readonly SHOW_DELAY_ = 150;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      const tooltipDiv = document.createElement('div');

      tooltipDiv.id = 'tooltip';
      tooltipDiv.className = 'kt-tooltip-popup';
      document.body.appendChild(tooltipDiv);
    });

    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
      this.initTooltips();
    });
  }

  initTooltips(): void {
    // Search the entire dom tree for kt-tooltip attributes
    const elements = document.querySelectorAll(`[${this.tooltipTag}]`);

    elements.forEach((el) => {
      const text = el.getAttribute(this.tooltipTag);

      if (!text) {
        errorManagerInstance.warn('Failed to create tooltip: Element has no kt-tooltip attribute.');

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
      errorManagerInstance.warn('Failed to create tooltip: Element is null or undefined.');

      return;
    }

    let isHovered = false;

    const dismiss = () => {
      if (this.showTimer_) {
        clearTimeout(this.showTimer_);
        this.showTimer_ = null;
      }
      this.hideTooltip();
      this.isVisible_ = false;
    };

    el.addEventListener('mouseenter', () => {
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

    /*
     * Clicking a tooltipped control usually toggles UI that hides or replaces the
     * target (e.g. a drawer item closing the drawer); no mouseleave fires for an
     * element hidden under the cursor, which left the tooltip stuck on screen.
     */
    el.addEventListener('click', dismiss);

    el.style.cursor = 'pointer';
  }

  hideTooltip() {
    const tooltipDiv = document.getElementById('tooltip');

    if (tooltipDiv) {
      tooltipDiv.classList.remove('kt-tooltip-visible');
    }
  }

  showTooltip(targetEl: HTMLElement, text: string): void {
    const tooltipDiv = document.getElementById('tooltip');

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

    tooltipDiv.style.left = `${left}px`;
    tooltipDiv.style.top = `${top}px`;
    tooltipDiv.classList.add('kt-tooltip-visible');
  }
}
