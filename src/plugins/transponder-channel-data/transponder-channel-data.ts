import { apiFetch } from '@app/app/data/api-fetch';
import { GroupType } from '@app/app/data/object-group';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import transponderChannelDataPng from '@public/img/icons/sat-channel-freq.png';
import { SatConstellations } from '../sat-constellations/sat-constellations';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './transponder-channel-data.css';

interface ChannelInfo {
  satellite: string;
  tvchannel: string;
  beam: string;
  freq: string;
  system: string;
  SRFEC: string;
  video: string;
  lang: string;
  encryption: string;
}

export class TransponderChannelData extends KeepTrackPlugin {
  readonly id = 'TransponderChannelData';
  dependencies_ = [];
  // eslint-disable-next-line max-len
  private readonly satsWithChannels_: string[] = ['39508', '41588', '40424', '25924', '37393', '43039', '35942', '39078', '42934', '44479', '32794', '39237', '28868', '31102', '39127', '43450', '38107', '40982', '36745', '37810', '44186', '40272', '40941', '35696', '37933', '42942', '29055', '31306', '33436', '37775', '39285', '38778', '40364', '36581', '32299', '39079', '43632', '36592', '41029', '56757', '43463', '41238', '32019', '28943', '37677', '39157', '39017', '44067', '52255', '33051', '49125', '42907', '28935', '42967', '33207', '36499', '39008', '39233', '43700', '54259', '40425', '41589', '42741', '38992', '39773', '41382', '39020', '44334', '40875', '41310', '45985', '45986', '41191', '39612', '39613', '29236', '32951', '33376', '46114', '54243', '54244', '54026', '54741', '54742', '27445', '42814', '37264', '43228', '43633', '54048', '54225', '28358', '36097', '37238', '37834', '38356', '38740', '38749', '38098', '38867', '40271', '41581', '41748', '40874', '42818', '41747', '42950', '44476', '26824', '41903', '41471', '29272', '38331', '37749', '39728', '29349', '42984', '37265', '42691', '41034', '35362', '40147', '52904', '38014', '36830', '52817', '33373', '35873', '38342', '28526', '36032', '33749', '44048', '40146', '32252', '35756', '37779', '37826', '36831', '36516', '42432', '43488', '43175', '42709', '55970', '55971', '37809', '53961', '52933', '37748', '38087', '38652', '39172', '34941', '39460', '41380', '28945', '37606', '32768', '38991', '40733', '41904', '49055', '33274', '14787', '41944', '34111', '41036', '37602', '43611', '28786', '39500', '41552', '32487', '36033', '40613', '39481', '33056', '39522', '47306', '50212', '32767', '38332', '40345', '39022', '44307'];

  isIconDisabled = true;

