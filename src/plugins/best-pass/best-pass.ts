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
import { IBottomIconConfig, IHelpConfig, IKeyboardShortcut, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { Kilometers } from '@ootk/src/main';
import eventNotePng from '@public/img/icons/event-note.png';
import { BestPassDeps, BestPassOptions, DEFAULT_MAX_RESULTS, findPassesForSat, normalizePassRows } from './best-pass-calculator';
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
      // Sit in the Sensors section alongside the Look Angles tools (the related
      // sensor/pass-analysis family), while staying discoverable under Events too.
      menuMode: [MenuMode.SENSORS, MenuMode.EVENTS, MenuMode.ALL],
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
      tips: [t7e('plugins.BestPassPlugin.help.tip1'), t7e('plugins.BestPassPlugin.help.tip2'), t7e('plugins.BestPassPlugin.help.tip3')],
      shortcuts: [{ keys: ['b'], description: t7e('plugins.BestPassPlugin.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'b',
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
      <div id="best-pass-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div class="side-menu">
          ${this.buildFormHtml_()}
        </div>
      </div>
    `;
  }

  protected buildFormHtml_(): string {
    return html`
      <form id="best-pass-menu-form">
        <section class="kt-section">
          <div class="kt-section-label">${t7e('plugins.BestPassPlugin.sections.search' as Parameters<typeof t7e>[0])}</div>
          <div class="row">
            <div class="input-field col s12">
              <input value="25544,00005" id="bp-sats" type="text" />
              <label for="bp-sats" class="active">${t7e('plugins.BestPassPlugin.satelliteNumbersLabel' as Parameters<typeof t7e>[0])}</label>
            </div>
          </div>
        </section>
        <button id="bp-submit" class="kt-action waves-effect" type="submit" name="action">
          <span class="kt-action-label">${t7e('plugins.BestPassPlugin.generateButton' as Parameters<typeof t7e>[0])}</span>
        </button>
      </form>
    `;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));

    // Sensor-gated enable/disable only applies when a sensor is actually required.
    // Subclasses that pick sensors in-menu (e.g. via chips) set isRequireSensorSelected
    // = false so the icon stays usable without a globally selected sensor.
    if (this.isRequireSensorSelected) {
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

      return;
    }

    // Defer the heavy synchronous search behind the loading overlay so the UI can paint.
    showLoading(() => {
      const passes = this.findBestPasses_(sats, sensorManagerInstance.getSensor()!);

      // Export is the primary action; run it first, then surface the advisory cap warning.
      this.exportPasses_(passes);
      this.toastIfTruncated_();
    });
  }

  /** Exports the passes. Base saves an XLSX; the Pro plugin renders a table instead. */
  protected exportPasses_(passes: lookanglesRow[]): void {
    saveXlsx(passes, 'bestSatTimes').catch((e) => errorManagerInstance.debug(`Best pass export failed: ${e}`));
  }

  /** Warns the user when a search hit the per-satellite result cap. */
  protected toastIfTruncated_(): void {
    if (!this.lastResultTruncated_) {
      return;
    }

    ServiceLocator.getUiManager().toast(
      t7e('plugins.BestPassPlugin.errorMsgs.ResultsTruncated' as Parameters<typeof t7e>[0]).replace('{limit}', DEFAULT_MAX_RESULTS.toString()),
      ToastMsgType.caution
    );
  }

  protected static updateSensorButton_(sensor: DetailedSensor | string): void {
    const submitButtonDom = <HTMLButtonElement>getEl('bp-submit');

    if (!submitButtonDom) {
      return;
    }

    if (!sensor) {
      submitButtonDom.disabled = true;
      BestPassPlugin.setActionLabel_('bp-submit', t7e('plugins.BestPassPlugin.selectSensorFirst' as Parameters<typeof t7e>[0]));
    } else {
      submitButtonDom.disabled = false;
      BestPassPlugin.setActionLabel_('bp-submit', t7e('plugins.BestPassPlugin.generateButton' as Parameters<typeof t7e>[0]));
    }
  }

  /**
   * Updates a v13 `.kt-action` button's label without clobbering the CSS chevron.
   * Sets the text on the inner `.kt-action-label` span when present, falling back
   * to the button text for any legacy markup.
   */
  protected static setActionLabel_(buttonId: string, text: string): void {
    const btn = getEl(buttonId);

    if (!btn) {
      return;
    }

    const label = btn.querySelector('.kt-action-label');

    if (label) {
      label.textContent = text;
    } else {
      btn.textContent = text;
    }
  }

  // =========================================================================
  // Best pass calculation
  // =========================================================================

  /** True when the most recent search hit the per-satellite result cap for any satellite. */
  protected lastResultTruncated_ = false;

  protected findBestPasses_(sats: string, sensor: DetailedSensor | null): lookanglesRow[] {
    const sensors = this.getSearchSensors_(sensor).filter((s) => s && typeof s.minAz !== 'undefined');

    if (sensors.length === 0) {
      ServiceLocator.getUiManager().toast(t7e('plugins.BestPassPlugin.errorMsgs.SensorFormatError' as Parameters<typeof t7e>[0]), ToastMsgType.critical);

      return [];
    }

    const satArray = sats.replace(/ /gu, ',').split(',');
    const catalogManager = ServiceLocator.getCatalogManager();
    const deps = this.buildBestPassDeps_();
    const options: BestPassOptions = { lengthDays: this.looksLength_, intervalSec: this.looksInterval_ };
    const passes: lookanglesRow[] = [];
    let truncated = false;

    for (const satId of satArray) {
      try {
        const trimmed = satId?.trim();

        if (!trimmed) {
          continue;
        }
        // sccNum2Sat handles every sccNum form directly; parseInt would turn a
        // typed alpha-5 ("T0001") into NaN and silently skip it.
        const sat = catalogManager.sccNum2Sat(trimmed);

        if (!sat) {
          continue;
        }
        const satrec = catalogManager.calcSatrec(sat);

        for (const searchSensor of sensors) {
          // Use the canonical sccNum on the Satellite, not satrec.satnum: for alpha-5
          // sats satnum is the 6-digit numeric equivalent, not the "T0001" the user typed.
          const result = findPassesForSat(sat.sccNum, satrec, searchSensor, options, deps, BestPassPlugin.sensorDisplayName_(searchSensor));

          passes.push(...result.passes);
          truncated = truncated || result.truncated;
        }
      } catch (e) {
        errorManagerInstance.debug(`Error finding best passes for ${satId}: ${e}`);
      }
    }

    this.lastResultTruncated_ = truncated;
    passes.sort((a, b) => (a.START_DTG as number) - (b.START_DTG as number));
    normalizePassRows(passes);

    return passes;
  }

  /**
   * Sensors to evaluate each satellite against. The base plugin searches only the
   * passed (primary) sensor; the Pro plugin overrides this to source sensors from
   * an in-menu chip selector.
   */
  protected getSearchSensors_(sensor: DetailedSensor | null): DetailedSensor[] {
    return sensor ? [sensor] : [];
  }

  /** Assembles the application-state dependencies the pure calculator needs. */
  protected buildBestPassDeps_(): BestPassDeps {
    const timeManager = ServiceLocator.getTimeManager();
    const scene = ServiceLocator.getScene();

    return {
      baseTimeMs: timeManager.simulationTimeObj.getTime(),
      getRae: (date, satrec, sensor) => SatMath.getRae(date, satrec, sensor),
      checkIsInView: (sensor, rae) => SatMath.checkIsInView(sensor, rae as Parameters<typeof SatMath.checkIsInView>[1]),
      // The sun moves negligibly over a pass; a single snapshot of the current
      // scene sun position is reused for the whole search, matching legacy behavior.
      sunEciKm: () => ({
        x: scene.sun.position[0] as Kilometers,
        y: scene.sun.position[1] as Kilometers,
        z: scene.sun.position[2] as Kilometers,
      }),
    };
  }

  /** Human-readable sensor name for the SENSOR column / CSV. */
  protected static sensorDisplayName_(sensor: DetailedSensor): string | null {
    return sensor.uiName ?? sensor.shortName ?? sensor.name ?? null;
  }
}
