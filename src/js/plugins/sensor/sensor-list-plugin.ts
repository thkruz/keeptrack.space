import radarPng from '@app/img/icons/radar.png';
import { keepTrackContainer } from '@app/js/container';
import { OrbitManager, SatObject, SensorObject, Singletons, UiManager } from '@app/js/interfaces';
import { keepTrackApi, KeepTrackApiMethods } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { CameraType, mainCameraInstance } from '@app/js/singletons/camera';
import { StandardColorSchemeManager } from '@app/js/singletons/color-scheme-manager';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import { LegendManager } from '@app/js/static/legend-manager';
import { SensorMath } from '@app/js/static/sensor-math';
import { DateTimeManager } from '../date-time-manager/date-time-manager';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { Planetarium } from '../planetarium/planetarium';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class SensorListPlugin extends KeepTrackPlugin {
  dependencies: string[] = [DateTimeManager.PLUGIN_NAME];

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonEnabled) {
      if (keepTrackApi.getPlugin(Planetarium)?.isMenuButtonEnabled) {
        getEl('cspocAllSensor').style.display = 'none';
        getEl('mwAllSensor').style.display = 'none';
        getEl('mdAllSensor').style.display = 'none';
        getEl('llAllSensor').style.display = 'none';
        getEl('rusAllSensor').style.display = 'none';
        getEl('prcAllSensor').style.display = 'none';
      } else {
        getEl('cspocAllSensor').style.display = 'block';
        getEl('mwAllSensor').style.display = 'block';
        getEl('mdAllSensor').style.display = 'block';
        getEl('llAllSensor').style.display = 'block';
        getEl('rusAllSensor').style.display = 'block';
        getEl('prcAllSensor').style.display = 'block';
      }
    }
  };

  bottomIconElementName = 'sensor-list-icon';
  bottomIconLabel = 'Sensors';
  bottomIconImg = radarPng;

  sideMenuElementName: string = 'sensor-list-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div id="sensor-list-menu" class="side-menu-parent start-hidden text-select">
        <div id="sensor-list-content" class="side-menu">
        <div class="row">
            <ul id="reset-sensor-text" class="sensor-reset-menu">
            <h5 id="reset-sensor-button" class="center-align menu-selectable">Reset Sensor</h5>
            <li class="divider"></li>
            </ul>
            <ul>
            <h5 class="center-align">CSpOC Sensors</h5>
            <li class="divider"></li>
            <li id="cspocAllSensor" class="menu-selectable" data-sensor="cspocAll">All CSpOC Sensors<span class="badge dark-blue-badge"
                data-badge-caption="Coalition"></span></li>
            <li id="mwAllSensor" class="menu-selectable" data-sensor="mwAll">All MW Sensors<span class="badge dark-blue-badge"
                data-badge-caption="Coalition"></span></li>
            <li class="menu-selectable" data-sensor="BLE">Beale<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="COD">Cape Cod<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="CAV">Cavalier<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="CLR">Clear<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="CDN">Cobra Dane<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="EGL">Eglin<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="FYL">Fylingdales<span class="badge dark-blue-badge"
                data-badge-caption="RAF"></span></li>
            <li class="menu-selectable" data-sensor="GLB">Globus II<span class="badge dark-blue-badge"
                data-badge-caption="NOR"></span></li>
            <li class="menu-selectable" data-sensor="MIL">Millstone<span class="badge dark-blue-badge"
                data-badge-caption="MIT"></span></li>
            <li class="menu-selectable" data-sensor="THL">Thule<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="ASC">Ascension<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="ALT">ALTAIR<span class="badge dark-blue-badge"
                data-badge-caption="USA"></span></li>
            <li class="menu-selectable" data-sensor="MMW">Millimeter Wave<span class="badge dark-blue-badge"
                data-badge-caption="USA"></span></li>
            <li class="menu-selectable" data-sensor="ALC">ALCOR<span class="badge dark-blue-badge"
                data-badge-caption="USA"></span></li>
            <li class="menu-selectable" data-sensor="TDX">TRADEX<span class="badge dark-blue-badge"
                data-badge-caption="USA"></span></li>
            <li class="menu-selectable" data-sensor="DGC">Diego Garcia<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="MAU">Maui<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="menu-selectable" data-sensor="SOC">Socorro<span class="badge dark-blue-badge"
                data-badge-caption="USSF"></span></li>
            <li class="divider"></li>
            <h5 class="center-align">MDA Sensors</h5>
            <li class="divider"></li>
            <li id="mdAllSensor" class="menu-selectable" data-sensor="mdAll">All Sensors<span class="badge dark-blue-badge"
                data-badge-caption="Coalition"></span></li>
            <li class="menu-selectable" data-sensor="HAR">Har Keren<span class="badge dark-blue-badge"
                data-badge-caption="ISR"></span></li>
            <li class="menu-selectable" data-sensor="QTR">CENTCOM<span class="badge dark-blue-badge"
                data-badge-caption="USA"></span></li>
            <li class="menu-selectable" data-sensor="KUR">Kürecik<span class="badge dark-blue-badge"
                data-badge-caption="USA"></span></li>
            <li class="menu-selectable" data-sensor="SHA">Shariki<span class="badge dark-blue-badge"
                data-badge-caption="USA"></span></li>
            <li class="menu-selectable" data-sensor="KCS">Kyogamisaki<span class="badge dark-blue-badge"
                data-badge-caption="USA"></span></li>
            <li class="menu-selectable" data-sensor="SBX">Sea-Based X-Band<span class="badge dark-blue-badge"
                data-badge-caption="USN"></span></li>
            <li class="menu-selectable" data-sensor="TAI">Taiwan SRP<span class="badge dark-blue-badge"
                data-badge-caption="TAI"></span></li>
            <li class="divider"></li>
            <h5 class="center-align">LeoLabs Sensors</h5>
            <li class="divider"></li>
            <li id="llAllSensor" class="menu-selectable" data-sensor="llAll">All Sensors<span class="badge dark-blue-badge"
                data-badge-caption="Comm"></span></li>
            <li class="menu-selectable" data-sensor="CRSR">Costa Rica Space Radar<span class="badge dark-blue-badge"
                data-badge-caption="Comm"></span></li>
            <li class="menu-selectable" data-sensor="MSR">Midland Space Radar<span class="badge dark-blue-badge"
                data-badge-caption="Comm"></span></li>
            <li class="menu-selectable" data-sensor="PFISR">PFIS Radar<span class="badge dark-blue-badge"
                data-badge-caption="Comm"></span></li>
            <li class="menu-selectable" data-sensor="KSR">Kiwi Space Radar<span class="badge dark-blue-badge"
                data-badge-caption="Comm"></span></li>
            <li class="divider"></li>
            <h5 class="center-align">ESOC Sensors</h5>
            <li class="divider"></li>
            <li class="menu-selectable" data-sensor="GRV">GRAVES<span class="badge dark-blue-badge"
                data-badge-caption="FRA"></span></li>
            <li class="menu-selectable" data-sensor="FYL">Fylingdales<span class="badge dark-blue-badge"
                data-badge-caption="RAF"></span></li>
            <li class="menu-selectable" data-sensor="TIR">TIRA<span class="badge dark-blue-badge"
                data-badge-caption="GER"></span></li>
            <li class="menu-selectable" data-sensor="NRC">Northern Cross<span
                class="badge dark-blue-badge" data-badge-caption="ITA"></span></li>
            <li class="menu-selectable" data-sensor="TRO">Troodos<span class="badge dark-blue-badge"
                data-badge-caption="RAF"></span></li>
            <li class="menu-selectable" data-sensor="SDT">Space Debris Telescope<span
                class="badge dark-blue-badge" data-badge-caption="ESA"></span></li>
                <!-- GALILEO GROUND SENSOR STATION -->
            <li class="menu-selectable" data-sensor="GGS">GSS Fucino<span
                class="badge dark-blue-badge" data-badge-caption="ITA"></span></li>
                <!-- GALILEO GROUND SENSOR STATION -->
            <li class="divider"></li>
            <h5 class="center-align">Russian Sensors</h5>
            <li class="divider"></li>
            <li id="rusAllSensor" class="menu-selectable" data-sensor="rusAll">All Russian Sensors<span
                class="badge dark-blue-badge" data-badge-caption="RUS"></span></li>
            <li class="menu-selectable" data-sensor="ARM">Armavir<span class="badge dark-blue-badge"
                data-badge-caption="RUS"></span></li>
            <li class="menu-selectable" data-sensor="BAL">Balkhash<span class="badge dark-blue-badge"
                data-badge-caption="RUS"></span></li>
            <li class="menu-selectable" data-sensor="GAN">Gantsevichi<span class="badge dark-blue-badge"
                data-badge-caption="RUS"></span></li>
            <li class="menu-selectable" data-sensor="LEK">Lekhtusi<span class="badge dark-blue-badge"
                data-badge-caption="RUS"></span></li>
            <li class="menu-selectable" data-sensor="MIS">Mishelevka<span class="badge dark-blue-badge"
                data-badge-caption="RUS"></span></li>
            <li class="menu-selectable" data-sensor="OLE">Olenegorsk<span class="badge dark-blue-badge"
                data-badge-caption="RUS"></span></li>
            <li class="menu-selectable" data-sensor="PEC">Pechora<span class="badge dark-blue-badge"
                data-badge-caption="RUS"></span></li>
            <li class="menu-selectable" data-sensor="PIO">Pionersky<span class="badge dark-blue-badge"
                data-badge-caption="RUS"></span></li>
            <li class="divider"></li>
            <h5 class="center-align">Chinese Sensors</h5>
            <li class="divider"></li>
            <li id="prcAllSensor" class="menu-selectable" data-sensor="prcAll">All Chinese Sensors<span
                class="badge dark-blue-badge" data-badge-caption="PRC"></span></li>
            <li class="menu-selectable" data-sensor="XIN">Xingjiang<span class="badge dark-blue-badge"
                data-badge-caption="PRC"></span></li>
            <li class="menu-selectable" data-sensor="ZHE">Zhejiang<span class="badge dark-blue-badge"
                data-badge-caption="PRC"></span></li>
            <li class="menu-selectable" data-sensor="HEI">Heilongjiang<span class="badge dark-blue-badge"
                data-badge-caption="PRC"></span></li>
            <li class="menu-selectable" data-sensor="SHD">Shadong<span class="badge dark-blue-badge"
                data-badge-caption="PRC"></span></li>
            <li class="menu-selectable" data-sensor="PMO">Purple Mountain<span class="badge dark-blue-badge"
                data-badge-caption="PRC"></span></li>
            </ul>
        </div>
        </div>
    </div>`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  static PLUGIN_NAME = 'Sensor List';
  isSensorLinksAdded = false;
  constructor() {
    super(SensorListPlugin.PLUGIN_NAME);
  }

  helpTitle = `Sensors Menu`;
  helpBody = keepTrackApi.html`The Sensors menu allows you to select a sensor for use in calculations and other menu's functions.
  Sensors are in groups based on the networks they primarily support.
  On the left side of the menu is the name of the sensor and on the right side is the country/organization that owns it.
  <br><br>
  Selecting an "All...Sensors" option will select all sensors in that group.
  This is useful for visualizing the networks coverage, but currently does not work for all calculations.
  If you are trying to calculate look angles for a network it is best to use the multi-site look angles tool or
  to use look angles for each of the individual sensors in the network.
  <br><br>
  Sensors on this list include Mechanical and Phased Array Radars, in addition to Optical sensors:
  <ul style="margin-left: 40px;">
    <li>
      Phased Array Radars typically are limited to Low Earth Orbit (LEO).
    </li>
    <li>
      Mechanical Radars can be used for both LEO and Geostationary Orbit (GEO).
    </li>
    <li>
      Optical sensors are typically used for GEO, but can also be used for LEO.
    </li>
    <li>
      Optical sensors are limited to night time observations in clear skies, whereas radars can be used for both day and night.
    </li>
  </ul>
  <br>
  Sensor information is based on publicly available data and can be verified in the Sensor Info menu.
  If you have public data on additional sensors or corrections to existing sensor information please contact me at <a href="mailto:theodore.kruczek@gmail.com">theodore.kruczek@gmail.com</a>.`;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerInit,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('nav-mobile').insertAdjacentHTML('beforeend', keepTrackApi.html`<div id="sensor-selected"></div>`);
      },
    });
    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('sensor-selected').addEventListener('click', () => {
          keepTrackApi.methods.bottomMenuClick(this.bottomIconElementName);
        });

        getEl('sensor-list-content').addEventListener('click', (e: any) => {
          if (!e.target.classList.contains('menu-selectable')) return;
          if (e.target.id === 'reset-sensor-button') {
            keepTrackApi.getSensorManager().resetSensorSelected();
            return;
          }
          const sensorClick = e.target.dataset.sensor;
          this.sensorListContentClick(sensorClick);
        });
      },
    });

    keepTrackApi.register({
      method: 'selectSatData',
      cbName: 'sensor',
      cb: (sat: SatObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (sat === null || typeof sat === 'undefined') {
          return;
        }

        if (keepTrackApi.getPlugin(SelectSatManager) !== null && !this.isSensorLinksAdded) {
          getEl('sat-info-top-links').insertAdjacentHTML(
            'beforeend',
            keepTrackApi.html`
                  <div id="sensors-in-fov-link" class="link sat-infobox-links tooltipped" data-position="top" data-delay="50"
                        data-tooltip="Visualize Sensor Coverage">Show All Sensors with FOV...</div>
                `
          );
          getEl('sensors-in-fov-link').addEventListener('click', () => {
            const catalogManagerInstance = keepTrackApi.getCatalogManager();
            const sensorManagerInstance = keepTrackApi.getSensorManager();

            Object.keys(sensorManagerInstance.sensors).forEach((key) => {
              const sensor = sensorManagerInstance.sensors[key];
              const sat = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
              const tearr = SensorMath.getTearr(sat, [sensor]);
              if (tearr.inView) {
                keepTrackApi.getLineManager().create('sat6', [sat.id, catalogManagerInstance.getSensorFromSensorName(sensor.name)], 'g');
              }
            });
          });
          this.isSensorLinksAdded = true;
        }
      },
    });

    keepTrackApi.register({
      method: KeepTrackApiMethods.setSensor,
      cbName: this.PLUGIN_NAME,
      cb: (sensor: SensorObject | string) => {
        if (!sensor) {
          getEl('reset-sensor-button').style.display = 'none';
        } else {
          getEl('reset-sensor-button').style.display = 'block';
        }
      },
    });
  }

  sensorListContentClick(sensorClick: string) {
    if (!this.isMenuButtonEnabled) return;

    const sensorManagerInstance = keepTrackApi.getSensorManager();
    if (typeof sensorClick == 'undefined') {
      errorManagerInstance.debug('The menu item was clicked but the menu was not defined.');
      return;
    }

    switch (sensorClick) {
      case 'cspocAll':
        sensorManagerInstance.setSensor('SSN');
        break;
      case 'mwAll':
        sensorManagerInstance.setSensor('NATO-MW');
        break;
      case 'mdAll':
        sensorManagerInstance.setSensor('MD-ALL');
        break;
      case 'llAll':
        sensorManagerInstance.setSensor('LEO-LABS');
        break;
      case 'rusAll':
        sensorManagerInstance.setSensor('RUS-ALL');
        break;
      case 'prcAll':
        sensorManagerInstance.setSensor('PRC-ALL');
        break;
      default:
        sensorManagerInstance.setSensor(sensorManagerInstance.sensors[`${sensorClick}`]);
        break;
    }

    // Deselect any satellites
    keepTrackApi.getCatalogManager().setSelectedSat(-1);

    try {
      mainCameraInstance.lookAtLatLon(
        sensorManagerInstance.currentSensors[0].lat,
        sensorManagerInstance.currentSensors[0].lon,
        sensorManagerInstance.currentSensors[0].zoom,
        keepTrackApi.getTimeManager().selectedDate
      );
    } catch (e) {
      // TODO: More intentional conditional statement
      errorManagerInstance.warn('Error in sensorListContentClick: ' + e);
      // Multi-sensors break this
    }
    if (settingsManager.currentColorScheme == (<StandardColorSchemeManager>(<unknown>keepTrackApi.getColorSchemeManager())).default) {
      LegendManager.change('default');
    }
  }

  resetSensorButtonClick() {
    if (!this.isMenuButtonEnabled) return;

    getEl('menu-sensor-info')?.classList.add('bmenu-item-disabled');
    getEl('menu-fov-bubble')?.classList.add('bmenu-item-disabled');
    getEl('menu-surveillance')?.classList.add('bmenu-item-disabled');
    getEl('menu-planetarium')?.classList.add('bmenu-item-disabled');
    getEl('menu-astronomy')?.classList.add('bmenu-item-disabled');
    if (mainCameraInstance.cameraType === CameraType.PLANETARIUM) {
      keepTrackApi.getPlugin(Planetarium)?.setBottomIconToUnselected();
      mainCameraInstance.isPanReset = true;
      mainCameraInstance.isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6;
      keepTrackApi.getDrawManager().glInit();
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      uiManagerInstance.hideSideMenus();
      const orbitManagerInstance = keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);
      orbitManagerInstance.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
      mainCameraInstance.cameraType = CameraType.DEFAULT; // Back to normal Camera Mode
      // TODO: implement fov information
      // getEl('fov-text').innerHTML = ('');
      getEl('menu-planetarium').classList.remove('bmenu-item-selected');
    }
  }
}

export const sensorListPlugin = new SensorListPlugin();
