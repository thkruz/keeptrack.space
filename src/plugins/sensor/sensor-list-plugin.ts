import { sensors } from '@app/catalogs/sensors';
import { SatObject, SensorObject } from '@app/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/keepTrackApi';
import { getClass } from '@app/lib/get-class';
import { getEl } from '@app/lib/get-el';
import { CameraType } from '@app/singletons/camera';
import { LineTypes } from '@app/singletons/draw-manager/line-manager';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import { LegendManager } from '@app/static/legend-manager';
import { SensorMath } from '@app/static/sensor-math';
import radarPng from '@public/img/icons/radar.png';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { DateTimeManager } from '../date-time-manager/date-time-manager';
import { Planetarium } from '../planetarium/planetarium';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class SensorListPlugin extends KeepTrackPlugin {
  dependencies: string[] = [DateTimeManager.PLUGIN_NAME];

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      if (keepTrackApi.getPlugin(Planetarium)?.isMenuButtonActive) {
        getClass('sensor-top-link').forEach((el) => {
          el.style.display = 'none';
        });
      } else {
        getClass('sensor-top-link').forEach((el) => {
          el.style.gridTemplateColumns = 'repeat(2,1fr)';
          el.style.display = '';
        });
      }
    }
  };

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 500,
    maxWidth: 700,
  };

  bottomIconElementName = 'sensor-list-icon';
  bottomIconLabel = 'Sensors';
  bottomIconImg = radarPng;

  sideMenuElementName: string = 'sensor-list-menu';
  sideMenuElementHtml: string =
    keepTrackApi.html`
    <div id="sensor-list-menu" class="side-menu-parent start-hidden text-select">
        <div id="sensor-list-content" class="side-menu">
        <div class="row">
            <ul id="reset-sensor-text" class="sensor-reset-menu">
            <h5 id="reset-sensor-button" class="center-align menu-selectable">Reset Sensor</h5>
            <li class="divider"></li>
            </ul>
            <ul>` +
    SensorListPlugin.ssnSensors_() +
    SensorListPlugin.mwSensors_() +
    SensorListPlugin.mdaSensors_() +
    SensorListPlugin.leoLabsSensors_() +
    SensorListPlugin.esocSensors_() +
    SensorListPlugin.russianSensors_() +
    SensorListPlugin.chineseSensors_() +
    SensorListPlugin.otherSensors_() +
    keepTrackApi.html`
            </ul>
        </div>
        </div>
    </div>`;

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
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('nav-mobile').insertAdjacentHTML('beforeend', keepTrackApi.html`<div id="sensor-selected" class="waves-effect waves-light"></div>`);
      },
    });
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('sensor-selected').addEventListener('click', () => {
          keepTrackApi.methods.bottomMenuClick(this.bottomIconElementName);
        });

        getEl('sensor-list-content').addEventListener('click', (e: any) => {
          let realTarget = e.target;
          if (!e.target.classList.contains('menu-selectable')) {
            realTarget = e.target.parentElement;
            if (!realTarget.classList.contains('menu-selectable')) {
              return;
            }
          }

          if (realTarget.id === 'reset-sensor-button') {
            keepTrackApi.getSensorManager().resetSensorSelected();
            return;
          }
          const sensorClick = realTarget.dataset.sensor;
          this.sensorListContentClick(sensorClick);
        });
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
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
                  <div id="sensors-in-fov-link" class="link sat-infobox-links" data-position="top" data-delay="50"
                        data-tooltip="Visualize Sensor Coverage">Show All Sensors with FOV...</div>
                `
          );
          getEl('sensors-in-fov-link').addEventListener('click', () => {
            const catalogManagerInstance = keepTrackApi.getCatalogManager();

            Object.keys(sensors).forEach((key) => {
              const sensor = sensors[key];
              const sat = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
              const tearr = SensorMath.getTearr(sat, [sensor]);
              if (tearr.inView) {
                keepTrackApi.getLineManager().create(LineTypes.MULTI_SENSORS_TO_SAT, [sat.id, catalogManagerInstance.getSensorFromSensorName(sensor.name)], 'g');
              }
            });
          });
          this.isSensorLinksAdded = true;
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
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

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.sensorDotSelected,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SensorObject) => {
        if (settingsManager.isMobileModeEnabled) return;

        const sensorManagerInstance = keepTrackApi.getSensorManager();
        // No sensor manager on mobile
        sensorManagerInstance.setSensor(null, sat.staticNum);

        if (sensorManagerInstance.currentSensors.length === 0) throw new Error('No sensors found');
        const timeManagerInstance = keepTrackApi.getTimeManager();
        keepTrackApi
          .getMainCamera()
          .lookAtLatLon(
            sensorManagerInstance.currentSensors[0].lat,
            sensorManagerInstance.currentSensors[0].lon,
            sensorManagerInstance.currentSensors[0].zoom,
            timeManagerInstance.selectedDate
          );
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherReady,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        if (!settingsManager.disableUI && settingsManager.isLoadLastSensor) {
          SensorListPlugin.reloadLastSensor();
        }
      },
    });
  }

  sensorListContentClick(sensorClick: string) {
    if (!this.isMenuButtonActive) return;

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
      case 'esocAll':
        sensorManagerInstance.setSensor('ESOC-ALL');
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
        sensorManagerInstance.setSensor(sensors[`${sensorClick}`]);
        break;
    }

    // Deselect any satellites
    keepTrackApi.getCatalogManager().setSelectedSat(-1);

    try {
      keepTrackApi
        .getMainCamera()
        .lookAtLatLon(
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
    if (settingsManager.currentColorScheme == keepTrackApi.getColorSchemeManager().default) {
      LegendManager.change('default');
    }
  }

  static createLiForSensor(sensor: SensorObject) {
    return keepTrackApi.html`
      <li class="menu-selectable" data-sensor="${sensor.objName}">
        <span>${sensor.uiName}</span>
        <span>${sensor.system}</span>
        <span class="badge dark-blue-badge" data-badge-caption="${sensor.operator}"></span>
      </li>
    `;
  }

  static ssnSensors_() {
    return this.createSection({
      header: 'Space Surveillance Network Sensors',
      sensors: [
        sensors.EGLAFB,
        sensors.KWAJSPF,
        sensors.GEODDSDGC,
        sensors.GEODDSMAU,
        sensors.GEODDSSOC,
        sensors.KWAJALT,
        sensors.KWAJMMW,
        sensors.KWAJALC,
        sensors.KWAJTDX,
        sensors.MITMIL,
        sensors.RAFASC,
        sensors.GLBII,
        sensors.HOLCBAND,
        sensors.HOLSST,
      ],
      topLinks: [
        {
          name: 'All SSN Sensors',
          dataSensor: 'ssnAll',
          badge: 'COALITION',
        },
      ],
    });
  }

  static mwSensors_() {
    return this.createSection({
      header: 'US Missile Warning Sensors',
      sensors: [sensors.BLEAFB, sensors.CODSFS, sensors.CAVSFS, sensors.CLRSFS, sensors.COBRADANE, sensors.RAFFYL, sensors.PITSB],
      topLinks: [
        {
          name: 'All MW Sensors',
          dataSensor: 'mwAll',
          badge: 'NORAD',
        },
      ],
    });
  }

  static mdaSensors_() {
    return this.createSection({
      header: 'US Missile Defense Agency Sensors',
      sensors: [sensors.HARTPY, sensors.QTRTPY, sensors.KURTPY, sensors.SHATPY, sensors.KCSTPY, sensors.SBXRDR],
      topLinks: [
        {
          name: 'All MDA Sensors',
          dataSensor: 'mdAll',
          badge: 'MDA',
        },
      ],
    });
  }

  static createSection(params: { header: string; sensors: SensorObject[]; topLinks: { name: string; dataSensor: string; badge: string }[] }) {
    return keepTrackApi.html`
              <li class="divider"></li>
              <h5 class="center-align">${params.header}</h5>
              <li class="divider"></li>
              ${params.topLinks
                .map(
                  (link) => keepTrackApi.html`<li class="menu-selectable sensor-top-link" data-sensor="${link.dataSensor}">
                <span>${link.name}</span>
                <span class="badge dark-blue-badge" data-badge-caption="${link.badge}"></span>
              </li>`
                )
                .join('')}
              ${params.sensors.map((sensor) => SensorListPlugin.createLiForSensor(sensor)).join('')}
              `;
  }

  static esocSensors_() {
    return this.createSection({
      header: 'ESA Space Operations Center Sensors',
      sensors: [
        sensors.GRV,
        sensors.TIR,
        sensors.GES,
        sensors.NRC,
        sensors.PDM,
        sensors.TRO,
        sensors.Tenerife,
        sensors.ZimLAT,
        sensors.ZimSMART,
        sensors.Tromso,
        sensors.Kiruna,
        sensors.Sodankyla,
        sensors.Svalbard,
      ],
      topLinks: [
        {
          name: 'All ESOC Sensors',
          dataSensor: 'esocAll',
          badge: 'ESA',
        },
      ],
    });
  }

  static leoLabsSensors_() {
    return this.createSection({
      header: 'Leo Labs Sensors',
      sensors: [sensors.LEOCRSR, sensors.LEOAZORES, sensors.LEOKSR, sensors.LEOPFISR, sensors.LEOMSR],
      topLinks: [
        {
          name: 'All Leo Labs Sensors',
          dataSensor: 'llAll',
          badge: 'LEOLABS',
        },
      ],
    });
  }

  static otherSensors_() {
    return this.createSection({
      header: 'Other Sensors',
      sensors: [sensors.ROC, sensors.MLS, sensors.PO, sensors.LSO, sensors.MAY],
      topLinks: [],
    });
  }

  static russianSensors_() {
    return this.createSection({
      header: 'Russian Sensors',
      sensors: [
        sensors.OLED,
        sensors.OLEV,
        sensors.PEC,
        sensors.MISD,
        sensors.MISV,
        sensors.LEKV,
        sensors.ARMV,
        sensors.KALV,
        sensors.BARV,
        sensors.YENV,
        sensors.ORSV,
        sensors.STO,
        sensors.NAK,
      ],
      topLinks: [
        {
          name: 'All Russian Sensors',
          dataSensor: 'rusAll',
          badge: 'RUS',
        },
      ],
    });
  }

  static chineseSensors_() {
    return this.createSection({
      header: 'Chinese Sensors',
      sensors: [sensors.SHD, sensors.HEI, sensors.ZHE, sensors.XIN, sensors.PMO],
      topLinks: [
        {
          name: 'All Chinese Sensors',
          dataSensor: 'prcAll',
          badge: 'PRC',
        },
      ],
    });
  }

  static reloadLastSensor() {
    const json = PersistenceManager.getInstance().getItem(StorageKey.CURRENT_SENSOR);
    if (!json) return;
    const currentSensor = JSON.parse(json);
    // istanbul ignore next
    if (currentSensor !== null) {
      try {
        const sensorManagerInstance = keepTrackApi.getSensorManager();

        // If there is a staticnum set use that
        if (typeof currentSensor[0] == 'undefined' || currentSensor[0] == null) {
          sensorManagerInstance.setSensor(null, currentSensor[1]);
          LegendManager.change('default');
          // If the sensor is a string, load that collection of sensors
        } else if (typeof currentSensor[0].objName == 'undefined') {
          sensorManagerInstance.setSensor(currentSensor[0], currentSensor[1]);
          LegendManager.change('default');
        } else {
          // Seems to be a single sensor without a staticnum, load that
          sensorManagerInstance.setSensor(sensors[currentSensor[0].objName], currentSensor[1]);
          LegendManager.change('default');
        }
      } catch {
        PersistenceManager.getInstance().removeItem(StorageKey.CURRENT_SENSOR);
      }
    }
  }

  resetSensorButtonClick() {
    if (!this.isMenuButtonActive) return;

    getEl('menu-sensor-info')?.classList.add('bmenu-item-disabled');
    getEl('menu-fov-bubble')?.classList.add('bmenu-item-disabled');
    getEl('menu-surveillance')?.classList.add('bmenu-item-disabled');
    getEl('menu-planetarium')?.classList.add('bmenu-item-disabled');
    getEl('menu-astronomy')?.classList.add('bmenu-item-disabled');
    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      keepTrackApi.getPlugin(Planetarium)?.setBottomIconToUnselected();
      keepTrackApi.getMainCamera().isPanReset = true;
      keepTrackApi.getMainCamera().isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6;
      keepTrackApi.getRenderer().glInit();
      const uiManagerInstance = keepTrackApi.getUiManager();
      uiManagerInstance.hideSideMenus();
      const orbitManagerInstance = keepTrackApi.getOrbitManager();
      orbitManagerInstance.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
      keepTrackApi.getMainCamera().cameraType = CameraType.DEFAULT; // Back to normal Camera Mode
      // TODO: implement fov information
      // getEl('fov-text').innerHTML = ('');
      getEl('menu-planetarium').classList.remove('bmenu-item-selected');
    }
  }
}

export const sensorListPlugin = new SensorListPlugin();
