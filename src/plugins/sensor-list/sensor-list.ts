import { sensors } from '@app/catalogs/sensors';
import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { getClass } from '@app/lib/get-class';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { CameraType } from '@app/singletons/camera';
import { errorManagerInstance } from '@app/singletons/errorManager';
import sensorPng from '@public/img/icons/sensor.png';
import { BaseObject, DetailedSatellite, DetailedSensor, ZoomValue } from 'ootk';
import { SensorGroup, sensorGroups } from '../../catalogs/sensor-groups';
import { ClickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { DateTimeManager } from '../date-time-manager/date-time-manager';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';
import { InputEventType, keepTrackApi } from './../../keepTrackApi';
import './sensor-list.css';

// TODO: Add a search bar and filter for sensors

export class SensorListPlugin extends KeepTrackPlugin {
  readonly id = 'SensorListPlugin';
  dependencies_: string[] = [DateTimeManager.name];
  private readonly sensorGroups_: SensorGroup[] = sensorGroups;

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      if (keepTrackApi.getPluginByName('Planetarium')?.isMenuButtonActive) {
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

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 550,
    maxWidth: 800,
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = sensorPng;

  sideMenuElementName: string = 'sensor-list-menu';
  sideMenuElementHtml: string =
    keepTrackApi.html`
    <div id="sensor-list-menu" class="side-menu-parent start-hidden text-select">
        <div id="sensor-list-content" class="side-menu">
        <div class="row">
          <ul id="reset-sensor-text" class="sensor-reset-menu">
            <button id="reset-sensor-button" class="center-align btn btn-ui waves-effect waves-light menu-selectable" type="button" disabled>Reset Sensor &#9658;</button>
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

    keepTrackApi.on(
      KeepTrackApiEvents.uiManagerInit,
      () => {
        getEl('nav-mobile')?.insertAdjacentHTML(
          'beforeend',
          keepTrackApi.html`
          <div id="sensor-selected-container" class="start-hidden">
            <div id="sensor-selected" class="waves-effect waves-light">

            </div>
          </div>
          `,
        );
      },
    );
    keepTrackApi.on(
      KeepTrackApiEvents.uiManagerFinal,
      () => {
        getEl('sensor-selected-container')?.addEventListener('click', () => {
          keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, this.bottomIconElementName);
          keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);
        });

        getEl('sensor-list-content')?.addEventListener('click', (e: Event) => {
          let realTarget = e.target as HTMLElement | null | undefined;

          if (!realTarget?.classList.contains('menu-selectable')) {
            realTarget = realTarget?.closest('.menu-selectable');
            if (!realTarget?.classList.contains('menu-selectable')) {
              return;
            }
          }

          if (realTarget.id === 'reset-sensor-button') {
            keepTrackApi.getSensorManager().resetSensorSelected();
            keepTrackApi.getSoundManager()?.play(SoundNames.MENU_BUTTON);

            return;
          }

          keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);
          const sensorClick = realTarget.dataset.sensor;

          this.sensorListContentClick(sensorClick ?? '');
        });
      },
    );

    keepTrackApi.on(
      KeepTrackApiEvents.selectSatData,
      (obj: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (!obj?.isSatellite()) {
          hideEl('sensors-in-fov-link');

          return;
        }

        showEl('sensors-in-fov-link');

        if (keepTrackApi.getPlugin(SatInfoBox) !== null && !this.isSensorLinksAdded) {
          getEl('actions-section')?.insertAdjacentHTML(
            'beforeend',
            keepTrackApi.html`
                  <div id="sensors-in-fov-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
                        data-tooltip="Visualize Sensor Coverage">Show All Sensors with FOV...</div>
                `,
          );
          getEl('sensors-in-fov-link')?.addEventListener('click', () => {
            keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);

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
    );
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.on(
      KeepTrackApiEvents.sensorDotSelected,
      (obj: BaseObject) => {
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
            sensorManagerInstance.currentSensors[0].zoom ?? ZoomValue.GEO,
            timeManagerInstance.selectedDate,
          );
      },
    );

    keepTrackApi.on(
      KeepTrackApiEvents.onCruncherReady,
      () => {
        if (!settingsManager.disableUI && settingsManager.isLoadLastSensor && settingsManager.offlineMode) {
          keepTrackApi.getSensorManager().loadSensorJson();
        }
      },
    );

    keepTrackApi.on(InputEventType.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === 'Home' && !isRepeat) {
        // If a sensor is selected rotate the camera to it
        if ((keepTrackApi.getSensorManager().currentSensors.length > 0) &&
          (keepTrackApi.getMainCamera().cameraType === CameraType.DEFAULT)) {
          const sensor = keepTrackApi.getSensorManager().currentSensors[0];

          keepTrackApi.getMainCamera().lookAtLatLon(sensor.lat, sensor.lon, sensor.zoom ?? ZoomValue.GEO, keepTrackApi.getTimeManager().selectedDate);
          keepTrackApi.getSoundManager()?.play(SoundNames.WHOOSH);
        }
      }
    });
  }

  sensorListContentClick(sensorClick: string) {
    if (!this.isMenuButtonActive) {
      return;
    }

    const sensorManagerInstance = keepTrackApi.getSensorManager();

    if (sensorClick === '') {
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
    if ((keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) <= -1) {
      try {
        keepTrackApi
          .getMainCamera()
          .lookAtLatLon(
            sensorManagerInstance.currentSensors[0].lat,
            sensorManagerInstance.currentSensors[0].lon,
            sensorManagerInstance.currentSensors[0].zoom ?? ZoomValue.GEO,
            keepTrackApi.getTimeManager().selectedDate,
          );
      } catch (e) {
        // TODO: More intentional conditional statement
        errorManagerInstance.warn(`Error in sensorListContentClick: ${e}`);
        // Multi-sensors break this
      }
    }
  }

  private static createLiForSensor_(sensor: DetailedSensor) {
    return keepTrackApi.html`
      <li class="menu-selectable" data-sensor="${sensor.objName ?? 'Missing Data'}">
        <span>${sensor.uiName ?? 'Missing Data'}</span>
        <span>${sensor.system ?? 'Missing Data'}</span>
        <span class="badge dark-blue-badge" data-badge-caption="${sensor.operator ?? 'Missing Data'}"></span>
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
      errorManagerInstance.warn('Error generating HTML:', error);

      return '';
    }
  }
}
