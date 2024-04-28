import { sensors } from '@app/catalogs/sensors';
import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getClass } from '@app/lib/get-class';
import { getEl } from '@app/lib/get-el';
import { LineTypes } from '@app/singletons/draw-manager/line-manager';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import { LegendManager } from '@app/static/legend-manager';
import radarPng from '@public/img/icons/radar.png';
import { BaseObject, DetailedSatellite, DetailedSensor } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { DateTimeManager } from '../date-time-manager/date-time-manager';
import { Planetarium } from '../planetarium/planetarium';
import { SatInfoBox } from '../select-sat-manager/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';
import './sensor-list.css';

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
            <button id="reset-sensor-button" class="center-align btn btn-ui waves-effect waves-light menu-selectable" type="button">Reset Sensor &#9658;</button>
            <li class="divider"></li>
          </ul>
          <ul id="list-of-sensors">` +
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

  helpTitle = 'Sensors Menu';
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
        getEl('nav-mobile')?.insertAdjacentHTML(
          'beforeend',
          keepTrackApi.html`
          <div id="sensor-selected-container">
            <div id="sensor-selected" class="waves-effect waves-light">

            </div>
          </div>
          `,
        );
      },
    });
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('sensor-selected-container')?.addEventListener('click', () => {
          keepTrackApi.runEvent(KeepTrackApiEvents.bottomMenuClick, this.bottomIconElementName);
          keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);
        });

        getEl('sensor-list-content').addEventListener('click', (e: Event) => {
          let realTarget = e.target as HTMLElement | undefined;

          if (!realTarget?.classList.contains('menu-selectable')) {
            realTarget = realTarget?.closest('.menu-selectable');
            if (!realTarget?.classList.contains('menu-selectable')) {
              return;
            }
          }

          if (realTarget.id === 'reset-sensor-button') {
            keepTrackApi.getSensorManager().resetSensorSelected();
            keepTrackApi.getSoundManager().play(SoundNames.MENU_BUTTON);

            return;
          }

          keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);
          const sensorClick = realTarget.dataset.sensor;

          this.sensorListContentClick(sensorClick);
        });
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: 'sensor',
      cb: (obj: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (obj === null || typeof obj === 'undefined') {
          return;
        }

        if (keepTrackApi.getPlugin(SatInfoBox) !== null && !this.isSensorLinksAdded) {
          getEl('sat-info-top-links').insertAdjacentHTML(
            'beforeend',
            keepTrackApi.html`
                  <div id="sensors-in-fov-link" class="link sat-infobox-links" data-position="top" data-delay="50"
                        data-tooltip="Visualize Sensor Coverage">Show All Sensors with FOV...</div>
                `,
          );
          getEl('sensors-in-fov-link').addEventListener('click', () => {
            keepTrackApi.getSoundManager().play(SoundNames.CLICK);

            const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

            if (!selectSatManagerInstance) {
              return;
            }

            const sat = selectSatManagerInstance.getSelectedSat();

            if (sat.isMissile()) {
              return;
            }

            Object.keys(sensors).forEach((key) => {
              const sensor = sensors[key];
              const isInView = sensor.isSatInFov(sat as DetailedSatellite, keepTrackApi.getTimeManager().simulationTimeObj);

              if (isInView) {
                keepTrackApi.getLineManager().create(LineTypes.MULTI_SENSORS_TO_SAT, [sat.id, keepTrackApi.getCatalogManager().getSensorFromSensorName(sensor.name)], 'g');
              }
            });
          });
          this.isSensorLinksAdded = true;
        }
      },
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.sensorDotSelected,
      cbName: this.PLUGIN_NAME,
      cb: (obj: BaseObject) => {
        if (settingsManager.isMobileModeEnabled) {
          return;
        }
        if (!obj.isSensor()) {
          return;
        }
        const sensor = obj as DetailedSensor;

        const sensorManagerInstance = keepTrackApi.getSensorManager();
        // No sensor manager on mobile

        sensorManagerInstance.setSensor(null, sensor.sensorId);

        if (sensorManagerInstance.currentSensors.length === 0) {
          throw new Error('No sensors found');
        }
        const timeManagerInstance = keepTrackApi.getTimeManager();

        keepTrackApi
          .getMainCamera()
          .lookAtLatLon(
            sensorManagerInstance.currentSensors[0].lat,
            sensorManagerInstance.currentSensors[0].lon,
            sensorManagerInstance.currentSensors[0].zoom,
            timeManagerInstance.selectedDate,
          );
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherReady,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        if (!settingsManager.disableUI && settingsManager.isLoadLastSensor) {
          SensorListPlugin.reloadLastSensor_();
        }
      },
    });
  }

  sensorListContentClick(sensorClick: string) {
    if (!this.isMenuButtonActive) {
      return;
    }

    const sensorManagerInstance = keepTrackApi.getSensorManager();

    if (typeof sensorClick === 'undefined') {
      errorManagerInstance.debug('The menu item was clicked but the menu was not defined.');

      return;
    }

    switch (sensorClick) {
      case 'ssnAll':
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
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1);

    try {
      keepTrackApi
        .getMainCamera()
        .lookAtLatLon(
          sensorManagerInstance.currentSensors[0].lat,
          sensorManagerInstance.currentSensors[0].lon,
          sensorManagerInstance.currentSensors[0].zoom,
          keepTrackApi.getTimeManager().selectedDate,
        );
    } catch (e) {
      // TODO: More intentional conditional statement
      errorManagerInstance.warn(`Error in sensorListContentClick: ${e}`);
      // Multi-sensors break this
    }
    if (settingsManager.currentColorScheme == keepTrackApi.getColorSchemeManager().default) {
      LegendManager.change('default');
    }
  }

  private static createLiForSensor_(sensor: DetailedSensor) {
    return keepTrackApi.html`
      <li class="menu-selectable" data-sensor="${sensor.objName}">
        <span>${sensor.uiName}</span>
        <span>${sensor.system}</span>
        <span class="badge dark-blue-badge" data-badge-caption="${sensor.operator}"></span>
      </li>
    `;
  }

  private static ssnSensors_() {
    return this.createSection_({
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

  private static mwSensors_() {
    return this.createSection_({
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

  private static mdaSensors_() {
    return this.createSection_({
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

  private static createSection_(params: { header: string; sensors: DetailedSensor[]; topLinks: { name: string; dataSensor: string; badge: string }[] }) {
    return keepTrackApi.html`
              <li class="divider"></li>
              <h5 class="center-align">${params.header}</h5>
              <li class="divider"></li>
              ${params.topLinks
    .map(
      (link) => keepTrackApi.html`<li class="menu-selectable sensor-top-link" data-sensor="${link.dataSensor}">
                <span>${link.name}</span>
                <span class="badge dark-blue-badge" data-badge-caption="${link.badge}"></span>
              </li>`,
    )
    .join('')}
              ${params.sensors.map((sensor) => SensorListPlugin.createLiForSensor_(sensor)).join('')}
              `;
  }

  private static esocSensors_() {
    return this.createSection_({
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

  private static leoLabsSensors_() {
    return this.createSection_({
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

  private static otherSensors_() {
    return this.createSection_({
      header: 'Other Sensors',
      sensors: [sensors.ROC, sensors.MLS, sensors.PO, sensors.LSO, sensors.MAY],
      topLinks: [],
    });
  }

  private static russianSensors_() {
    return this.createSection_({
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

  private static chineseSensors_() {
    return this.createSection_({
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

  private static reloadLastSensor_() {
    const json = PersistenceManager.getInstance().getItem(StorageKey.CURRENT_SENSOR);

    if (!json) {
      return;
    }
    const currentSensor = JSON.parse(json);
    // istanbul ignore next

    if (currentSensor !== null) {
      try {
        const sensorManagerInstance = keepTrackApi.getSensorManager();

        // If there is a sensorId set use that
        if (typeof currentSensor[0] === 'undefined' || currentSensor[0] == null) {
          sensorManagerInstance.setSensor(null, currentSensor[1]);
          LegendManager.change('default');
          // If the sensor is a string, load that collection of sensors
        } else if (typeof currentSensor[0].objName === 'undefined') {
          sensorManagerInstance.setSensor(currentSensor[0], currentSensor[1]);
          LegendManager.change('default');
        } else {
          // Seems to be a single sensor without a sensorId, load that
          sensorManagerInstance.setSensor(sensors[currentSensor[0].objName], currentSensor[1]);
          LegendManager.change('default');
        }
      } catch {
        PersistenceManager.getInstance().removeItem(StorageKey.CURRENT_SENSOR);
      }
    }
  }
}
