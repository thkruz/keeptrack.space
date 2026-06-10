/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * close-objects.ts finds satellites and debris within close proximity using a
 * two-phase spatial search algorithm.
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

import { SatMath } from '@app/app/analysis/sat-math';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { getUnique } from '@app/engine/utils/get-unique';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { Kilometers, Satellite, TemeVec3 } from '@ootk/src/main';
import scatterPlotPng from '@public/img/icons/scatter-plot.png';

export class CloseObjectsPlugin extends KeepTrackPlugin {
  readonly id = 'CloseObjectsPlugin';
  dependencies_ = [];

  protected searchRadius_ = 50; // km - overridable by Pro
  protected closeObjectSearchStrCache_: string | null = null;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'close-objects-icon',
      label: t7e('plugins.CloseObjectsPlugin.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: scatterPlotPng,
      menuMode: [MenuMode.EVENTS, MenuMode.ALL],
    };
  }

  onBottomIconClick(): void {
    // No special behavior on click
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'close-objects-menu',
      title: t7e('plugins.CloseObjectsPlugin.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.CloseObjectsPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.CloseObjectsPlugin.help.overview'),
          image: {
            src: 'img/help/close-objects/close-objects-menu.png',
            alt: t7e('plugins.CloseObjectsPlugin.help.imgAlt'),
            caption: t7e('plugins.CloseObjectsPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.CloseObjectsPlugin.help.methodHeading'),
          content: t7e('plugins.CloseObjectsPlugin.help.method'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.CloseObjectsPlugin.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.CloseObjectsPlugin.help.tip1'),
        t7e('plugins.CloseObjectsPlugin.help.tip2'),
      ],
    };
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  protected buildSideMenuHtml_(): string {
    const innerHtml = html`
      <div class="row">
        <center>
          <button id="co-find-btn" class="btn btn-ui waves-effect waves-light">
            ${t7e('plugins.CloseObjectsPlugin.findBtn' as Parameters<typeof t7e>[0])} &#9658;
          </button>
        </center>
      </div>
    `;

    // Pro adds getSecondaryMenuConfig() - generateSideMenuHtml_() auto-wraps with title bar
    if ('getSecondaryMenuConfig' in this) {
      return innerHtml;
    }

    // OSS: must include full wrapper + title since addHtml() inserts as-is
    const title = t7e('plugins.CloseObjectsPlugin.title' as Parameters<typeof t7e>[0]);

    return html`
      <div id="close-objects-menu" class="side-menu-parent start-hidden">
        <div class="side-menu">
          <div class="row" style="margin: 5px 1rem 0; display: flex; justify-content: center; align-items: center;">
            <h5 class="center-align" style="margin: 0px auto">${title}</h5>
          </div>
          <li class="divider" style="padding: 2px !important;"></li>
          <div class="row"></div>
          ${innerHtml}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      this.uiManagerFinal_.bind(this),
    );
  }

  protected uiManagerFinal_() {
    getEl('co-find-btn')?.addEventListener('click', () => {
      showLoading(() => this.findCsoBtnClick_());
    });
  }

  // =========================================================================
  // Close object search algorithm
  // =========================================================================

  protected findCsoBtnClick_() {
    const searchStr = this.findCloseObjects_();

    ServiceLocator.getUiManager().doSearch(searchStr);
  }

  protected findCloseObjects_(): string {
    if (this.closeObjectSearchStrCache_) {
      return this.closeObjectSearchStrCache_;
    }

    let satList = CloseObjectsPlugin.getValidSats_();

    satList = getUnique(satList);
    satList.sort((a, b) => a.position.x - b.position.x);

    const csoList = CloseObjectsPlugin.getPossibleCSOs_(satList, this.searchRadius_);
    const csoListUnique = getUnique(csoList);
    const csoStrArr = CloseObjectsPlugin.getActualCSOs_(csoListUnique, this.searchRadius_);

    const csoListUniqueArr = Array.from(new Set(csoStrArr));
    const searchStr = csoListUniqueArr.join(',');

    this.closeObjectSearchStrCache_ = searchStr;

    return searchStr;
  }

  protected static getValidSats_(): Satellite[] {
    const satList = <Satellite[]>[];

    for (let i = 0; i < ServiceLocator.getCatalogManager().orbitalSats; i++) {
      const sat = ServiceLocator.getCatalogManager().getSat(i);

      if (!sat) {
        continue;
      }

      if (typeof sat.position === 'undefined') {
        sat.position = <TemeVec3>SatMath.getEci(sat, new Date()).position || { x: <Kilometers>0, y: <Kilometers>0, z: <Kilometers>0 };
      }

      if (isNaN(sat.position.x) || isNaN(sat.position.y) || isNaN(sat.position.z)) {
        continue;
      }
      if (sat.position && typeof sat.position !== 'boolean' && sat.position.x === 0 && sat.position.y === 0 && sat.position.z === 0) {
        continue;
      }

      satList.push(sat);
    }

    return satList;
  }

  protected static getPossibleCSOs_(satList: Satellite[], searchRadius: number): { sat1: Satellite; sat2: Satellite }[] {
    const csoList = [] as { sat1: Satellite; sat2: Satellite }[];

    for (let i = 0; i < satList.length; i++) {
      const sat1 = satList[i];
      const pos1 = sat1.position;

      const posXmin = pos1.x - searchRadius;
      const posXmax = pos1.x + searchRadius;
      const posYmin = pos1.y - searchRadius;
      const posYmax = pos1.y + searchRadius;
      const posZmin = pos1.z - searchRadius;
      const posZmax = pos1.z + searchRadius;

      for (let j = Math.max(0, i - 200); j < satList.length; j++) {
        const sat2 = satList[j];

        if (sat1 === sat2) {
          continue;
        }
        const pos2 = sat2.position;

        if (pos2.x > posXmax) {
          break;
        }
        if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
          csoList.push({ sat1, sat2 });
        }
      }
    }

    return csoList;
  }

  protected static getActualCSOs_(csoListUnique: { sat1: Satellite; sat2: Satellite }[], searchRadius: number): string[] {
    const csoStrArr = [] as string[];

    // Re-propagate to 30 minutes in the future for verification
    for (const posCso of csoListUnique) {
      let sat = posCso.sat1;
      let eci = SatMath.getEci(sat, new Date(Date.now() + 1000 * 60 * 30));

      if (eci.position && typeof eci.position !== 'boolean' && eci.position.x === 0 && eci.position.y === 0 && eci.position.z === 0) {
        continue;
      }
      posCso.sat1.position = eci.position as TemeVec3;

      sat = posCso.sat2;
      eci = SatMath.getEci(sat, new Date(Date.now() + 1000 * 60 * 30));
      if (eci.position && typeof eci.position !== 'boolean' && eci.position.x === 0 && eci.position.y === 0 && eci.position.z === 0) {
        continue;
      }
      posCso.sat2.position = eci.position as TemeVec3;
    }

    for (const posCso of csoListUnique) {
      const pos1 = posCso.sat1.position;

      if (typeof pos1 === 'undefined') {
        continue;
      }

      const posXmin = pos1.x - searchRadius;
      const posXmax = pos1.x + searchRadius;
      const posYmin = pos1.y - searchRadius;
      const posYmax = pos1.y + searchRadius;
      const posZmin = pos1.z - searchRadius;
      const posZmax = pos1.z + searchRadius;

      const pos2 = posCso.sat2.position;

      if (typeof pos2 === 'undefined') {
        continue;
      }

      if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
        csoStrArr.push(posCso.sat1.sccNum);
        csoStrArr.push(posCso.sat2.sccNum);
      }
    }

    return csoStrArr;
  }
}
