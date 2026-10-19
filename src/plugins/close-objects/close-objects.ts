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
import { IBottomIconConfig, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
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
      elementName: 'conjunction-nearby-icon',
      label: t7e('plugins.CloseObjectsPlugin.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: scatterPlotPng,
      menuMode: [MenuMode.CONJUNCTIONS, MenuMode.ALL],
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
      tips: [t7e('plugins.CloseObjectsPlugin.help.tip1'), t7e('plugins.CloseObjectsPlugin.help.tip2')],
    };
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  protected buildSideMenuHtml_(): string {
    const innerHtml = html`
      <section class="kt-section">
        <div class="kt-section-label">${t7e('plugins.CloseObjectsPlugin.sections.search' as Parameters<typeof t7e>[0])}</div>
        <button id="co-find-btn" type="button" class="kt-action waves-effect">
          <span class="kt-action-label">${t7e('plugins.CloseObjectsPlugin.findBtn' as Parameters<typeof t7e>[0])}</span>
        </button>
      </section>
    `;

    // Pro adds getSecondaryMenuConfig() - generateSideMenuHtml_() auto-wraps with title bar
    if ('getSecondaryMenuConfig' in this) {
      return innerHtml;
    }

    // OSS: must include full wrapper since addHtml() inserts as-is; the pipeline
    // injects the title bar (title from the locale `title` key).
    return html`
      <div id="close-objects-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div class="side-menu">
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

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
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

  /** Offset past the simulation time at which a candidate pair must still be within the radius (30 min). */
  protected static readonly VERIFY_OFFSET_MS = 1000 * 60 * 30;

  /** Straight-line (3D) distance in km between two TEME positions. */
  static distanceKm(a: TemeVec3, b: TemeVec3): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  protected static getValidSats_(): Satellite[] {
    const catalogManager = ServiceLocator.getCatalogManager();
    // Positions come from the cruncher at simulation time; a back-filled position must use the same clock.
    const simTime = ServiceLocator.getTimeManager().simulationTimeObj;
    const satList = <Satellite[]>[];

    for (let i = 0; i < catalogManager.orbitalSats; i++) {
      const sat = catalogManager.getSat(i);

      if (!sat) {
        continue;
      }

      if (typeof sat.position === 'undefined') {
        sat.position = <TemeVec3>SatMath.getEci(sat, simTime).position || { x: <Kilometers>0, y: <Kilometers>0, z: <Kilometers>0 };
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

  /**
   * Pairs whose current positions are within `searchRadius` km (true 3D distance). The x-sorted
   * sweep with a bounding cube only narrows the candidates: the cube's corners reach sqrt(3) times
   * the radius, so every candidate is then checked against the sphere.
   */
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
        if (
          pos2.x < posXmax &&
          pos2.x > posXmin &&
          pos2.y < posYmax &&
          pos2.y > posYmin &&
          pos2.z < posZmax &&
          pos2.z > posZmin &&
          CloseObjectsPlugin.distanceKm(pos1, pos2) <= searchRadius
        ) {
          csoList.push({ sat1, sat2 });
        }
      }
    }

    return csoList;
  }

  /**
   * Keep the candidate pairs that are still within `searchRadius` km (3D) 30 minutes after the
   * simulation time, and return their NORAD numbers. Pairs that cannot be re-propagated are dropped.
   */
  protected static getActualCSOs_(csoListUnique: { sat1: Satellite; sat2: Satellite }[], searchRadius: number): string[] {
    const csoStrArr = [] as string[];
    // Phase-1 positions are at simulation time, so the verification epoch uses the simulation clock too.
    const verifyTime = ServiceLocator.getTimeManager().getOffsetTimeObj(CloseObjectsPlugin.VERIFY_OFFSET_MS);

    for (const posCso of csoListUnique) {
      const pos1 = CloseObjectsPlugin.positionAt_(posCso.sat1, verifyTime);
      const pos2 = CloseObjectsPlugin.positionAt_(posCso.sat2, verifyTime);

      if (!pos1 || !pos2) {
        continue;
      }

      if (CloseObjectsPlugin.distanceKm(pos1, pos2) <= searchRadius) {
        csoStrArr.push(posCso.sat1.sccNum);
        csoStrArr.push(posCso.sat2.sccNum);
      }
    }

    return csoStrArr;
  }

  /** TEME position of `sat` at `time`, or null when propagation fails (no position or the origin sentinel). */
  private static positionAt_(sat: Satellite, time: Date): TemeVec3 | null {
    const pos = SatMath.getEci(sat, time).position;

    if (!pos || typeof pos === 'boolean' || (pos.x === 0 && pos.y === 0 && pos.z === 0)) {
      return null;
    }

    return pos as TemeVec3;
  }
}
