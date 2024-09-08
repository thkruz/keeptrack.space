import { sensors } from '@app/catalogs/sensors';
import { KeepTrackApiEvents } from '@app/interfaces';
import { getClass } from '@app/lib/get-class';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { CameraType } from '@app/singletons/camera';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import { LegendManager } from '@app/static/legend-manager';
import radarPng from '@public/img/icons/radar.png';
import { BaseObject, DetailedSatellite, DetailedSensor } from 'ootk';
import { SensorGroup, sensorGroups } from '../../catalogs/sensor-groups';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { DateTimeManager } from '../date-time-manager/date-time-manager';
import { Planetarium } from '../planetarium/planetarium';
import { SatInfoBox } from '../select-sat-manager/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';
import { keepTrackApi } from './../../keepTrackApi';
import './sensor-list.css';

// TODO: Add a search bar and filter for sensors

export class SensorListPlugin extends KeepTrackPlugin {
  readonly id = 'SensorListPlugin';
  dependencies_: string[] = [DateTimeManager.name];
  private sensorGroups_: SensorGroup[] = sensorGroups;

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


  bottomIconImg = radarPng;

  sideMenuElementName: string = 'sensor-list-menu';
  sideMenuElementHtml: string =
    keepTrackApi.html`
    <div id="sensor-list-menu" class="side-menu-parent start-hidden text-select">
        <div id="sensor-list-content" class="side-menu">
        <div class="row">
          <ul id="reset-sensor-text" class="sensor-reset-menu">
            <button id="reset-sensor-button" class="center-align btn btn-ui waves-effect waves-light menu-selectable" type="button">Reset Sensor &#9658;</button>
          </ul>
          <ul id="list-of-sensors">` +
    this.sensorGroups_.map((sensorGroup) => this.genericSensors_(sensorGroup.name)).join('') +
    keepTrackApi.html`
          </ul>
        </div>
      </div>
    </div>`;

  isSensorLinksAdded = false;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.id,
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
      cbName: this.id,
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
      cbName: this.id,
      cb: (obj: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (!obj?.isSatellite()) {
          hideEl('sensors-in-fov-link');

          return;
        }

        showEl('sensors-in-fov-link');

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

            if (!sat.isSatellite()) {
              return;
            }

            keepTrackApi.getLineManager().createSensorsToSatFovOnly(sat as DetailedSatellite);
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
      cbName: this.id,
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
      cbName: this.id,
      cb: () => {
        if (!settingsManager.disableUI && settingsManager.isLoadLastSensor) {
          SensorListPlugin.reloadLastSensor_();
        }
      },
    });

    const keyboardManager = keepTrackApi.getInputManager().keyboard;

    keyboardManager.registerKeyUpEvent({
      key: 'Home',
      callback: () => {
        // If a sensor is selected rotate the camera to it
        if ((keepTrackApi.getSensorManager().currentSensors.length > 0) &&
          (keepTrackApi.getMainCamera().cameraType === CameraType.DEFAULT)) {
          const sensor = keepTrackApi.getSensorManager().currentSensors[0];

          keepTrackApi.getMainCamera().lookAtLatLon(sensor.lat, sensor.lon, sensor.zoom, keepTrackApi.getTimeManager().selectedDate);
          keepTrackApi.getSoundManager().play(SoundNames.WHOOSH);
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

    // Remove any secondary sensors
    sensorManagerInstance.clearSecondarySensors();

    // if sensorClick is a name in sensorGroup then load all sensors in that group
    if (this.sensorGroups_.some((sensorGroup) => sensorGroup.name === sensorClick)) {
      sensorManagerInstance.setSensor(sensorClick);
    } else {
      sensorManagerInstance.setSensor(sensors[`${sensorClick}`]);
    }

    // Deselect any satellites
    if (keepTrackApi.getPlugin(SelectSatManager).selectedSat === -1) {
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
    }
    if (settingsManager.currentColorScheme === keepTrackApi.getColorSchemeManager().default) {
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

  private genericSensors_(name: string): string {
    try {
      if (!name) {
        throw new Error('Name parameter is required');
      }

      const sensorGroup = this.sensorGroups_.find((sensorGroup: SensorGroup) => sensorGroup.name === name);

      if (!sensorGroup) {
        throw new Error(`No sensor group found with name: ${name}`);
      }

      if (!sensorGroup.header || !sensorGroup.list || !sensorGroup.topLink) {
        throw new Error(`Sensor group ${name} is missing required properties`);
      }

      const params = {
        name,
        header: sensorGroup.header,
        sensors: sensorGroup.list.map((sensorName) => {
          const sensor = sensors[sensorName];

          if (!sensor) {
            errorManagerInstance.warn(`Sensor ${sensorName} listed in sensorGroups was not found in sensors catalog!`);

            return null;
          }

          return sensor;
        }).filter((sensor) => sensor !== null),
        topLinks: [
          {
            name: sensorGroup.topLink.name,
            badge: sensorGroup.topLink.badge,
          },
        ],
      };

      if (params.sensors.length === 0) {
        throw new Error(`No sensors found for group: ${name}`);
      }

      const renderedTopLink = params.topLinks
        .map(
          (link) => keepTrackApi.html`<li class="menu-selectable sensor-top-link" data-sensor="${params.name}">
              <span>${link.name}</span>
              <span class="badge dark-blue-badge" data-badge-caption="${link.badge}"></span>
            </li>`,
        )
        .join('');

      return keepTrackApi.html`
        ${SensorListPlugin.genH5Title_(params.header)}
        ${renderedTopLink}
        ${params.sensors.map((sensor) => SensorListPlugin.createLiForSensor_(sensor)).join('')}
      `;
    } catch (error) {
      console.error('Error generating HTML:', error);

      return '';
    }
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
