/* eslint-disable prefer-const */
/* eslint-disable complexity */

import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { countryCodeList, countryNameList } from '@app/app/data/catalogs/countries';
import { CameraType } from '@app/engine/camera/camera-type';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IDragOptions, IHelpConfig, IKeyboardShortcut, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects, refreshMaterialSelect, syncMaterialSelect } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { getUnique } from '@app/engine/utils/get-unique';
import { hideLoading, showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { BaseObject, Degrees, eci2rae, Hours, Kilometers, Minutes, Satellite } from '@ootk/src/main';
import findSatPng from '@public/img/icons/database-search.png';
import './find-sat.css';
import {
  filterByArgOfPerigee,
  filterByInclination,
  filterByLookAngle,
  filterByObjType,
  filterByPeriod,
  filterByRcs,
  filterByRightAscension,
  filterByTleAge,
  LookAngleResolver,
} from './find-sat-filters';

export interface SearchSatParams {
  argPe: Degrees;
  argPeMarg: Degrees;
  az: Degrees;
  azMarg: Degrees;
  bus: string;
  countryCode: string;
  el: Degrees;
  elMarg: Degrees;
  inc: Degrees;
  incMarg: Degrees;
  /** 0 = all types; a single type or a list of types to match */
  objType: number | number[];
  payload: string;
  period: Minutes;
  periodMarg: Minutes;
  tleAge: Hours;
  tleAgeMarg: Hours;
  raan: Degrees;
  raanMarg: Degrees;
  rcs: number;
  rcsMarg: number;
  rng: Kilometers;
  rngMarg: Kilometers;
  shape: string;
  source: string;
}

/** Flags describing which search criteria were actually supplied by the user. */
interface SearchValidityFlags {
  isValidAz: boolean;
  isValidEl: boolean;
  isValidRange: boolean;
  isValidInc: boolean;
  isValidRaan: boolean;
  isValidArgPe: boolean;
  isValidPeriod: boolean;
  isValidTleAge: boolean;
  isValidRcs: boolean;
  isSpecificCountry: boolean;
  isSpecificBus: boolean;
  isSpecificShape: boolean;
  isSpecificSource: boolean;
  isSpecificPayload: boolean;
}

/** Resolved (defaulted) margins applied to each numeric search filter. */
interface SearchMargins {
  azMarg: Degrees;
  elMarg: Degrees;
  rngMarg: Kilometers;
  incMarg: Degrees;
  periodMarg: Minutes;
  tleAgeMarg: Hours;
  rcsMarg: number;
  raanMarg: Degrees;
  argPeMarg: Degrees;
}

export class FindSatPlugin extends KeepTrackPlugin {
  readonly id = 'FindSatPlugin';
  protected lastResults_ = <Satellite[]>[];
  protected hasSearchBeenRun_ = false;

  /** Filter type ids that can only be evaluated relative to a selected sensor. */
  protected static readonly SENSOR_REQUIRED_FILTER_IDS_ = ['az', 'el', 'rng'];

  /** DOM id of the element that displays the result count (Pro overrides). */
  protected resultCountElId_ = 'fbl-result-count';

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'find-satellite-bottom-icon',
      label: t7e('plugins.FindSatPlugin.bottomIconLabel'),
      image: findSatPng,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'findByLooks-menu',
      title: t7e('plugins.FindSatPlugin.title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  protected getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 500,
      maxWidth: 700,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.FindSatPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.FindSatPlugin.help.overview'),
          image: {
            src: 'img/help/find-sat/find-sat-menu.png',
            alt: t7e('plugins.FindSatPlugin.help.imgAlt'),
            caption: t7e('plugins.FindSatPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.FindSatPlugin.help.filtersHeading'),
          content: t7e('plugins.FindSatPlugin.help.filters'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.FindSatPlugin.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.FindSatPlugin.help.tip1'), t7e('plugins.FindSatPlugin.help.tip2'), t7e('plugins.FindSatPlugin.help.tip3'), t7e('plugins.FindSatPlugin.help.tip4')],
      shortcuts: [{ keys: ['Ctrl', 'F'], description: t7e('plugins.FindSatPlugin.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'F',
        ctrl: true,
        callback: () => {
          if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
            return;
          }
          this.bottomMenuClicked();
        },
      },
    ];
  }

  onDownload(): void {
    if (!this.hasSearchBeenRun_) {
      errorManagerInstance.warn(t7e('plugins.FindSatPlugin.errorMsgs.TryFindingFirst'));

      return;
    }
    CatalogExporter.exportTle2Csv(this.lastResults_);
  }

  protected buildSideMenuHtml_(): string {
    const l = (key: string) => t7e(`plugins.FindSatPlugin.labels.${key}` as Parameters<typeof t7e>[0]);

    return html`
      <form id="findByLooks-menu-form">
        ${this.classificationBody_()}
        ${this.lookAnglesBody_()}
        ${this.orbitalElementsBody_()}
        ${this.physicalBody_()}
        ${FindSatPlugin.actionButton_('findByLooks-submit', l('findSatellites'), { submit: true })}
        ${FindSatPlugin.actionButton_('findByLooks-export', l('exportData'))}
      </form>
      <div id="fbl-result-count" class="fbl-result-count"></div>
      <div class="row center-align" style="margin-top:12px;">
        <span id="fbl-error" class="menu-selectable"></span>
      </div>
    `;
  }

  /** Wrap a section's controls in a titled v13 card. */
  protected wrapSection_(title: string, body: string): string {
    return html`
      <section class="kt-section">
        <div class="kt-section-label">${title}</div>
        ${body}
      </section>
    `;
  }

  /** A full-width v13 action row (label + trailing chevron via CSS). */
  protected static actionButton_(id: string, label: string, opts: { submit?: boolean; disabled?: boolean } = {}): string {
    const type = opts.submit ? 'submit' : 'button';
    const disabled = opts.disabled ? ' disabled' : '';

    return html`
      <button id="${id}" type="${type}" class="kt-action waves-effect"${disabled}>
        <span class="kt-action-label">${label}</span>
      </button>
    `;
  }

  /** Object classification filters (type, country, bus, payload, shape, source). */
  protected classificationBody_(): string {
    const l = (key: string) => t7e(`plugins.FindSatPlugin.labels.${key}` as Parameters<typeof t7e>[0]);

    return this.wrapSection_(
      l('sectionClassification'),
      html`
      <div class="kt-field-row">
        <div class="input-field col s12">
          <select id="fbl-type" multiple>
            <option value=0 selected>${l('all')}</option>
            <option value=1>${l('typePayload')}</option>
            <option value=2>${l('typeRocketBody')}</option>
            <option value=3>${l('typeDebris')}</option>
          </select>
          <label for="fbl-type">${l('objectType')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <select id="fbl-country" multiple>
            <option value='All' selected>${l('all')}</option>
          </select>
          <label for="fbl-country">${l('country')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input placeholder="${l('busFilterPlaceholder')}" id="fbl-bus-filter" type="text">
          <label for="fbl-bus-filter" class="active">${l('satelliteBusFilter')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <select value=0 id="fbl-bus" type="text">
            <option value='All'>${l('all')}</option>
          </select>
          <label for="fbl-bus">${l('satelliteBus')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input placeholder="${l('payloadFilterPlaceholder')}" id="fbl-payload-filter" type="text">
          <label for="fbl-payload-filter" class="active">${l('payloadFilter')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <select value=0 id="fbl-payload" type="text">
            <option value='All'>${l('all')}</option>
          </select>
          <label for="fbl-payload">${l('payload')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <select value=0 id="fbl-shape" type="text">
            <option value='All'>${l('all')}</option>
          </select>
          <label for="fbl-shape">${l('shape')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <select value=0 id="fbl-source" type="text">
            <option value='All'>${l('all')}</option>
          </select>
          <label for="fbl-source">${l('source')}</label>
        </div>
      </div>
    `
    );
  }

  /** Sensor-relative look-angle filters (azimuth, elevation, range). */
  protected lookAnglesBody_(): string {
    const l = (key: string) => t7e(`plugins.FindSatPlugin.labels.${key}` as Parameters<typeof t7e>[0]);

    return this.wrapSection_(
      l('sectionLookAngles'),
      html`
      <div class="kt-note">${l('sensorNote')}</div>
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="xxx.x" id="fbl-azimuth" type="text">
          <label for="fbl-azimuth" class="active">${l('azimuth')}</label>
        </div>
        <div class="input-field col s6">
          <input placeholder="5" id="fbl-azimuth-margin" type="text">
          <label for="fbl-azimuth-margin" class="active">${l('azimuthMargin')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="XX.X" id="fbl-elevation" type="text">
          <label for="fbl-elevation" class="active">${l('elevation')}</label>
        </div>
        <div class="input-field col s6">
          <input placeholder="5" id="fbl-elevation-margin" type="text">
          <label for="fbl-elevation-margin" class="active">${l('elevationMargin')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="xxxx.x" id="fbl-range" type="text">
          <label for="fbl-range" class="active">${l('range')}</label>
        </div>
        <div class="input-field col s6">
          <input placeholder="500" id="fbl-range-margin" type="text">
          <label for="fbl-range-margin" class="active">${l('rangeMargin')}</label>
        </div>
      </div>
    `
    );
  }

  /** Orbital-element filters (inclination, period, RAAN, argument of perigee). */
  protected orbitalElementsBody_(): string {
    const l = (key: string) => t7e(`plugins.FindSatPlugin.labels.${key}` as Parameters<typeof t7e>[0]);

    return this.wrapSection_(
      l('sectionOrbital'),
      html`
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="XX.X" id="fbl-inc" type="text">
          <label for="fbl-inc" class="active">${l('inclination')}</label>
        </div>
        <div class="input-field col s6">
          <input value="0.5" placeholder="0.5" id="fbl-inc-margin" type="text">
          <label for="fbl-inc-margin" class="active">${l('inclinationMargin')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="XX.X" id="fbl-period" type="text">
          <label for="fbl-period" class="active">${l('period')}</label>
        </div>
        <div class="input-field col s6">
          <input value="10" placeholder="10" id="fbl-period-margin" type="text">
          <label for="fbl-period-margin" class="active">${l('periodMargin')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="XX.X" id="fbl-raan" type="text">
          <label for="fbl-raan" class="active">${l('rightAscension')}</label>
        </div>
        <div class="input-field col s6">
          <input value="0.5" placeholder="0.5" id="fbl-raan-margin" type="text">
          <label for="fbl-raan-margin" class="active">${l('rightAscensionMargin')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="XX.X" id="fbl-argPe" type="text">
          <label for="fbl-argPe" class="active">${l('argOfPerigee')}</label>
        </div>
        <div class="input-field col s6">
          <input value="0.5" placeholder="0.5" id="fbl-argPe-margin" type="text">
          <label for="fbl-argPe-margin" class="active">${l('argOfPerigeeMargin')}</label>
        </div>
      </div>
    `
    );
  }

  /** Physical and data-quality filters (TLE age, RCS). */
  protected physicalBody_(): string {
    const l = (key: string) => t7e(`plugins.FindSatPlugin.labels.${key}` as Parameters<typeof t7e>[0]);

    return this.wrapSection_(
      l('sectionPhysical'),
      html`
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="XX.X" id="fbl-tleAge" type="text">
          <label for="fbl-tleAge" class="active">${l('tleAge')}</label>
        </div>
        <div class="input-field col s6">
          <input value="1" placeholder="1" id="fbl-tleAge-margin" type="text">
          <label for="fbl-tleAge-margin" class="active">${l('tleAgeMargin')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s6">
          <input placeholder="XX.X" id="fbl-rcs" type="text">
          <label for="fbl-rcs" class="active">${l('rcs')}</label>
        </div>
        <div class="input-field col s6">
          <input value="10" placeholder="10" id="fbl-rcs-margin" type="text">
          <label for="fbl-rcs-margin" class="active">${l('rcsMargin')}</label>
        </div>
      </div>
    `
    );
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  printLastResults() {
    errorManagerInstance.info(this.lastResults_.map((sat) => sat.name).join('\n'));
  }

  protected uiManagerFinal_() {
    const satData = ServiceLocator.getCatalogManager().objectCache;

    getEl('fbl-error')!.addEventListener('click', () => {
      getEl('fbl-error')!.style.display = 'none';
    });

    getEl('findByLooks-menu-form')!.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      showLoading(() => {
        this.findByLooksSubmit_().then(() => {
          hideLoading();
        });
      });
    });

    getUnique(satData.filter((obj: BaseObject) => (obj as Satellite)?.bus).map((obj) => (obj as Satellite).bus))
      // Sort using lower case
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .forEach((bus) => {
        getEl('fbl-bus')!.insertAdjacentHTML('beforeend', `<option value="${bus}">${bus}</option>`);
      });
    FindSatPlugin.addSelectFilter_('fbl-bus-filter', 'fbl-bus');

    countryNameList.forEach((countryName: string) => {
      getEl('fbl-country')!.insertAdjacentHTML('beforeend', `<option value="${countryCodeList[countryName]}">${countryName}</option>`);
    });

    FindSatPlugin.wireAllOptionExclusivity_('fbl-type', '0');
    FindSatPlugin.wireAllOptionExclusivity_('fbl-country', 'All');

    getUnique(satData.filter((obj: BaseObject) => (obj as Satellite)?.shape).map((obj) => (obj as Satellite).shape))
      // Sort using lower case
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .forEach((shape) => {
        getEl('fbl-shape')!.insertAdjacentHTML('beforeend', `<option value="${shape}">${shape}</option>`);
      });

    getUnique(satData.filter((obj: BaseObject) => (obj as Satellite)?.source).map((obj) => (obj as Satellite).source))
      // Sort using lower case
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .forEach((source) => {
        getEl('fbl-source')!.insertAdjacentHTML('beforeend', `<option value="${source}">${source}</option>`);
      });
    const payloadPartials = satData
      .filter((obj: BaseObject) => (obj as Satellite)?.payload)
      .map((obj) =>
        (obj as Satellite).payload
          .split(' ')[0]
          .split('-')[0]
          .replace(/[^a-zA-Z]/gu, '')
      )
      .filter((obj) => obj.length >= 3);

    getUnique(payloadPartials)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .forEach((payload) => {
        if (payload === '') {
          return;
        }
        if (payload.length > 3) {
          getEl('fbl-payload')!.insertAdjacentHTML('beforeend', `<option value="${payload}">${payload}</option>`);
        }
      });
    FindSatPlugin.addSelectFilter_('fbl-payload-filter', 'fbl-payload');

    // Export data
    getEl('findByLooks-export')?.addEventListener('click', () => {
      this.onDownload();
    });

    // Opt this menu into the v13+ card UI and style its Materialize selects.
    const menuRoot = getEl('findByLooks-menu', true);

    if (menuRoot) {
      menuRoot.classList.add('kt-ui-v13');
      initMaterialSelects(menuRoot);
    }
  }

  protected static addSelectFilter_(filterInputId: string, selectId: string): void {
    const filterInput = getEl(filterInputId) as HTMLInputElement | null;
    const select = getEl(selectId) as HTMLSelectElement | null;

    if (!filterInput || !select) {
      return;
    }

    const allOptions = Array.from(select.options).map((option) => ({
      text: option.text,
      value: option.value,
    }));

    filterInput.addEventListener('input', () => {
      const selectedValue = select.value;
      const filterText = filterInput.value.trim().toLowerCase();
      const filteredOptions = allOptions.filter((option) => option.value === 'All' || option.text.toLowerCase().includes(filterText));

      select.replaceChildren(...filteredOptions.map((option) => new Option(option.text, option.value)));
      select.value = filteredOptions.some((option) => option.value === selectedValue) ? selectedValue : 'All';
      FindSatPlugin.refreshMaterializeSelect_(select);
    });
  }

  protected static refreshMaterializeSelect_(select: HTMLSelectElement): void {
    refreshMaterialSelect(select);
  }

  /**
   * Keep the "All" option mutually exclusive with specific values in a
   * multi-select: picking a specific value drops "All", and picking "All"
   * clears the specific values.
   */
  private static wireAllOptionExclusivity_(selectId: string, allValue: string): void {
    const select = getEl(selectId, true) as HTMLSelectElement | null;

    if (!select) {
      return;
    }

    let prevHadAll = Array.from(select.selectedOptions).some((option) => option.value === allValue);

    select.addEventListener('change', () => {
      const selected = Array.from(select.selectedOptions);
      const hasAll = selected.some((option) => option.value === allValue);
      const hasOthers = selected.some((option) => option.value !== allValue);

      if (hasAll && hasOthers) {
        if (prevHadAll) {
          // A specific value was just picked - drop "All"
          Array.from(select.options).forEach((option) => {
            if (option.value === allValue) {
              option.selected = false;
            }
          });
        } else {
          // "All" was just picked - clear the specific values
          Array.from(select.options).forEach((option) => {
            option.selected = option.value === allValue;
          });
        }
        // Sync in place (a rebuild would close the open dropdown mid-selection)
        syncMaterialSelect(select);
      }
      prevHadAll = Array.from(select.selectedOptions).some((option) => option.value === allValue);
    });
  }

  /** Read the selected option values of a (multi-)select. */
  private static readMultiSelect_(id: string): string[] {
    const select = getEl(id, true) as HTMLSelectElement | null;

    if (!select?.selectedOptions) {
      return [];
    }

    return Array.from(select.selectedOptions).map((option) => option.value);
  }

  // eslint-disable-next-line require-await
  protected async findByLooksSubmit_(): Promise<void> {
    const az = parseFloat((<HTMLInputElement>getEl('fbl-azimuth')).value);
    const el = parseFloat((<HTMLInputElement>getEl('fbl-elevation')).value);
    const rng = parseFloat((<HTMLInputElement>getEl('fbl-range')).value);
    const inc = parseFloat((<HTMLInputElement>getEl('fbl-inc')).value);
    const period = parseFloat((<HTMLInputElement>getEl('fbl-period')).value);
    const tleAge = parseFloat((<HTMLInputElement>getEl('fbl-tleAge')).value);
    const rcs = parseFloat((<HTMLInputElement>getEl('fbl-rcs')).value);
    const azMarg = parseFloat((<HTMLInputElement>getEl('fbl-azimuth-margin')).value);
    const elMarg = parseFloat((<HTMLInputElement>getEl('fbl-elevation-margin')).value);
    const rngMarg = parseFloat((<HTMLInputElement>getEl('fbl-range-margin')).value);
    const incMarg = parseFloat((<HTMLInputElement>getEl('fbl-inc-margin')).value);
    const periodMarg = parseFloat((<HTMLInputElement>getEl('fbl-period-margin')).value);
    const tleAgeMarg = parseFloat((<HTMLInputElement>getEl('fbl-tleAge-margin')).value);
    const rcsMarg = parseFloat((<HTMLInputElement>getEl('fbl-rcs-margin')).value);
    const typeValues = FindSatPlugin.readMultiSelect_('fbl-type')
      .map(Number)
      .filter((n) => !isNaN(n));
    const objType = typeValues.length === 0 || typeValues.includes(0) ? 0 : typeValues;
    const raan = parseFloat((<HTMLInputElement>getEl('fbl-raan')).value);
    const raanMarg = parseFloat((<HTMLInputElement>getEl('fbl-raan-margin')).value);
    const argPe = parseFloat((<HTMLInputElement>getEl('fbl-argPe')).value);
    const argPeMarg = parseFloat((<HTMLInputElement>getEl('fbl-argPe-margin')).value);
    const countryValues = FindSatPlugin.readMultiSelect_('fbl-country');
    // Country option values are already pipe-joined code groups, so joining selections keeps the searchSats_ format
    const countryCode = countryValues.length === 0 || countryValues.includes('All') ? 'All' : countryValues.join('|');
    const bus = (<HTMLInputElement>getEl('fbl-bus')).value;
    const payload = (<HTMLInputElement>getEl('fbl-payload')).value;
    const shape = (<HTMLInputElement>getEl('fbl-shape')).value;
    const source = (<HTMLInputElement>getEl('fbl-source')).value;

    const searchParams = {
      az,
      el,
      rng,
      inc,
      azMarg,
      elMarg,
      rngMarg,
      incMarg,
      period,
      periodMarg,
      tleAge,
      tleAgeMarg,
      rcs,
      rcsMarg,
      objType,
      raan,
      raanMarg,
      argPe,
      argPeMarg,
      countryCode,
      bus,
      payload,
      shape,
      source,
    } as SearchSatParams;

    // Az/el/range are computed relative to the selected sensor, so a search that
    // uses them needs one. Block early with a clear message rather than letting
    // it throw deep in the look-angle math.
    const needsSensor = [az, el, rng].some((value) => !isNaN(value) && isFinite(value));

    this.runSearch_(searchParams, needsSensor);
  }

  /**
   * Runs a search after an optional sensor-selected check, resetting the global
   * search box first and surfacing empty/failed results to the user. Shared by
   * the OSS form submit and the Pro rule-builder / saved-search paths.
   * @returns false if the search was blocked (no sensor); true otherwise.
   */
  protected runSearch_(searchParams: SearchSatParams, needsSensor: boolean): boolean {
    const uiManagerInstance = ServiceLocator.getUiManager();

    if (needsSensor && !ServiceLocator.getSensorManager().isSensorSelected()) {
      uiManagerInstance.toast(t7e('errorMsgs.SelectSensorFirst'), ToastMsgType.critical);

      return false;
    }

    this.hasSearchBeenRun_ = true;

    const searchInput = getEl('search', true) as HTMLInputElement | null;

    if (searchInput) {
      searchInput.value = '';
    }

    try {
      this.lastResults_ = this.searchSats_(searchParams);
      this.onSearchComplete_(this.lastResults_);
    } catch (e) {
      this.handleSearchError_(e, uiManagerInstance);
    }

    return true;
  }

  /** Reports search results to the user (empty-result toast + result count). */
  protected onSearchComplete_(results: Satellite[]): void {
    if (results.length === 0) {
      ServiceLocator.getUiManager().toast(t7e('plugins.FindSatPlugin.errorMsgs.NoSatellitesFound'), ToastMsgType.critical);
    }
    this.updateResultCount_(results.length);
  }

  /** Updates the result-count readout in the side menu, when present. */
  protected updateResultCount_(count: number): void {
    const el = getEl(this.resultCountElId_, true);

    if (el) {
      el.textContent = t7e('plugins.FindSatPlugin.labels.resultCount' as Parameters<typeof t7e>[0]).replace('{count}', count.toString());
    }
  }

  /**
   * Surfaces search failures to the user instead of swallowing them.
   * Known validation errors get their specific message; anything else gets a
   * generic failure toast so errors (e.g. no sensor selected) are not silent.
   */
  protected handleSearchError_(e: unknown, uiManagerInstance: ReturnType<typeof ServiceLocator.getUiManager>): void {
    const message = e instanceof Error ? e.message : String(e);

    if (message === 'No Search Criteria Entered') {
      uiManagerInstance.toast(t7e('plugins.FindSatPlugin.errorMsgs.NoSearchCriteriaEntered'), ToastMsgType.critical);
    } else {
      uiManagerInstance.toast(t7e('plugins.FindSatPlugin.errorMsgs.SearchFailed' as Parameters<typeof t7e>[0]).replace('{error}', message), ToastMsgType.critical);
      errorManagerInstance.debug(`FindSatPlugin search failed: ${message}`);
    }
  }

  protected static checkInview_(posAll: Satellite[]) {
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    return posAll.filter((pos) => dotsManagerInstance.inViewData[pos.id] === 1);
  }

  /**
   * Builds a resolver that returns the current look angle for a satellite,
   * relative to the selected sensor and simulation time. Used by the look-angle
   * filters so the predicate logic stays pure and testable.
   */
  protected static buildLookAngleResolver_(): LookAngleResolver {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const timeObj = ServiceLocator.getTimeManager().simulationTimeObj;
    const sensor = ServiceLocator.getSensorManager().currentSensors[0];

    return (sat: Satellite) => {
      const positioned = catalogManagerInstance.getSat(sat.id, GetSatType.POSITION_ONLY);

      if (!positioned) {
        return null;
      }

      return eci2rae(timeObj, positioned.position, sensor);
    };
  }

  protected static limitPossibles_(possibles: Satellite[], limit: number): Satellite[] {
    const uiManagerInstance = ServiceLocator.getUiManager();

    if (possibles.length >= limit) {
      const msg = t7e('plugins.FindSatPlugin.errorMsgs.TooManyResults').replace('{limit}', limit.toString());

      uiManagerInstance.toast(msg, ToastMsgType.serious);
    }
    possibles = possibles.slice(0, limit);

    return possibles;
  }

  /** True when a numeric parameter was actually supplied (not NaN / Infinity). */
  private static isNumericCriteria_(value: number): boolean {
    return !isNaN(value) && isFinite(value);
  }

  /** Returns the supplied margin when valid, otherwise the provided fallback. */
  private static marginOrDefault_<T extends number>(margin: number, fallback: number): T {
    return (FindSatPlugin.isNumericCriteria_(margin) ? margin : fallback) as T;
  }

  /** Computes which search criteria were actually provided by the user. */
  private static buildValidityFlags_(params: SearchSatParams): SearchValidityFlags {
    const isNumeric = FindSatPlugin.isNumericCriteria_;

    return {
      isValidAz: isNumeric(params.az),
      isValidEl: isNumeric(params.el),
      isValidRange: isNumeric(params.rng),
      isValidInc: isNumeric(params.inc),
      isValidRaan: isNumeric(params.raan),
      isValidArgPe: isNumeric(params.argPe),
      isValidPeriod: isNumeric(params.period),
      isValidTleAge: isNumeric(params.tleAge),
      isValidRcs: isNumeric(params.rcs),
      isSpecificCountry: params.countryCode !== 'All',
      isSpecificBus: params.bus !== 'All',
      isSpecificShape: params.shape !== 'All',
      isSpecificSource: params.source !== 'All',
      isSpecificPayload: params.payload !== 'All',
    };
  }

  /** True when no search criteria of any kind were supplied. */
  private static hasNoCriteria_(flags: SearchValidityFlags): boolean {
    return (
      !flags.isValidEl &&
      !flags.isValidRange &&
      !flags.isValidAz &&
      !flags.isValidInc &&
      !flags.isValidPeriod &&
      !flags.isValidTleAge &&
      !flags.isValidRcs &&
      !flags.isValidArgPe &&
      !flags.isValidRaan &&
      !flags.isSpecificCountry &&
      !flags.isSpecificBus &&
      !flags.isSpecificShape &&
      !flags.isSpecificSource &&
      !flags.isSpecificPayload
    );
  }

  /** Applies the look-angle (az / el / range) filters relative to the selected sensor. */
  private static applyLookAngleFilters_(res: Satellite[], params: SearchSatParams, margins: SearchMargins, flags: SearchValidityFlags): Satellite[] {
    if (!flags.isValidAz && !flags.isValidEl && !flags.isValidRange) {
      return res;
    }

    const resolveLookAngle = FindSatPlugin.buildLookAngleResolver_();
    let filtered = res;

    if (flags.isValidAz) {
      filtered = filterByLookAngle(filtered, resolveLookAngle, 'az', params.az - margins.azMarg, params.az + margins.azMarg);
    }
    if (flags.isValidEl) {
      filtered = filterByLookAngle(filtered, resolveLookAngle, 'el', params.el - margins.elMarg, params.el + margins.elMarg);
    }
    if (flags.isValidRange) {
      filtered = filterByLookAngle(filtered, resolveLookAngle, 'rng', params.rng - margins.rngMarg, params.rng + margins.rngMarg);
    }

    return filtered;
  }

  /** Applies the orbital-element (inc / raan / argPe / period / tleAge / rcs) filters. */
  private static applyOrbitalFilters_(res: Satellite[], params: SearchSatParams, margins: SearchMargins, flags: SearchValidityFlags): Satellite[] {
    let filtered = res;

    if (flags.isValidInc) {
      filtered = filterByInclination(filtered, (params.inc - margins.incMarg) as Degrees, (params.inc + margins.incMarg) as Degrees);
    }
    if (flags.isValidRaan) {
      filtered = filterByRightAscension(filtered, (params.raan - margins.raanMarg) as Degrees, (params.raan + margins.raanMarg) as Degrees);
    }
    if (flags.isValidArgPe) {
      filtered = filterByArgOfPerigee(filtered, (params.argPe - margins.argPeMarg) as Degrees, (params.argPe + margins.argPeMarg) as Degrees);
    }
    if (flags.isValidPeriod) {
      filtered = filterByPeriod(filtered, (params.period - margins.periodMarg) as Minutes, (params.period + margins.periodMarg) as Minutes);
    }
    if (flags.isValidTleAge) {
      filtered = filterByTleAge(filtered, (params.tleAge - margins.tleAgeMarg) as Hours, (params.tleAge + margins.tleAgeMarg) as Hours, new Date());
    }
    if (flags.isValidRcs) {
      filtered = filterByRcs(filtered, params.rcs - margins.rcsMarg, params.rcs + margins.rcsMarg);
    }

    return filtered;
  }

  /** Applies the categorical (country / bus / shape / source / payload) filters. */
  private static applyCategoricalFilters_(res: Satellite[], params: SearchSatParams): Satellite[] {
    let filtered = res;

    if (params.countryCode !== 'All') {
      let country = params.countryCode.split('|');
      // Remove duplicates and undefined

      country = country.filter((item, index) => item && country.indexOf(item) === index);
      filtered = filtered.filter((obj: BaseObject) => country.includes((obj as Satellite).country));
    }
    if (params.bus !== 'All') {
      const buses = params.bus.split('|');

      filtered = filtered.filter((obj: BaseObject) => buses.includes((obj as Satellite).bus));
    }
    if (params.shape !== 'All') {
      const shapes = params.shape.split('|');

      filtered = filtered.filter((obj: BaseObject) => shapes.includes((obj as Satellite).shape));
    }
    if (params.source !== 'All') {
      filtered = filtered.filter((obj: BaseObject) => (obj as Satellite).source === params.source);
    }
    if (params.payload !== 'All') {
      const payloads = params.payload.split('|');

      filtered = filtered.filter((obj: BaseObject) => {
        const partial = (obj as Satellite).payload
          ?.split(' ')[0]
          ?.split('-')[0]
          ?.replace(/[^a-zA-Z]/gu, '');

        return typeof partial === 'string' && payloads.includes(partial);
      });
    }

    return filtered;
  }

  /** Pushes the matched SCC numbers into the global search box and runs the search. */
  private static commitSearchResults_(res: Satellite[]): void {
    let result = '';

    res.forEach((obj: BaseObject, i: number) => {
      result += i < res.length - 1 ? `${(obj as Satellite).sccNum},` : `${(obj as Satellite).sccNum}`;
    });

    (<HTMLInputElement>getEl('search')).value = result;
    const uiManagerInstance = ServiceLocator.getUiManager();

    uiManagerInstance.doSearch((<HTMLInputElement>getEl('search')).value);
  }

  protected searchSats_(searchParams: SearchSatParams): Satellite[] {
    const flags = FindSatPlugin.buildValidityFlags_(searchParams);

    if (FindSatPlugin.hasNoCriteria_(flags)) {
      throw new Error('No Search Criteria Entered');
    }

    const margins: SearchMargins = {
      azMarg: FindSatPlugin.marginOrDefault_(searchParams.azMarg, 5),
      elMarg: FindSatPlugin.marginOrDefault_(searchParams.elMarg, 5),
      rngMarg: FindSatPlugin.marginOrDefault_(searchParams.rngMarg, 200),
      incMarg: FindSatPlugin.marginOrDefault_(searchParams.incMarg, 1),
      periodMarg: FindSatPlugin.marginOrDefault_(searchParams.periodMarg, 0.5),
      tleAgeMarg: FindSatPlugin.marginOrDefault_(searchParams.tleAgeMarg, 1),
      rcsMarg: FindSatPlugin.marginOrDefault_(searchParams.rcsMarg, searchParams.rcs / 10),
      raanMarg: FindSatPlugin.marginOrDefault_(searchParams.raanMarg, 1),
      argPeMarg: FindSatPlugin.marginOrDefault_(searchParams.argPeMarg, 1),
    };

    let res = ServiceLocator.getCatalogManager().getSats();

    res = !flags.isValidInc && !flags.isValidPeriod && !flags.isValidTleAge && (flags.isValidAz || flags.isValidEl || flags.isValidRange) ? FindSatPlugin.checkInview_(res) : res;

    const objTypes = (Array.isArray(searchParams.objType) ? searchParams.objType : [searchParams.objType]).filter((type) => type !== 0);

    res = objTypes.length > 0 ? filterByObjType(res, objTypes) : res;

    res = FindSatPlugin.applyLookAngleFilters_(res, searchParams, margins, flags);
    res = FindSatPlugin.applyOrbitalFilters_(res, searchParams, margins, flags);
    res = FindSatPlugin.applyCategoricalFilters_(res, searchParams);

    res = FindSatPlugin.limitPossibles_(res, settingsManager.searchLimit);

    FindSatPlugin.commitSearchResults_(res);

    return res;
  }
}
