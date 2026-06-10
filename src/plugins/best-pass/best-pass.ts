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

import { SatMath } from '@app/app/analysis/sat-math';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { lookanglesRow, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { t7e } from '@app/locales/keys';
import { eci2rae, Kilometers, MINUTES_PER_DAY, RaeVec3, Satellite, SatelliteRecord, TAU } from '@ootk/src/main';
import eventNotePng from '@public/img/icons/event-note.png';
import './best-pass.css';

export class BestPassPlugin extends KeepTrackPlugin {
  readonly id = 'BestPassPlugin';
  dependencies_ = [];
  isRequireSensorSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  protected looksInterval_ = 5;
  protected looksLength_ = 7;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'best-pass-icon',
      label: t7e('plugins.BestPassPlugin.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: eventNotePng,
      menuMode: [MenuMode.EVENTS, MenuMode.ALL],
      isDisabledOnLoad: true,
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
      elementName: 'best-pass-menu',
      title: t7e('plugins.BestPassPlugin.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.BestPassPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.BestPassPlugin.help.overview'),
          image: {
            src: 'img/help/best-pass/best-pass-menu.png',
            alt: t7e('plugins.BestPassPlugin.help.imgAlt'),
            caption: t7e('plugins.BestPassPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.BestPassPlugin.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.BestPassPlugin.help.tip1'),
        t7e('plugins.BestPassPlugin.help.tip2'),
        t7e('plugins.BestPassPlugin.help.tip3'),
      ],
      shortcuts: [{ keys: ['B'], description: t7e('plugins.BestPassPlugin.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'B',
        callback: () => {
          this.bottomMenuClicked();
        },
      },
    ];
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  protected buildSideMenuHtml_(): string {
    return html`
      <div id="best-pass-menu" class="side-menu-parent start-hidden">
        <div class="side-menu">
          ${this.buildFormHtml_()}
        </div>
      </div>
    `;
  }

  protected buildFormHtml_(): string {
    return html`
      <form id="best-pass-menu-form">
        <div class="row">
          <div class="input-field col s12">
            <input value="25544,00005" id="bp-sats" type="text" />
            <label for="bp-sats" class="active">${t7e('plugins.BestPassPlugin.satelliteNumbersLabel' as Parameters<typeof t7e>[0])}</label>
          </div>
        </div>
        <div class="row">
          <center>
            <button id="bp-submit" class="btn btn-ui waves-effect waves-light" type="submit"
              name="action">${t7e('plugins.BestPassPlugin.generateButton' as Parameters<typeof t7e>[0])} &#9658;</button>
          </center>
        </div>
      </form>
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

    EventBus.getInstance().on(EventBusEvent.setSensor, (sensor) => {
      if (!sensor) {
        return;
      }
      this.setBottomIconToEnabled();
      BestPassPlugin.updateSensorButton_(sensor);
    });

    EventBus.getInstance().on(EventBusEvent.resetSensor, () => {
      if (this.isMenuButtonActive) {
        this.closeSideMenu();
      }
      this.setBottomIconToDisabled();
    });
  }

  protected uiManagerFinal_() {
    getEl('best-pass-menu-form')?.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      this.onSubmit_();
    });
  }

  // =========================================================================
  // Submit handler
  // =========================================================================

  protected onSubmit_() {
    const satsEl = getEl('bp-sats') as HTMLInputElement | null;

    if (!satsEl) {
      return;
    }

    const sats = satsEl.value;
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (!sensorManagerInstance.isSensorSelected()) {
      ServiceLocator.getUiManager().toast(t7e('plugins.BestPassPlugin.errorMsgs.SensorRequired' as Parameters<typeof t7e>[0]), ToastMsgType.critical);
    } else {
      const passes = this.findBestPasses_(sats, sensorManagerInstance.getSensor()!);

      saveXlsx(passes, 'bestSatTimes');
    }
  }

  protected static updateSensorButton_(sensor: DetailedSensor | string): void {
    const submitButtonDom = <HTMLButtonElement>getEl('bp-submit');

    if (!submitButtonDom) {
      return;
    }

    if (!sensor) {
      submitButtonDom.disabled = true;
      submitButtonDom.textContent = t7e('plugins.BestPassPlugin.selectSensorFirst' as Parameters<typeof t7e>[0]);
    } else {
      submitButtonDom.disabled = false;
      submitButtonDom.textContent = `${t7e('plugins.BestPassPlugin.generateButton' as Parameters<typeof t7e>[0])} \u25B6`;
    }
  }

  // =========================================================================
  // Best pass calculation
  // =========================================================================

  protected findBestPasses_(sats: string, sensor: DetailedSensor): lookanglesRow[] {
    sats = sats.replace(/ /gu, ',');
    const satArray = sats.split(',');
    const passes: lookanglesRow[] = [];
    const catalogManager = ServiceLocator.getCatalogManager();

    for (const satId of satArray) {
      try {
        if (typeof satId === 'undefined' || satId === null || satId === '' || satId === ' ') {
          continue;
        }
        // sccNum2Sat handles every sccNum form directly; parseInt would turn a
        // typed alpha-5 ("T0001") into NaN and silently skip it.
        const sat = catalogManager.sccNum2Sat(satId.trim());

        if (!sat) {
          continue;
        }
        const satPasses = this.findBestPass_(sat, [sensor]);

        for (const pass of satPasses) {
          passes.push(pass);
        }
      } catch (e) {
        errorManagerInstance.debug(`Error finding best passes for ${satId}: ${e}`);
      }
    }
    passes.sort((a, b) => (b.START_DTG as number) - (a.START_DTG as number));
    passes.reverse();

    for (const pass of passes) {
      pass.START_DTG = (<Date>pass.START_DATE).toISOString();
      pass.START_DATE = (<Date>pass.START_DATE).toISOString().split('T')[0];
      pass.START_TIME = (<Date>pass.START_TIME).toISOString().split('T')[1].split('.')[0];
      pass.STOP_DATE = (<Date>pass.STOP_DATE).toISOString().split('T')[0];
      pass.STOP_TIME = (<Date>pass.STOP_TIME).toISOString().split('T')[1].split('.')[0];
    }

    return passes;
  }

  protected findBestPass_(sat: Satellite, sensors: DetailedSensor[]): lookanglesRow[] {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (sensors.length <= 0 || typeof sensors[0]?.minAz === 'undefined') {
      ServiceLocator.getUiManager().toast(t7e('plugins.BestPassPlugin.errorMsgs.SensorFormatError' as Parameters<typeof t7e>[0]), ToastMsgType.critical);

      return [];
    }

    const sensor = sensors[0];

    let offset = 0;

    const catalogManager = ServiceLocator.getCatalogManager();
    const scene = ServiceLocator.getScene();
    const satrec = catalogManager.calcSatrec(sat);
    const lookanglesTable = [] as lookanglesRow[];

    const looksInterval = this.looksInterval_;
    const looksLength = this.looksLength_;

    const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU);

    let score = 0;
    let sAz = <string | null>null;
    let sEl = <string | null>null;
    let srng = <string | null>null;
    let sTime = <Date | null>null;
    let passMinrng = sensor.maxRng;
    let passMaxEl = 0;
    let start3 = false;
    let stop3 = false;

    const propagateBestPass_ = (now: Date, satrecIn: SatelliteRecord): lookanglesRow => {
      const aer = SatMath.getRae(now, satrecIn, sensor) as unknown as RaeVec3;
      const isInFOV = SatMath.checkIsInView(sensor, aer);

      if (isInFOV) {
        const now1 = timeManagerInstance.getOffsetTimeObj(offset - looksInterval * 1000);
        let aer1 = SatMath.getRae(now1, satrecIn, sensor) as unknown as RaeVec3;

        let isInFOV1 = SatMath.checkIsInView(sensor, aer1);

        if (!isInFOV1) {
          if (aer.el <= 3.5) {
            start3 = true;
          }

          sTime = now;
          sAz = aer.az.toFixed(0);
          sEl = aer.el.toFixed(1);
          srng = aer.rng.toFixed(0);
        } else {
          const _now1 = timeManagerInstance.getOffsetTimeObj(offset + looksInterval * 1000);

          aer1 = SatMath.getRae(_now1, satrecIn, sensor) as unknown as RaeVec3;

          isInFOV1 = SatMath.checkIsInView(sensor, aer1);
          if (!isInFOV1) {
            stop3 = aer.el <= 3.5;

            if (sTime === null) {
              return BestPassPlugin.emptyRow_();
            }

            score = Math.min((((now.getTime() - sTime.getTime()) / 1000 / 60) * 10) / 8, 10);
            let elScore = Math.min((passMaxEl / 50) * 10, 10);

            elScore *= start3 && stop3 ? 2 : 1;
            score += elScore;
            score += Math.min((10 * 750) / passMinrng, 10);

            let tic = 0;

            tic = (now.getTime() - sTime.getTime()) / 1000 || 0;

            const sunRae = eci2rae(now, {
              x: scene.sun.position[0] as Kilometers,
              y: scene.sun.position[1] as Kilometers,
              z: scene.sun.position[2] as Kilometers,
            }, sensor);

            return {
              START_DTG: sTime.getTime(),
              // Use the canonical sccNum on the Satellite, not satrec.satnum.
              // satrec.satnum is the parsed numeric form — for alpha-5 sats it
              // would be the 6-digit equivalent ("270001"), not the alpha-5
              // string ("T0001") the user expects to see.
              SATELLITE_ID: sat.sccNum,
              PASS_SCORE: score.toFixed(1),
              START_DATE: sTime,
              START_TIME: sTime,
              START_AZIMUTH: sAz!,
              START_ELEVATION: sEl!,
              START_RANGE: srng!,
              STOP_DATE: now,
              STOP_TIME: now,
              STOP_AZIMTUH: aer.az.toFixed(0),
              STOP_ELEVATION: aer.el.toFixed(1),
              STOP_RANGE: aer.rng.toFixed(0),
              TIME_IN_COVERAGE_SECONDS: tic,
              MINIMUM_RANGE: passMinrng.toFixed(0),
              MAXIMUM_ELEVATION: passMaxEl.toFixed(1),
              SENSOR_TO_SUN_AZIMUTH: sunRae.az.toFixed(1),
              SENSOR_TO_SUN_ELEVATION: sunRae.el.toFixed(1),
            };
          }
        }
        if (passMaxEl < aer.el) {
          passMaxEl = aer.el;
        }
        if (passMinrng > aer.rng) {
          passMinrng = aer.rng;
        }
      }

      return BestPassPlugin.emptyRow_();
    };

    for (let i = 0; i < looksLength * 24 * 60 * 60; i += looksInterval) {
      offset = i * 1000;
      const now = timeManagerInstance.getOffsetTimeObj(offset);

      if (lookanglesTable.length <= 5000) {
        const _lookanglesRow = propagateBestPass_(now, satrec);

        if (_lookanglesRow.PASS_SCORE !== null) {
          lookanglesTable.push(_lookanglesRow);

          score = 0;
          sAz = null;
          sEl = null;
          srng = null;
          sTime = null;
          passMinrng = sensor.maxRng;
          passMaxEl = 0;
          start3 = false;
          stop3 = false;
          i += orbitalPeriod * 60 * 0.75; // NOSONAR
        }
      }
    }

    return lookanglesTable;
  }

  protected static emptyRow_(): lookanglesRow {
    return {
      START_DTG: null,
      SATELLITE_ID: null,
      PASS_SCORE: null,
      START_DATE: null,
      START_TIME: null,
      START_AZIMUTH: null,
      START_ELEVATION: null,
      START_RANGE: null,
      STOP_DATE: null,
      STOP_TIME: null,
      STOP_AZIMTUH: null,
      STOP_ELEVATION: null,
      STOP_RANGE: null,
      TIME_IN_COVERAGE_SECONDS: null,
      MINIMUM_RANGE: null,
      MAXIMUM_ELEVATION: null,
      SENSOR_TO_SUN_AZIMUTH: null,
      SENSOR_TO_SUN_ELEVATION: null,
    };
  }
}
