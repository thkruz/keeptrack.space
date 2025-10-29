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

import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { html } from '../utils/development/formatter';
import { getEl } from '../utils/get-el';
import { KeepTrackPlugin } from './base-plugin';

export abstract class TopMenuPlugin extends KeepTrackPlugin {
  id: string = '';
  protected dependencies_ = [TopMenu.name];

  protected image: string = ''; // Override in subclass
  protected tooltipText: string = 'Tooltip Text'; // Override in subclass

  constructor() {
    super();

    this.id = `TopMenuPlugin-${uuidv4()}`;
  }

  addHtml() {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      this.uiManagerFinal_.bind(this),
    );
  }

  protected onClick_(): void {
    // Override in subclass
  }

  protected uiManagerFinal_(): void {
    const pluginRootEl = document.createElement('li');

    pluginRootEl.innerHTML = html`
      <a id="${this.id}-btn" class="top-menu-icons" kt-tooltip="${this.tooltipText}">
        <img class="top-menu-icons__blue-img" src="${this.image}" />
      </a>
    `;

    const topRightMenuElement = getEl(TopMenu.TOP_RIGHT_ID, true);

    // The top menu might not exist if the TopMenu plugin is disabled
    if (topRightMenuElement) {
      topRightMenuElement.insertBefore(pluginRootEl, getEl(TopMenu.TOP_RIGHT_ID)?.firstChild ?? null);
      pluginRootEl.onclick = () => this.onClick_();
    }
  }
}
