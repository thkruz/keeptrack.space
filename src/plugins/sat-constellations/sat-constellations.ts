import { getEl } from '@app/engine/utils/get-el';

import { GroupType } from '@app/app/data/object-group';
import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import categoryPng from '@public/img/icons/category.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class SatConstellations extends KeepTrackPlugin {
  readonly id = 'SatConstellations';
  dependencies_: string[] = [SelectSatManager.name];

  private readonly additionalConstellations_ = [] as {
    groupName: string;
    groupType: GroupType;
    groupValue: number[] | RegExp;
    groupSlug: string;
  }[];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = categoryPng;
  bottomIconElementName: string = 'menu-constellations';
  sideMenuElementName: string = 'constellations-menu';
  sideMenuElementHtml: string = html`
  <div id="constellations-menu" class="side-menu-parent start-hidden text-select">
    <div id="constellation-menu" class="side-menu">
      <ul>
        <h5 class="center-align">Constellations</h5>
        <li class="divider"></li>
        <li class="menu-selectable" data-group="SpaceStations">Space Stations</li>
        <li class="menu-selectable" data-group="AmatuerRadio">Amateur Radio</li>
        <li class="menu-selectable" data-group="GPSGroup">GPS Satellites</li>
        <li class="menu-selectable" data-group="GalileoGroup">Galileo Satellites</li>
        <li class="menu-selectable" data-group="GlonassGroup">Glonass Satellites</li>
        <li class="menu-selectable" data-group="iridium">Iridium</li>
        <li class="menu-selectable" data-group="orbcomm">Orbcomm</li>
        <li class="menu-selectable" data-group="globalstar">Globalstar</li>
        <li class="menu-selectable" data-group="ses">SES</li>
        <li class="menu-selectable" data-group="aehf">Milstar and AEHF</li>
        <li class="menu-selectable" data-group="wgs">DSCS and WGS</li>
        <li class="menu-selectable" data-group="starlink">Starlink</li>
        <li class="menu-selectable" data-group="sbirs">SBIRS</li>
      </ul>
    </div>
  </div>`;

  dragOptions: ClickDragOptions = {
    isDraggable: true,
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        // Add additional constellations
        getEl('constellations-menu')!.querySelector('ul')!.insertAdjacentHTML(
          'beforeend',
          this.additionalConstellations_
            .map((constellation) => `<li class="menu-selectable" data-group="${constellation.groupSlug}">${constellation.groupName}</li>`)
            .join(''),
        );

        getEl('constellation-menu')!
          .querySelectorAll('li')
          .forEach((element) => {
            element.addEventListener('click', (evt: Event) => {
              this.constellationMenuClick_((evt.target as HTMLElement).dataset.group!);
            });
          });
      },
    );
  }

  addConstellation(groupName: string, groupType: GroupType, groupValue: number[] | RegExp) {
    const groupSlug = groupName.replace(/\s+/gu, '-').toLowerCase();

    this.additionalConstellations_.push({ groupName, groupType, groupValue, groupSlug });
  }

  private constellationMenuClick_(groupName: string) {
    // const timeManagerInstance = ServiceLocator.getTimeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const groupManagerInstance = ServiceLocator.getGroupsManager();

    if (typeof groupManagerInstance === 'undefined') {
      return;
    }

    // Catch for things like the divider
    if (!groupName) {
      return;
    }

    switch (groupName) {
      case 'SpaceStations':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.SCC_NUM, [25544, 48274], groupName);
        }
        break;
      case 'GlonassGroup':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.PAYLOAD_NAME_REGEX, /GLONASS/u, groupName);
        }
        break;
      case 'GalileoGroup':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.PAYLOAD_NAME_REGEX, /GALILEO/u, groupName);
        }
        break;
      case 'GPSGroup':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.PAYLOAD_NAME_REGEX, /NAVSTAR/u, groupName);
        }
        break;
      case 'iridium':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.PAYLOAD_NAME_REGEX, /IRIDIUM/u, groupName);
        }
        break;
      case 'orbcomm':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.PAYLOAD_NAME_REGEX, /ORBCOMM/u, groupName);
        }
        break;
      case 'globalstar':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.PAYLOAD_NAME_REGEX, /GLOBALSTAR/u, groupName);
        }
        break;
      case 'ses':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.PAYLOAD_NAME_REGEX, /SES \d+/u, groupName);
        }
        break;
      case 'AmatuerRadio':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(
            GroupType.SCC_NUM,
            [
              7530, 14781, 20442, 22826, 24278, 25338, 25397, 25544, 26931, 27607, 27844, 27848, 28895, 32785, 32788, 32789, 32791, 33493, 33498, 33499, 35932, 35933, 35935, 37224,
              37839, 37841, 37855, 38760, 39090, 39134, 39136, 39161, 39417, 39430, 39436, 39439, 39440, 39444, 39469, 39770, 40014, 40021, 40024, 40025, 40030, 40032, 40042,
              40043, 40057, 40071, 40074, 40377, 40378, 40379, 40380, 40654, 40719, 40900, 40903, 40906, 40907, 40908, 40910, 40911, 40912, 40926, 40927, 40928, 40931, 40967,
              40968, 41168, 41171, 41340, 41459, 41460, 41465, 41474, 41600, 41619, 41789, 41932, 41935, 42017,
            ],
            groupName,
          );
        }
        break;
      case 'aehf':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.SCC_NUM, catalogManagerInstance.id2satnum(catalogManagerInstance.satLinkManager.aehf), groupName);
        }
        // showLoading(() => {
        //   catalogManagerInstance.satLinkManager.showLinks(lineManagerInstance, SatConstellationString.Aehf, timeManagerInstance);
        // });
        break;
      case 'wgs':
        if (!groupManagerInstance.groupList[groupName]) {
          // WGS also selects DSCS
          const wgs = catalogManagerInstance.satLinkManager.wgs.concat(catalogManagerInstance.satLinkManager.dscs);

          groupManagerInstance.createGroup(GroupType.SCC_NUM, catalogManagerInstance.id2satnum(wgs), groupName);
        }
        // showLoading(() => {
        //   catalogManagerInstance.satLinkManager.showLinks(lineManagerInstance, SatConstellationString.Wgs, timeManagerInstance);
        // });
        break;
      case 'starlink':
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.NAME_REGEX, /STARLINK/u, groupName);
        }
        break;
      case 'sbirs': // SBIRS and DSP
        if (!groupManagerInstance.groupList[groupName]) {
          const sbirs = [...catalogManagerInstance.satLinkManager.sbirs, ...catalogManagerInstance.satLinkManager.dsp];

          groupManagerInstance.createGroup(GroupType.SCC_NUM, catalogManagerInstance.id2satnum(sbirs), groupName);
        }
        break;
      default:
        if (!groupManagerInstance.groupList[groupName]) {
          const constellation = this.additionalConstellations_.find((constellation) => constellation.groupSlug === groupName);

          if (constellation) {
            groupManagerInstance.createGroup(constellation.groupType, constellation.groupValue, groupName);
          }
        }

        if (!groupManagerInstance.groupList[groupName]) {
          throw new Error(`Unknown group name: ${groupName}`);
        }
    }
    SatConstellations.groupSelected(groupName);
  }

  static groupSelected(groupName: string) {
    if (typeof groupName === 'undefined') {
      return;
    }
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const groupManagerInstance = ServiceLocator.getGroupsManager();

    if (typeof groupManagerInstance.groupList[groupName] === 'undefined') {
      throw new Error(`Unknown group name: ${groupName}`);
    }

    const searchDOM = getEl('search');

    if (!searchDOM) {
      // If no searchDOM, there is no need to continue
      return;
    }

    groupManagerInstance.selectGroup(groupManagerInstance.groupList[groupName]);

    // Populate searchDOM with a search string separated by commas - minus the last one
    searchDOM.innerHTML = groupManagerInstance.groupList[groupName].ids.reduce((acc: string, id: number) => `${acc}${catalogManagerInstance.getSat(id)?.sccNum},`, '').slice(0, -1);

    // If SelectSatManager is enabled, deselect the selected sat
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);

    const uiManagerInstance = ServiceLocator.getUiManager();

    uiManagerInstance.searchManager.doSearch(groupManagerInstance.groupList[groupName].ids.map((id: number) => catalogManagerInstance.getSat(id)?.sccNum).join(','));

    // Close Menus
    if (settingsManager.isMobileModeEnabled) {
      uiManagerInstance.searchManager.closeSearch();
    }
    uiManagerInstance.hideSideMenus();
  }
}
