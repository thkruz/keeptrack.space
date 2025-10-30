import { GroupType } from '@app/app/data/object-group';
import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { saveCsv } from '@app/engine/utils/saveVariable';
import { BaseObject, DetailedSatellite } from '@ootk/src/main';
import transponderChannelDataPng from '@public/img/icons/sat-channel-freq.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatConstellations } from '../sat-constellations/sat-constellations';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

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
  bottomIconCallback: () => void = () => {
    const selectedSat = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

    // Show error if satellite is not a Payload in GEO
    if (
      !selectedSat ||
      selectedSat.id === -1 ||
      !selectedSat.isSatellite() ||
      !this.satsWithChannels_.includes((selectedSat as DetailedSatellite).sccNum)
    ) {
      errorManagerInstance.warn('Satellite does not have channel information');

      return;
    }

    if (!this.isMenuButtonActive) {
      return;
    }


    this.showTable();
    this.lastLoadedSat_ = selectedSat.id;
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  private lastLoadedSat_ = -1;
  dataCache: ChannelInfo[];

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        PluginRegistry.getPlugin(SatConstellations)?.addConstellation('TV Satellites', GroupType.SCC_NUM, this.satsWithChannels_.map((sccNum) => parseInt(sccNum)));
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        const exportLaunchInfo = getEl('export-channel-info');

        if (exportLaunchInfo) {
          exportLaunchInfo.addEventListener('click', () => {
            this.exportData();
          });
        }
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
          !this.satsWithChannels_.includes((obj as DetailedSatellite).sccNum)
        ) {
          if (this.isMenuButtonActive) {
            this.closeSideMenu();
          }
          this.setBottomIconToDisabled();
        } else {
          // It is a satellite with channel information
          this.setBottomIconToEnabled();

          // If it is open, update the table
          if (this.isMenuButtonActive && this.lastLoadedSat_ !== obj.id) {
            this.showTable();
            this.lastLoadedSat_ = obj.id;
          }
        }
      },
    );
  }

  bottomIconElementName: string = 'menu-transponderChannelData';
  bottomIconImg = transponderChannelDataPng;

  dragOptions: ClickDragOptions = {
    isDraggable: false,
    maxWidth: 1000,
    minWidth: 1000,
  };

  sideMenuElementName: string = 'transponderChannelData-menu';
  sideMenuElementHtml: string = html`
  <div id="transponderChannelData-menu" class="side-menu-parent start-hidden text-select">
    <div id="transponderChannelData-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Satellite Frequencies</h5>
        <table id="transponderChannelData-table" class="center-align striped-light centered"></table>
      </div>
      <div class="row">
        <center>
          <button id="export-channel-info" class="btn btn-ui waves-effect waves-light">Export Channel Info &#9658;</button>
        </center>
      </div>
    </div>
  </div>`;

  showTable() {
    const selectedObj = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;
    let selectedSat: DetailedSatellite;

    if (selectedObj?.isSatellite()) {
      selectedSat = selectedObj as DetailedSatellite;
    } else {
      errorManagerInstance.warn('Selected object is not a satellite');

      return;
    }

    // First try with satellite name
    fetch(`https://api.keeptrack.space/v3/channels/${selectedSat.name}`)
      .then(async (resp) => {
        const data = await resp.json() as ChannelInfo[];

        this.displayChannelData(this.cleanData(data));
      })
      .catch(() => {
        // If first request fails, try with altName
        fetch(`https://api.keeptrack.space/v3/channels/${selectedSat.altName}`)
          .then(async (resp) => {
            const data = await resp.json() as ChannelInfo[];

            this.displayChannelData(this.cleanData(data));
          })
          .catch(() => errorManagerInstance.warn(
            `Failed to fetch channel info for ${selectedSat.name} and ${selectedSat.altName}`,
          ));
      });
  }

  cleanData(data: ChannelInfo[]): ChannelInfo[] {
    // Remove any duplicate entries
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

  displayChannelData(data: ChannelInfo[]) {
    this.dataCache = data;
    const tbl: HTMLTableElement = <HTMLTableElement>getEl('transponderChannelData-table');

    if (!tbl) {
      return;
    }

    tbl.innerHTML = '';

    // Add a header row
    const header = tbl.createTHead();
    const headerRow = header.insertRow();

    Object.keys(data[0]).forEach((key) => {
      const th = document.createElement('th');
      const h3 = document.createElement('h3');

      h3.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      h3.style.textAlign = 'left';
      th.appendChild(h3);
      headerRow.appendChild(th);
    });

    // Create table rows for each item
    data.forEach((info) => {
      const row = tbl.insertRow();

      Object.values(info).forEach((val) => {
        const cell = row.insertCell();

        cell.textContent = val;
      });
    });
  }

  exportData() {
    const data = this.dataCache.map((info) => {
      const obj: Record<string, unknown> = {};

      Object.keys(info).forEach((key) => {
        obj[key] = info[key];
      });

      return obj;
    });

    saveCsv(data, 'channel-info.csv');
  }
}
