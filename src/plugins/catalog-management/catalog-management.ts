/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * catalog-management.ts provides catalog import (drag-and-drop / file picker)
 * and satellite data export functionality in a two-tab side menu.
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
import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { CatalogLoader } from '@app/app/data/catalog-loader';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { buildSideMenuTabsHtml, initSideMenuTabs, updateSideMenuTabIndicator } from '@app/engine/ui/side-menu-tabs';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import folderCodePng from '@public/img/icons/folder-code.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { downloadText, exportFileName, formatStkEphemeris, parseEphemerisParams, StkEphemerisRow } from './catalog-management-export';
import './catalog-management.css';

type T7eKey = Parameters<typeof t7e>[0];

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.CatalogManagementPlugin.${key}` as T7eKey);

export class CatalogManagementPlugin extends KeepTrackPlugin {
  readonly id = 'CatalogManagementPlugin';
  dependencies_ = [];

  private isLoading_ = false;
  private docDragEnterCount_ = 0;
  private keepSatInfo_ = false;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'catalog-management-icon',
      label: t7e('plugins.CatalogManagementPlugin.bottomIconLabel' as T7eKey),
      image: folderCodePng,
      menuMode: [MenuMode.TOOLS, MenuMode.ALL],
    };
  }

  onBottomIconClick(): void {
    updateSideMenuTabIndicator('catalog-mgmt-tabs');
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'catalog-management-menu',
      title: t7e('plugins.CatalogManagementPlugin.title' as T7eKey),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 400,
      maxWidth: 550,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/catalog-management/catalog-management-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.importHeading'),
          content: l('help.import'),
        },
        {
          heading: l('help.exportHeading'),
          content: l('help.export'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
    };
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  protected buildSideMenuHtml_(): string {
    const importTabContent = this.buildImportTabHtml_();
    const exportTabContent = this.buildExportTabHtml_();

    const tabsHtml = buildSideMenuTabsHtml('catalog-mgmt-tabs', [
      { id: 'catalog-mgmt-import-tab', label: t7e('plugins.CatalogManagementPlugin.tabs.import' as T7eKey), content: importTabContent },
      { id: 'catalog-mgmt-export-tab', label: t7e('plugins.CatalogManagementPlugin.tabs.export' as T7eKey), content: exportTabContent },
    ]);

    return html`
      <div id="catalog-management-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div class="side-menu" style="scrollbar-gutter: stable;">
          <div id="cm-dropzone" class="cm-dropzone">
            ${l('labels.dropzone')}
          </div>
          <div class="row">
            ${tabsHtml}
          </div>
        </div>
      </div>
    `;
  }

  protected buildImportTabHtml_(): string {
    return html`
      <div class="switch row cm-toggle-row">
        <label for="cm-keep-sat-info" data-position="top" data-delay="50"
          data-tooltip="${l('labels.keepSatInfoTooltip')}">
          <input id="cm-keep-sat-info" type="checkbox" />
          <span class="lever"></span>
          ${l('labels.keepSatInfo')}
        </label>
      </div>
      <div class="row">
        <center>
          <input type="file" id="cm-import-file" accept=".tce,.tle,.txt" style="display:none" />
          <button id="cm-import-btn" class="btn btn-ui waves-effect waves-light">
            ${l('buttons.importCatalog')} &#9658;
          </button>
        </center>
      </div>
    `;
  }

  protected buildExportTabHtml_(): string {
    return html`
      <div class="kt-menu-body">
        ${this.wrapSection_(l('labels.orbitalElements'), this.orbitalElementsBody_())}
        ${this.wrapSection_(l('labels.tabularStk'), this.buildTabularStkBody_())}
        ${this.wrapSection_(l('labels.selectedSatellite'), this.buildSelectedSatBody_())}
      </div>
    `;
  }

  /**
   * Wrap a section's controls in a titled v13 card. Centralizes the section
   * chrome so every group reads consistently (uppercase label + bordered card).
   */
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

  /**
   * "Orbital Elements" body: TLE/3LE text export. The historical 2x2 matrix of
   * buttons (Official/KeepTrack x 2-line/3-line) is collapsed into a Source and
   * a Format dropdown plus one download button. Pro extends this body with the
   * OMM catalog export.
   */
  protected orbitalElementsBody_(): string {
    return html`
      <div class="kt-field-row">
        <div class="input-field col s6">
          <select id="de-tle-source">
            <option value="official" selected>${l('options.sourceOfficial')}</option>
            <option value="keeptrack">${l('options.sourceKeepTrack')}</option>
          </select>
          <label for="de-tle-source">${l('labels.tleSource')}</label>
        </div>
        <div class="input-field col s6">
          <select id="de-tle-format">
            <option value="3" selected>${l('options.format3')}</option>
            <option value="2">${l('options.format2')}</option>
          </select>
          <label for="de-tle-format">${l('labels.tleFormat')}</label>
        </div>
      </div>
      ${CatalogManagementPlugin.actionButton_('de-export-tle', l('buttons.downloadTle'))}
    `;
  }

  /** "Tabular & STK" body: spreadsheet, STK database, and FOV CSV exports. */
  protected buildTabularStkBody_(): string {
    return html`
      ${CatalogManagementPlugin.actionButton_('de-export-csv', l('buttons.exportCatalogXlsx'))}
      ${CatalogManagementPlugin.actionButton_('de-export-tce', l('buttons.exportStkTce'))}
      ${CatalogManagementPlugin.actionButton_('de-export-fov', l('buttons.exportSatsInFov'))}
    `;
  }

  /**
   * "Selected Satellite" body: per-satellite exports that require a selection.
   * Holds the shared time-span/step inputs and the STK .e ephemeris export. Pro
   * extends this body with the OPM/OEM/OMM single-object exports.
   */
  protected buildSelectedSatBody_(): string {
    return html`
      <form id="de-ephemeris-form">
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input value="24" id="de-ephem-span" type="text" />
            <label for="de-ephem-span" class="active">${l('labels.timeSpanHrs')}</label>
          </div>
          <div class="input-field col s6">
            <input value="60" id="de-ephem-step" type="text" />
            <label for="de-ephem-step" class="active">${l('labels.stepSizeSec')}</label>
          </div>
        </div>
        ${CatalogManagementPlugin.actionButton_('de-export-ephem', l('buttons.selectSatelliteFirst'), { submit: true, disabled: true })}
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

    EventBus.getInstance().on(EventBusEvent.selectSatData, (obj: BaseObject) => {
      this.updateEphemerisButton_(obj);
    });
  }

  protected uiManagerFinal_() {
    initSideMenuTabs('catalog-mgmt-tabs');

    // --- Import tab ---
    this.initImportHandlers_();

    // --- Export tab ---
    this.initExportHandlers_();

    // Style the Source/Format (and Pro scope) dropdowns. Scoped to this menu so
    // we don't re-wrap every select on the page.
    initMaterialSelects(getEl('catalog-management-menu') ?? document.body);
  }

  private initImportHandlers_(): void {
    const importBtn = getEl('cm-import-btn');
    const fileInput = getEl('cm-import-file') as HTMLInputElement | null;
    const keepSatToggle = getEl('cm-keep-sat-info') as HTMLInputElement | null;

    keepSatToggle?.addEventListener('change', () => {
      this.keepSatInfo_ = keepSatToggle.checked;
    });

    importBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.handleImportFile_(fileInput.files[0]);
        fileInput.value = '';
      }
    });

    this.initDragAndDrop_();
  }

  private hideDropzone_(): void {
    const dropzone = getEl('cm-dropzone', true);

    if (dropzone) {
      dropzone.classList.remove('visible');
    }
  }

  private initDragAndDrop_(): void {
    const dropzone = getEl('cm-dropzone', true);

    if (!dropzone) {
      return;
    }

    document.addEventListener('dragenter', (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) {
        return;
      }
      e.preventDefault();
      this.docDragEnterCount_++;
      if (this.isMenuButtonActive) {
        dropzone.classList.add('visible');
      }
    });

    document.addEventListener('dragleave', (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX <= 0 && e.clientY <= 0) {
        this.docDragEnterCount_ = 0;
        this.hideDropzone_();
      } else {
        this.docDragEnterCount_--;
        if (this.docDragEnterCount_ <= 0) {
          this.docDragEnterCount_ = 0;
          this.hideDropzone_();
        }
      }
    });

    document.addEventListener('dragover', (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
    });

    document.addEventListener('drop', () => {
      this.docDragEnterCount_ = 0;
      this.hideDropzone_();
    });

    dropzone.addEventListener('dragover', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    });

    dropzone.addEventListener('drop', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.docDragEnterCount_ = 0;
      this.hideDropzone_();

      const files = (e as DragEvent).dataTransfer?.files;

      if (!files || files.length === 0) {
        return;
      }

      const validFile = Array.from(files).find(
        (f) => f.name.endsWith('.tce') || f.name.endsWith('.txt') || f.name.endsWith('.tle'),
      );

      if (!validFile) {
        ServiceLocator.getUiManager().toast(
          'No .tce, .tle, or .txt file found in drop',
          ToastMsgType.caution,
        );

        return;
      }

      this.handleImportFile_(validFile);
    });
  }

  private initExportHandlers_(): void {
    const objData = ServiceLocator.getCatalogManager().objectCache;

    getEl('de-export-tle')?.addEventListener('click', () => {
      this.exportTle_(objData);
    });

    getEl('de-export-csv')?.addEventListener('click', () => {
      CatalogExporter.exportTle2Csv(objData);
    });

    getEl('de-export-tce')?.addEventListener('click', () => {
      CatalogExporter.exportTce(objData);
    });

    getEl('de-export-fov')?.addEventListener('click', () => {
      CatalogExporter.exportSatInFov2Csv(objData);
    });

    getEl('de-ephemeris-form')?.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      showLoading(() => this.exportEphemeris_());
    });
  }

  /**
   * Export TLE/3LE text using the Source and Format dropdowns.
   * Source: "official" drops analyst satellites, "keeptrack" keeps everything.
   * Format: "3" prepends the satellite name line, "2" is the bare element set.
   */
  private exportTle_(objData: BaseObject[]): void {
    const source = (getEl('de-tle-source') as HTMLSelectElement | null)?.value ?? 'official';
    const format = (getEl('de-tle-format') as HTMLSelectElement | null)?.value ?? '3';
    const numberOfLines = format === '2' ? 2 : 3;
    const isDeleteAnalysts = source !== 'keeptrack';

    CatalogExporter.exportTle2Txt(objData, numberOfLines, isDeleteAnalysts);
  }

  // =========================================================================
  // Import
  // =========================================================================

  protected handleImportFile_(file: File): void {
    if (this.isLoading_) {
      return;
    }

    const validExts = ['.tce', '.tle', '.txt'];

    if (!validExts.some((ext) => file.name.endsWith(ext))) {
      ServiceLocator.getUiManager().toast(
        'Unsupported file type. Use .tce, .tle, or .txt',
        ToastMsgType.caution,
      );

      return;
    }

    this.isLoading_ = true;

    const reader = new FileReader();

    reader.onload = async (loadEvent) => {
      const content = loadEvent.target?.result;

      if (typeof content !== 'string') {
        this.isLoading_ = false;

        return;
      }

      try {
        if (this.keepSatInfo_) {
          await CatalogLoader.mergeAndReloadCatalog(content);
        } else {
          await CatalogLoader.reloadCatalog(content);
        }
        ServiceLocator.getUiManager().toast(
          `Loaded catalog from ${file.name}`,
          ToastMsgType.normal,
        );
      } catch (error) {
        errorManagerInstance.error(error, 'CatalogManagementPlugin');
        ServiceLocator.getUiManager().toast(
          `Failed to load ${file.name}`,
          ToastMsgType.critical,
        );
      } finally {
        this.isLoading_ = false;
      }
    };

    reader.readAsText(file);
  }

  // =========================================================================
  // Ephemeris export (.e file)
  // =========================================================================

  /**
   * Set the label text on a `.kt-action` button without clobbering the trailing
   * chevron (which is a CSS pseudo-element on the button, not in the label span).
   */
  protected static setActionLabel_(id: string, label: string): void {
    const btn = getEl(id) as HTMLButtonElement | null;
    const labelEl = btn?.querySelector('.kt-action-label');

    if (labelEl) {
      labelEl.textContent = label;
    }
  }

  protected updateEphemerisButton_(obj: BaseObject) {
    const btn = getEl('de-export-ephem') as HTMLButtonElement | null;

    if (!btn) {
      return;
    }

    const isSat = obj?.isSatellite() ?? false;

    btn.disabled = !isSat;
    CatalogManagementPlugin.setActionLabel_('de-export-ephem', isSat ? l('buttons.exportEphemeris') : l('buttons.selectSatelliteFirst'));
  }

  /**
   * Resolve the currently selected object as a Satellite, or toast and return
   * null. Shared by the base ephemeris export and the Pro ODM exports.
   * @param noSelectionMsg - Message shown when no satellite is selected.
   */
  protected getSelectedSatellite_(noSelectionMsg = 'No satellite selected!'): Satellite | null {
    const sat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();

    if (!sat || !sat.isSatellite()) {
      ServiceLocator.getUiManager().toast(noSelectionMsg, ToastMsgType.critical);

      return null;
    }

    return sat as Satellite;
  }

  private exportEphemeris_() {
    const satellite = this.getSelectedSatellite_();

    if (!satellite) {
      return;
    }

    const spanEl = getEl('de-ephem-span') as HTMLInputElement | null;
    const stepEl = getEl('de-ephem-step') as HTMLInputElement | null;
    const parsed = parseEphemerisParams(spanEl?.value, stepEl?.value);

    if (!parsed.ok) {
      // TODO(localization): base plugin ephemeris messages are not yet localized.
      ServiceLocator.getUiManager().toast(
        'Export too large. Reduce the time span or increase the step size.',
        ToastMsgType.critical,
      );

      return;
    }

    const { stepSec, numPoints } = parsed.params;
    const startTime = ServiceLocator.getTimeManager().getOffsetTimeObj(0);
    const rows: StkEphemerisRow[] = [];

    for (let i = 0; i < numPoints; i++) {
      const offsetSec = i * stepSec;
      const time = new Date(startTime.getTime() + offsetSec * 1000);
      const eci = SatMath.getEci(satellite, time);

      if (!eci.position || typeof eci.position === 'boolean') {
        continue;
      }
      if (!eci.velocity || typeof eci.velocity === 'boolean') {
        continue;
      }

      const p = eci.position;
      const v = eci.velocity;

      rows.push({
        offsetSec,
        position: { x: p.x, y: p.y, z: p.z },
        velocity: { x: v.x, y: v.y, z: v.z },
      });
    }

    if (rows.length === 0) {
      ServiceLocator.getUiManager().toast('Failed to propagate satellite!', ToastMsgType.critical);

      return;
    }

    const content = formatStkEphemeris(rows, { scenarioEpoch: startTime });

    downloadText(content, exportFileName(satellite, 'e'));
  }
}
