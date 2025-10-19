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

  isVisible_ = false;
  tooltipTag = 'kt-tooltip';

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        const tooltipDiv = document.createElement('div');

        tooltipDiv.id = 'tooltip';
        tooltipDiv.style.display = 'none';
        tooltipDiv.style.position = 'absolute';
        tooltipDiv.style.zIndex = '999999';
        tooltipDiv.style.width = '200px';
        tooltipDiv.style.marginLeft = '-100px';
        tooltipDiv.style.overflow = 'visible';
        tooltipDiv.style.backgroundColor = 'var(--color-primary-dark)';
        tooltipDiv.style.textAlign = 'center';
        tooltipDiv.style.padding = '5px';
        tooltipDiv.style.borderWidth = '5px';
        tooltipDiv.style.borderColor = 'var(--color-primary)';
        tooltipDiv.style.borderStyle = 'solid';
        tooltipDiv.style.color = '#ffffff';
        tooltipDiv.style.fontSize = 'smaller';
        tooltipDiv.textContent = tooltipDiv.getAttribute('data-tooltip') ?? '';
        document.body.appendChild(tooltipDiv);
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.onKeepTrackReady,
      () => {
        this.initTooltips();
      },
    );
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

    el.addEventListener('mouseenter', (event) => {
      // Don't show if it is already visible
      if (this.isVisible_) {
        return;
      }
      this.showTooltip(event, (event.target as HTMLElement).getAttribute(this.tooltipTag) ?? '');
      this.isVisible_ = true;
    });

    el.addEventListener('mouseleave', () => {
      this.hideTooltip();
      this.isVisible_ = false;
    });

    el.style.cursor = 'pointer';
  }

  hideTooltip() {
    const tooltipDiv = document.getElementById('tooltip') as HTMLDivElement;

    if (tooltipDiv) {
      tooltipDiv.style.display = 'none';
    }
  }

  showTooltip(event: MouseEvent, text: string): void {
    const tooltipDiv = document.getElementById('tooltip') as HTMLDivElement;

    if (!tooltipDiv) {
      return;
    }

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get tooltip dimensions (force display to measure)
    tooltipDiv.style.display = 'block';
    tooltipDiv.style.visibility = 'hidden';
    const tooltipRect = tooltipDiv.getBoundingClientRect();

    tooltipDiv.style.visibility = 'visible';

    // Set tooltip HTML (allow <br />)
    tooltipDiv.innerHTML = text;

    // Calculate available space in each direction
    const spaceAbove = event.clientY / viewportHeight;
    const spaceBelow = (viewportHeight - event.clientY) / viewportHeight;
    const spaceLeft = event.clientX / viewportWidth;
    const spaceRight = (viewportWidth - event.clientX) / viewportWidth;

    // Choose direction with most space
    let top: number;
    let left: number;

    type TooltipDirection = 'top' | 'bottom' | 'left' | 'right';

    const spaces = [
      { dir: 'top', value: spaceAbove },
      { dir: 'bottom', value: spaceBelow },
      { dir: 'left', value: spaceLeft },
      { dir: 'right', value: spaceRight },
    ];

    spaces.sort((a, b) => b.value - a.value);
    const direction = spaces[0].dir as TooltipDirection;

    // Position tooltip based on direction
    switch (direction) {
      case 'top':
        top = event.pageY - tooltipRect.height - 10;
        left = event.pageX;
        break;
      case 'bottom':
        top = event.pageY + tooltipRect.height / 2 + 5;
        left = event.pageX;
        break;
      case 'left':
        top = event.pageY - tooltipRect.height / 2;
        left = event.pageX - tooltipRect.width / 2 - 20;
        break;
      case 'right':
        top = event.pageY - tooltipRect.height / 2;
        left = event.pageX + tooltipRect.width / 2 + 20;
        break;
      default:
        errorManagerInstance.warn(`Unknown tooltip direction: ${direction}`);

        return;
    }

    // Clamp position to viewport
    top = Math.max(0, Math.min(top, viewportHeight - tooltipRect.height));
    left = Math.max(0, Math.min(left, viewportWidth - (tooltipRect.width / 2)));

    tooltipDiv.style.left = `${left}px`;
    tooltipDiv.style.top = `${top}px`;
    tooltipDiv.style.display = 'block';
  }
}

