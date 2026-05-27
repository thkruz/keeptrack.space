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
import { buildSideMenuTabsHtml, initSideMenuTabs, updateSideMenuTabIndicator } from '@app/engine/ui/side-menu-tabs';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import folderCodePng from '@public/img/icons/folder-code.png';
import { saveAs } from 'file-saver';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './catalog-management.css';

type T7eKey = Parameters<typeof t7e>[0];

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
      title: t7e('plugins.CatalogManagementPlugin.title' as T7eKey),
      body: t7e('plugins.CatalogManagementPlugin.helpBody' as T7eKey),
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
      <div id="catalog-management-menu" class="side-menu-parent start-hidden">
        <div class="side-menu" style="scrollbar-gutter: stable;">
          <div id="cm-dropzone" class="cm-dropzone">
            Drop .tce, .tle, or .txt file to load catalog
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
          data-tooltip="Update TLEs for existing satellites while preserving name, country, and mission data. Satellites not in the imported file are removed.">
          <input id="cm-keep-sat-info" type="checkbox" />
          <span class="lever"></span>
          Keep Satellite Information
        </label>
      </div>
      <div class="row">
        <center>
          <input type="file" id="cm-import-file" accept=".tce,.tle,.txt" style="display:none" />
          <button id="cm-import-btn" class="btn btn-ui waves-effect waves-light">
            Import Catalog &#9658;
          </button>
        </center>
      </div>
    `;
  }

  protected buildExportTabHtml_(): string {
    return html`
      <h5 class="center-align">Catalog Exports</h5>
      <div class="divider"></div>
      <div class="row"></div>
      <div class="row">
        <center>
          <button id="de-export-tle-2a" class="btn btn-ui waves-effect waves-light">
            Export Official TLEs &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="de-export-tle-3a" class="btn btn-ui waves-effect waves-light">
            Export Official 3LEs &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="de-export-tle-2b" class="btn btn-ui waves-effect waves-light">
            Export KeepTrack TLEs &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="de-export-tle-3b" class="btn btn-ui waves-effect waves-light">
            Export KeepTrack 3LEs &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="de-export-csv" class="btn btn-ui waves-effect waves-light">
            Export Catalog XLSX &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="de-export-tce" class="btn btn-ui waves-effect waves-light">
            Export STK .tce &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="de-export-fov" class="btn btn-ui waves-effect waves-light">
            Export Satellites in FOV &#9658;
          </button>
        </center>
      </div>
      <h5 class="center-align">Satellite Ephemeris</h5>
      <div class="divider"></div>
      <div class="row"></div>
      <form id="de-ephemeris-form">
        <div class="row">
          <div class="input-field col s6">
            <input value="24" id="de-ephem-span" type="text" />
            <label for="de-ephem-span" class="active">Time Span (hrs)</label>
          </div>
          <div class="input-field col s6">
            <input value="60" id="de-ephem-step" type="text" />
            <label for="de-ephem-step" class="active">Step Size (sec)</label>
          </div>
        </div>
        <div class="row">
          <center>
            <button id="de-export-ephem" class="btn btn-ui waves-effect waves-light" type="submit"
              name="action" disabled>Select Satellite First</button>
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

    getEl('de-export-tle-2a')?.addEventListener('click', () => {
      CatalogExporter.exportTle2Txt(objData);
    });

    getEl('de-export-tle-3a')?.addEventListener('click', () => {
      CatalogExporter.exportTle2Txt(objData, 3);
    });

    getEl('de-export-tle-2b')?.addEventListener('click', () => {
      CatalogExporter.exportTle2Txt(objData, 2, false);
    });

    getEl('de-export-tle-3b')?.addEventListener('click', () => {
      CatalogExporter.exportTle2Txt(objData, 3, false);
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

  protected updateEphemerisButton_(obj: BaseObject) {
    const btn = getEl('de-export-ephem') as HTMLButtonElement | null;

    if (!btn) {
      return;
    }

    if (obj?.isSatellite()) {
      btn.disabled = false;
      btn.textContent = 'Export .e Ephemeris \u25B6';
    } else {
      btn.disabled = true;
      btn.textContent = 'Select Satellite First';
    }
  }

  private exportEphemeris_() {
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);
    const sat = selectSatManager?.getSelectedSat();

    if (!sat || !sat.isSatellite()) {
      ServiceLocator.getUiManager().toast('No satellite selected!', ToastMsgType.critical);

      return;
    }

    const satellite = sat as Satellite;
    const spanHours = parseFloat((<HTMLInputElement>getEl('de-ephem-span')).value) || 24;
    const stepSec = parseFloat((<HTMLInputElement>getEl('de-ephem-step')).value) || 60;
    const totalSeconds = spanHours * 3600;
    const numPoints = Math.floor(totalSeconds / stepSec) + 1;

    const startTime = ServiceLocator.getTimeManager().getOffsetTimeObj(0);
    const lines: string[] = [];

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

      lines.push(
        `${offsetSec.toFixed(6)}  ${p.x.toFixed(6)}  ${p.y.toFixed(6)}  ${p.z.toFixed(6)}  ${v.x.toFixed(6)}  ${v.y.toFixed(6)}  ${v.z.toFixed(6)}`,
      );
    }

    if (lines.length === 0) {
      ServiceLocator.getUiManager().toast('Failed to propagate satellite!', ToastMsgType.critical);

      return;
    }

    const epochStr = CatalogManagementPlugin.formatStkEpoch_(startTime);

    const content = [
      'stk.v.11.0',
      'BEGIN Ephemeris',
      `NumberOfEphemerisPoints ${lines.length}`,
      `ScenarioEpoch ${epochStr}`,
      'InterpolationMethod Lagrange',
      'InterpolationOrder 7',
      'CentralBody Earth',
      'CoordinateSystem TEME',
      'DistanceUnit Kilometers',
      'EphemerisTimePosVel',
      '',
      ...lines,
      '',
      'END Ephemeris',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    saveAs(blob, `${satellite.sccNum5 ?? satellite.sccNum}.e`);
  }

  /**
   * Format a Date as STK epoch string: "DD Mon YYYY HH:MM:SS.sss"
   */
  private static formatStkEpoch_(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const mon = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hrs = date.getUTCHours().toString().padStart(2, '0');
    const min = date.getUTCMinutes().toString().padStart(2, '0');
    const sec = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');

    return `${day} ${mon} ${year} ${hrs}:${min}:${sec}.${ms}`;
  }
}
