import { getEl } from '@app/js/lib/get-el';
import { showLoading } from '@app/js/lib/showLoading';

import satChngPng from '@app/img/icons/satchng.png';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { SatConstellationString } from '@app/js/singletons/catalog-manager/satLinkManager';
import { lineManagerInstance } from '@app/js/singletons/draw-manager/line-manager';
import { GroupType } from '@app/js/singletons/object-group';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';

export class SatConstellations extends KeepTrackPlugin {
  bottomIconImg = satChngPng;
  bottomIconElementName: string = 'menu-constellations';
  bottomIconLabel: string = 'Constellations';
  sideMenuElementName: string = 'constellations-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
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
        <li class="menu-selectable" data-group="aehf">Milstar and AEHF</li>
        <li class="menu-selectable" data-group="wgs">DSCS and WGS</li>
        <!-- <li class="menu-selectable" data-group="starlink">Starlink</li> -->
        <li class="menu-selectable" data-group="sbirs">SBIRS</li>
      </ul>
    </div>
  </div>`;

  helpTitle = `Constellations Menu`;
  helpBody = keepTrackApi.html`The Constellations menu allows you to view groups of satellites.
  <br><br>
  For some constellations, notional uplink/downlinks and/or crosslinks will be drawn between satellites in the constellation.`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  static PLUGIN_NAME = 'Sat Constellations';
  constructor() {
    super(SatConstellations.PLUGIN_NAME);
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      method: 'uiManagerFinal',
      cbName: 'constellations',
      cb: () => {
        getEl('constellation-menu')
          .querySelectorAll('li')
          .forEach((element) => {
            element.addEventListener('click', function (evt: Event) {
              SatConstellations.constellationMenuClick((evt.target as HTMLElement).dataset.group);
            });
          });
      },
    });
  }

  static constellationMenuClick(groupName: string) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const groupManagerInstance = keepTrackApi.getGroupsManager();

    if (typeof groupManagerInstance == 'undefined') return;

    switch (groupName) {
      case 'SpaceStations':
        if (!groupManagerInstance.groupList[groupName]) groupManagerInstance.createGroup(GroupType.SCC_NUM, [25544, 48274], groupName);
        break;
      case 'GlonassGroup':
        if (!groupManagerInstance.groupList[groupName]) groupManagerInstance.createGroup(GroupType.NAME_REGEX, /GLONASS/u, groupName);
        break;
      case 'GalileoGroup':
        if (!groupManagerInstance.groupList[groupName]) groupManagerInstance.createGroup(GroupType.NAME_REGEX, /GALILEO/u, groupName);
        break;
      case 'GPSGroup':
        if (!groupManagerInstance.groupList[groupName]) groupManagerInstance.createGroup(GroupType.NAME_REGEX, /NAVSTAR/u, groupName);
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
            groupName
          );
        }
        break;
      case 'aehf':
        if (!groupManagerInstance.groupList[groupName])
          groupManagerInstance.createGroup(GroupType.SCC_NUM, catalogManagerInstance.id2satnum(catalogManagerInstance.satLinkManager.aehf), groupName);
        showLoading(() => {
          lineManagerInstance.clear();
          catalogManagerInstance.satLinkManager.showLinks(lineManagerInstance, SatConstellationString.Aehf, timeManagerInstance);
        });
        break;
      case 'wgs':
        // WGS also selects DSCS
        if (!groupManagerInstance.groupList[groupName])
          groupManagerInstance.createGroup(
            GroupType.SCC_NUM,
            catalogManagerInstance.id2satnum(catalogManagerInstance.satLinkManager.wgs.concat(catalogManagerInstance.satLinkManager.dscs)),
            groupName
          );
        showLoading(() => {
          lineManagerInstance.clear();
          catalogManagerInstance.satLinkManager.showLinks(lineManagerInstance, SatConstellationString.Wgs, timeManagerInstance);
        });
        break;
      case 'starlink':
        if (!groupManagerInstance.groupList[groupName]) groupManagerInstance.createGroup(GroupType.NAME_REGEX, /STARLINK/u, groupName);
        showLoading(() => {
          lineManagerInstance.clear();
          catalogManagerInstance.satLinkManager.showLinks(lineManagerInstance, SatConstellationString.Starlink, timeManagerInstance);
        });
        break;
      case 'sbirs': // SBIRS and DSP
        if (!groupManagerInstance.groupList[groupName]) {
          groupManagerInstance.createGroup(GroupType.SCC_NUM, catalogManagerInstance.id2satnum(catalogManagerInstance.satLinkManager.sbirs), groupName);
        }
        showLoading(() => {
          lineManagerInstance.clear();
          catalogManagerInstance.satLinkManager.showLinks(lineManagerInstance, SatConstellationString.Sbirs, timeManagerInstance);
        });
        break;
      default:
        throw new Error('Unknown group name: ' + groupName);
    }
    SatConstellations.groupSelected(groupName);
  }

  static groupSelected(groupName: string) {
    if (typeof groupName == 'undefined') return;
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const groupManagerInstance = keepTrackApi.getGroupsManager();

    if (typeof groupManagerInstance.groupList[groupName] == 'undefined') throw new Error('Unknown group name: ' + groupName);

    const searchDOM = getEl('search');
    groupManagerInstance.selectGroup(groupManagerInstance.groupList[groupName]);

    // Populate searchDOM with a search string separated by commas - minus the last one
    searchDOM.innerHTML = groupManagerInstance.groupList[groupName].objects
      .reduce((acc: string, id: number) => `${acc}${catalogManagerInstance.getSat(id).sccNum},`, '')
      .slice(0, -1);

    catalogManagerInstance.setSelectedSat(-1); // Clear selected sat

    const uiManagerInstance = keepTrackApi.getUiManager();
    uiManagerInstance.searchManager.doSearch(groupManagerInstance.groupList[groupName].objects.map((id: number) => catalogManagerInstance.getSat(id).sccNum).join(','));

    // Close Menus
    if (settingsManager.isMobileModeEnabled) uiManagerInstance.searchManager.searchToggle(true);
    uiManagerInstance.hideSideMenus();
  }
}

export const satConstellationsPlugin = new SatConstellations();
