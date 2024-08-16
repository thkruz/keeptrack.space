import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';
import { waitForCruncher } from '@app/lib/waitForCruncher';
import { LegendManager } from '@app/static/legend-manager';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import colorsPng from '@public/img/icons/colors.png';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class ColorMenu extends KeepTrackPlugin {
  protected dependencies_: string[];
  bottomIconImg = colorsPng;
  bottomIconElementName: string = 'menu-color-scheme';
  bottomIconLabel: string = 'Color Schemes';
  sideMenuElementName: string = 'color-scheme-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="color-scheme-menu" class="side-menu-parent start-hidden text-select">
    <div id="colors-menu" class="side-menu">
      <ul>
        <h5 class="center-align">Color Schemes</h5>
        <li class="divider"></li>
        <li class="menu-selectable" data-color="default">Object Type</li>
        <li class="menu-selectable" data-color="sunlight">Sunlight</li>
        <li class="menu-selectable" data-color="velocity">Velocity</li>
        <li class="menu-selectable" data-color="neighbors">Orbit Density</li>
        <li class="menu-selectable" data-color="confidence">Confidence Level</li>
        <li class="menu-selectable" data-color="rcs">Radar Cross Section</li>
        <li class="menu-selectable" data-color="starlink">Starlink</li>
        <li class="menu-selectable" data-color="smallsats">Small Satellites</li>
        <li class="menu-selectable" data-color="countries">Countries</li>
        <li class="menu-selectable" data-color="near-earth">Near Earth</li>
        <li class="menu-selectable" data-color="deep-space">Deep Space</li>
        <li class="menu-selectable" data-color="elset-age">Elset Age</li>
        <li class="menu-selectable" data-color="lost-objects">Lost Objects</li>
      </ul>
    </div>
  </div>`;

  helpTitle = 'Colors Menu';

  helpBody = keepTrackApi.html`The Colors Menu is a place to change the color theme used to render the objects.
<br><br>
The various themes can change the colors based on the objects' orbits, objects' characteristics, or the objects' relation to sun and/or earth.
`;

  rmbL1ElementName = 'colors-rmb';
  rmbL1Html = keepTrackApi.html`
  <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">Color Scheme &#x27A4;</a></li>`;

  isRmbOnEarth = true;
  isRmbOffEarth = true;
  rmbMenuOrder = 50;

  rmbL2ElementName = 'colors-rmb-menu';
  rmbL2Html = keepTrackApi.html`
  <ul class='dropdown-contents'>
    <li id="colors-default-rmb"><a href="#">Object Types</a></li>
    <li id="colors-rcs-rmb"><a href="#">Radar Cross Section</a></li>
    <li id="colors-density-rmb"><a href="#">Orbit Density</a></li>
    <li id="colors-starlink-rmb"><a href="#">Starlink</a></li>
    <li id="colors-sunlight-rmb"><a href="#">Sunlight Status</a></li>
    <li id="colors-country-rmb"><a href="#">Country</a></li>
    <li id="colors-confidence-rmb"><a href="#">Confidence Level</a></li>
    <li id="colors-velocity-rmb"><a href="#">Velocity</a></li>
    <li id="colors-ageOfElset-rmb"><a href="#">Age of Elset</a></li>
  </ul>`;

  // eslint-disable-next-line class-methods-use-this
  rmbCallback: (targetId: string, clickedSat?: number) => void = (targetId: string) => {
    switch (targetId) {
      case 'colors-confidence-rmb':
        ColorMenu.colorsMenuClick('confidence');
        break;
      case 'colors-rcs-rmb':
        ColorMenu.colorsMenuClick('rcs');
        break;
      case 'colors-density-rmb':
        ColorMenu.colorsMenuClick('neighbors');
        break;
      case 'colors-starlink-rmb':
        ColorMenu.colorsMenuClick('starlink');
        break;
      case 'colors-sunlight-rmb':
        ColorMenu.colorsMenuClick('sunlight');
        break;
      case 'colors-country-rmb':
        ColorMenu.colorsMenuClick('countries');
        break;
      case 'colors-velocity-rmb':
        ColorMenu.colorsMenuClick('velocity');
        break;
      case 'colors-ageOfElset-rmb':
        ColorMenu.colorsMenuClick('elset-age');
        break;
      case 'colors-default-rmb':
      default:
        ColorMenu.colorsMenuClick('default');
        break;
    }
  };

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.constructor.name,
      cb: () => {
        getEl('colors-menu')
          .querySelectorAll('li')
          .forEach((element) => {
            element.addEventListener('click', () => {
              const colorName = element.dataset.color;

              ColorMenu.colorsMenuClick(colorName);
            });
          });
      },
    });
  }

  static readonly colorsMenuClick = (colorName: string) => {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    // If selecteSatManager is loaded, clear selected sat
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1); // clear selected sat

    if (colorName !== 'sunlight') {
      catalogManagerInstance.satCruncher.postMessage({
        isSunlightView: false,
        typ: CruncerMessageTypes.SUNLIGHT_VIEW,
      });
    }
    switch (colorName) {
      case 'confidence':
        LegendManager.change('confidence');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.confidence, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'velocity':
        LegendManager.change('velocity');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.velocity, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'sunlight':
        catalogManagerInstance.satCruncher.postMessage({
          isSunlightView: true,
          typ: CruncerMessageTypes.SUNLIGHT_VIEW,
        });
        LegendManager.change('sunlight');
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.sunlight);
        waitForCruncher({
          cruncher: catalogManagerInstance.satCruncher,
          cb: () => {
            colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.sunlight, true);
          },
          validationFunc: (data) => data.satInSun,
        });
        break;
      case 'near-earth':
        LegendManager.change('near');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.leo, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'deep-space':
        LegendManager.change('deep');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.geo, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'elset-age':
        showLoading(() => {
          LegendManager.change('ageOfElset');
          colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.ageOfElset, true);
          uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        });
        break;
      case 'lost-objects':
        (<HTMLInputElement>getEl('search')).value = '';
        showLoading(() => {
          settingsManager.lostSatStr = '';
          colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.lostobjects, true);
          (<HTMLInputElement>getEl('search')).value = settingsManager.lostSatStr;
          uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
          uiManagerInstance.doSearch((<HTMLInputElement>getEl('search')).value);
        });
        break;
      case 'rcs':
        LegendManager.change('rcs');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.rcs, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'starlink':
        LegendManager.change('starlink');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.starlink, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'smallsats':
        LegendManager.change('small');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.smallsats, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'neighbors':
        LegendManager.change('neighbors');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.neighbors, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'countries':
        LegendManager.change('countries');
        if (keepTrackApi.getGroupsManager().selectedGroup !== null) {
          colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.groupCountries, true);
        } else {
          colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.countries, true);
        }
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
      case 'default':
      default:
        LegendManager.change('default');
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true);
        uiManagerInstance.colorSchemeChangeAlert(colorSchemeManagerInstance.currentColorScheme);
        break;
    }

    keepTrackApi.getUiManager().hideSideMenus();
  };
}

export const colorMenuPlugin = new ColorMenu();
