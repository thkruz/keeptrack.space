import satChngPng from '@app/img/icons/satchng.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { clickAndDragWidth, getEl, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import $ from 'jquery';

let isConstellationsMenuOpen = false;

export const uiManagerInit = () => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
      <div id="constellations-menu" class="side-menu-parent start-hidden text-select">
        <div id="constellation-menu" class="side-menu">
          <ul>
            <h5 class="center-align">Constellations</h5>
            <li class="divider"></li>
            <li class="menu-selectable" data-group="aehf">Milstar and AEHF</li>
            <li class="menu-selectable" data-group="wgs">DSCS and WGS</li>
            <!-- <li class="menu-selectable" data-group="starlink">Starlink</li> -->
            <li class="menu-selectable" data-group="GPSGroup">GPS Satellites</li>
            <li class="menu-selectable" data-group="GalileoGroup">Galileo Satellites</li>
            <li class="menu-selectable" data-group="GlonassGroup">Glonass Satellites</li>
            <li class="menu-selectable" data-group="AmatuerRadio">Amateur Radio</li>
          </ul>
        </div>
      </div>
      `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
      <div id="menu-constellations" class="bmenu-item">
        <img
          alt="constellation"
          src=""
          delayedsrc="${satChngPng}"
        />
        <span class="bmenu-title">Constellations</span>
        <div class="status-icon"></div>
      </div>
    `
  );
};

export const uiManagerFinal = () => {
  clickAndDragWidth(getEl('constellations-menu'));

  getEl('constellation-menu')
    .querySelectorAll('li')
    .forEach((element) => {
      element.addEventListener('click', function () {
        constellationMenuClick($(this).data('group'));
      });
    });
};

// prettier-ignore
export const constellationMenuClick = (groupName: any) => { // NOSONAR
  const { satSet, objectManager, groupsManager, lineManager, uiManager } = keepTrackApi.programs;

  if (typeof groupsManager == 'undefined') return;

  switch (groupName) {
    case 'SpaceStations':
      if (!groupsManager.SpaceStations) groupsManager.SpaceStations = groupsManager.createGroup('objNum', [25544, 41765]);
      break;
    case 'GlonassGroup':
      if (!groupsManager.GlonassGroup) groupsManager.GlonassGroup = groupsManager.createGroup('nameRegex', /GLONASS/u);
      break;
    case 'GalileoGroup':
      if (!groupsManager.GalileoGroup) groupsManager.GalileoGroup = groupsManager.createGroup('nameRegex', /GALILEO/u);
      break;
    case 'GPSGroup':
      if (!groupsManager.GPSGroup) groupsManager.GPSGroup = groupsManager.createGroup('nameRegex', /NAVSTAR/u);
      break;
    case 'AmatuerRadio':
      if (!groupsManager.AmatuerRadio) {
        groupsManager.AmatuerRadio = groupsManager.createGroup(
          'objNum',
          [
            7530, 14781, 20442, 22826, 24278, 25338, 25397, 25544, 26931, 27607, 27844, 27848, 28895, 32785, 32788, 32789, 32791, 33493, 33498, 33499, 35932, 35933, 35935, 37224,
            37839, 37841, 37855, 38760, 39090, 39134, 39136, 39161, 39417, 39430, 39436, 39439, 39440, 39444, 39469, 39770, 40014, 40021, 40024, 40025, 40030, 40032, 40042, 40043,
            40057, 40071, 40074, 40377, 40378, 40379, 40380, 40654, 40719, 40900, 40903, 40906, 40907, 40908, 40910, 40911, 40912, 40926, 40927, 40928, 40931, 40967, 40968, 41168,
            41171, 41340, 41459, 41460, 41465, 41474, 41600, 41619, 41789, 41932, 41935, 42017,
          ]
        );
      }
      break;
    case 'aehf':
      if (!groupsManager.aehf) groupsManager.aehf = groupsManager.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.aehf));
      showLoading(() => {
        lineManager.clear();
        objectManager.satLinkManager.showLinks(lineManager, satSet, 'aehf');
      });
      break;
    case 'wgs':
      // WGS also selects DSCS
      if (!groupsManager.wgs)
        groupsManager.wgs = groupsManager.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.wgs.concat(objectManager.satLinkManager.dscs)));
      showLoading(() => {
        lineManager.clear();
        objectManager.satLinkManager.showLinks(lineManager, satSet, 'wgs');
      });
      break;
    case 'starlink':
      if (!groupsManager.starlink) groupsManager.starlink = groupsManager.createGroup('nameRegex', /STARLINK/u);
      showLoading(() => {
        lineManager.clear();
        objectManager.satLinkManager.showLinks(lineManager, satSet, 'starlink');
      });
      break;
    case 'sbirs': // SBIRS and DSP
      if (!groupsManager.sbirs) {
        groupsManager.sbirs = groupsManager.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.sbirs));
      }
      showLoading(() => {
        lineManager.clear();
        objectManager.satLinkManager.showLinks(lineManager, satSet, 'sbirs');
      });
      break;
    default:
      throw new Error('Unknown group name: ' + groupName);
  }
  groupSelected(groupName);
  uiManager.doSearch((<HTMLInputElement>getEl('search')).value);
};

export const groupSelected = (groupName: string) => {
  if (typeof groupName == 'undefined') return;

  const { groupsManager, searchBox, uiManager, satSet, objectManager } = keepTrackApi.programs;
  if (typeof groupsManager[groupName] == 'undefined') throw new Error('Unknown group name: ' + groupName);

  const searchDOM = $('#search');
  groupsManager.selectGroup(groupsManager[groupName]);

  // Populate searchDOM with a search string separated by commas - minus the last one
  searchDOM.val(groupsManager[groupName].sats.reduce((acc: string, obj: { satId: number }) => `${acc}${satSet.getSat(obj.satId).sccNum},`, '').slice(0, -1));

  searchBox.fillResultBox(groupsManager[groupName].sats, satSet);
  objectManager.setSelectedSat(-1); // Clear selected sat

  // Close Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(true);
  uiManager.hideSideMenus();
};

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('constellations-menu'), 1000);
  getEl('menu-constellations').classList.remove('bmenu-item-selected');
  isConstellationsMenuOpen = false;
};

export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-constellations') {
    const { uiManager } = keepTrackApi.programs;
    if (isConstellationsMenuOpen) {
      uiManager.hideSideMenus();
      isConstellationsMenuOpen = false;
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('constellations-menu'), 1000);
      isConstellationsMenuOpen = true;
      getEl('menu-constellations').classList.add('bmenu-item-selected');
      return;
    }
  }
};

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'constellations',
    cb: uiManagerInit,
  });

  // Add event listeners
  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'constellations',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'constellations',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'constellations',
    cb: hideSideMenus,
  });
};