  private lastLoadedSat_ = -1;
  private dataCache_: ChannelInfo[] = [];

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-transponderChannelData',
      label: t7e('plugins.TransponderChannelData.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: transponderChannelDataPng,
      menuMode: [MenuMode.TOOLS, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  onBottomIconClick(): void {
    const selectedSat = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

    if (
      !selectedSat ||
      selectedSat.id === -1 ||
      !selectedSat.isSatellite() ||
      !this.satsWithChannels_.includes((selectedSat as Satellite).sccNum)
    ) {
      errorManagerInstance.warn(t7e('plugins.TransponderChannelData.errorMsgs.NoChannelInfo' as Parameters<typeof t7e>[0]));

      return;
    }

    if (!this.isMenuButtonActive) {
      return;
    }

    this.showTable_();
    this.lastLoadedSat_ = selectedSat.id;
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'TransponderChannelData-menu',
      title: t7e('plugins.TransponderChannelData.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 600,
      maxWidth: 1200,
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div class="row">
        <table id="TransponderChannelData-table" class="center-align striped-light centered"></table>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.TransponderChannelData.title' as Parameters<typeof t7e>[0]),
      body: t7e('plugins.TransponderChannelData.helpBody' as Parameters<typeof t7e>[0]),
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'T',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onDownload(): void {
    this.exportData_();
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        // addConstellation takes number[] for SCC_NUM groups today. The TV
        // satellite list is exclusively legacy 5-digit numeric IDs, so parseInt
        // is safe here; if this list ever contains alpha-5 or extended IDs the
        // addConstellation signature will need to grow to accept strings.
        PluginRegistry.getPlugin(SatConstellations)?.addConstellation('TV Satellites', GroupType.SCC_NUM, this.satsWithChannels_.map((sccNum) => parseInt(sccNum)));
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (
          !obj ||
          obj.id === -1 ||
          !obj.isSatellite() ||
          !this.satsWithChannels_.includes((obj as Satellite).sccNum)
        ) {
          if (this.isMenuButtonActive) {
            this.closeSideMenu();
          }
          this.setBottomIconToDisabled();
        } else {
          this.setBottomIconToEnabled();

          if (this.isMenuButtonActive && this.lastLoadedSat_ !== obj.id) {
            this.showTable_();
            this.lastLoadedSat_ = obj.id;
          }
        }
      },
    );
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  private async showTable_(): Promise<void> {
    const selectedObj = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

    if (!selectedObj?.isSatellite()) {
      errorManagerInstance.warn(t7e('plugins.TransponderChannelData.errorMsgs.NotSatellite' as Parameters<typeof t7e>[0]));

      return;
    }

    const selectedSat = selectedObj as Satellite;

    try {
      const resp = await apiFetch(`https://api.keeptrack.space/v4/channels/${encodeURIComponent(selectedSat.name)}`);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json() as ChannelInfo[];

      this.displayChannelData_(this.cleanData_(data));
    } catch {
      try {
        const resp = await apiFetch(`https://api.keeptrack.space/v4/channels/${encodeURIComponent(selectedSat.altName)}`);

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const data = await resp.json() as ChannelInfo[];

        this.displayChannelData_(this.cleanData_(data));
      } catch {
        errorManagerInstance.warn(
          (t7e('plugins.TransponderChannelData.errorMsgs.FetchFailed' as Parameters<typeof t7e>[0]) as string)
            .replace('{name}', selectedSat.name)
            .replace('{altName}', selectedSat.altName),
        );
      }
    }
  }

  private cleanData_(data: ChannelInfo[]): ChannelInfo[] {
    const uniqueData: ChannelInfo[] = [];
    const seen = new Set<string>();

    data.forEach((entry) => {
      const identifier = `${entry.tvchannel}-${entry.freq}-${entry.beam}`;

      if (!seen.has(identifier)) {
        seen.add(identifier);
        uniqueData.push(entry);
      }
    });

    return uniqueData;
  }

  private displayChannelData_(data: ChannelInfo[]): void {
    if (!data || data.length === 0) {
      errorManagerInstance.warn(t7e('plugins.TransponderChannelData.errorMsgs.NoData' as Parameters<typeof t7e>[0]));

      return;
    }

    this.dataCache_ = data;
    const tbl = getEl('TransponderChannelData-table', true) as HTMLTableElement;

    if (!tbl) {
      return;
    }

    tbl.innerHTML = '';

    const header = tbl.createTHead();
    const headerRow = header.insertRow();

    Object.keys(data[0]).forEach((key) => {
      const th = document.createElement('th');

      th.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      th.style.textAlign = 'left';
      headerRow.appendChild(th);
    });

    data.forEach((info) => {
      const row = tbl.insertRow();

      Object.values(info).forEach((val) => {
        const cell = row.insertCell();

        cell.textContent = val;
      });
    });
  }

  private exportData_(): void {
    if (this.dataCache_.length === 0) {
      return;
    }

    saveXlsx(this.dataCache_.map((info) => ({ ...info })), 'channel-info');
  }
}
