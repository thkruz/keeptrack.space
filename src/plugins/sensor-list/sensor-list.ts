import { sensors } from '@app/app/data/catalogs/sensors';
import { CameraType } from '@app/engine/camera/camera';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getClass } from '@app/engine/utils/get-class';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { BaseObject, DetailedSatellite, DetailedSensor, ZoomValue } from '@ootk/src/main';
import sensorPng from '@public/img/icons/sensor.png';
import { SensorGroup, sensorGroups } from '../../app/data/catalogs/sensor-groups';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { DateTimeManager } from '../date-time-manager/date-time-manager';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';
import { keepTrackApi } from './../../keepTrackApi';
import './sensor-list.css';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

// TODO: Add a search bar and filter for sensors

export class SensorListPlugin extends KeepTrackPlugin {
  readonly id = 'SensorListPlugin';
  dependencies_: string[] = [DateTimeManager.name];
  private readonly sensorGroups_: SensorGroup[] = sensorGroups;

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      if (PluginRegistry.getPluginByName('Planetarium')?.isMenuButtonActive) {
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
    html`
    <div id="sensor-list-menu" class="side-menu-parent start-hidden text-select">
        <div id="sensor-list-content" class="side-menu">
        <div class="row">
          <ul id="reset-sensor-text" class="sensor-reset-menu">
            <button id="reset-sensor-button" class="center-align btn btn-ui waves-effect waves-light menu-selectable" type="button" disabled>Reset Sensor &#9658;</button>
          </ul>
          <ul id="list-of-sensors">` +
    this.sensorGroups_.map((sensorGroup) => this.genericSensors_(sensorGroup.name)).join('') +
    html`
          </ul>
        </div>
      </div>
    </div>`;

  isSensorLinksAdded = false;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        getEl('nav-top-left')?.insertAdjacentHTML(
          'beforeend',
          html`
          <div id="sensor-selected-container" class="start-hidden">
            <div id="sensor-selected" class="waves-effect waves-light">

            </div>
          </div>
          `,
        );
      },
    );
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('sensor-selected-container')?.addEventListener('click', () => {
          this.bottomIconCallback();
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
            ServiceLocator.getSensorManager().resetSensorSelected();
            ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

            return;
          }

          ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
          const sensorClick = realTarget.dataset.sensor;

          this.sensorListContentClick(sensorClick ?? '');
        });
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (!obj?.isSatellite()) {
          hideEl('sensors-in-fov-link');

          return;
        }

        showEl('sensors-in-fov-link');

        if (PluginRegistry.getPlugin(SatInfoBox) !== null && !this.isSensorLinksAdded) {
          getEl('actions-section')?.insertAdjacentHTML(
            'beforeend',
            html`
                  <div id="sensors-in-fov-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
                        data-tooltip="Visualize Sensor Coverage">Show All Sensors with FOV...</div>
                `,
          );
          getEl('sensors-in-fov-link')?.addEventListener('click', () => {
            ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);

            const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

            if (!selectSatManagerInstance) {
              return;
            }

            const sat = selectSatManagerInstance.getSelectedSat();

            if (!sat.isSatellite()) {
              return;
            }

            ServiceLocator.getLineManager().createSensorsToSatFovOnly(sat as DetailedSatellite);
          });
          this.isSensorLinksAdded = true;
        }
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.sensorDotSelected,
      (obj: BaseObject) => {
        if (settingsManager.isMobileModeEnabled) {
          return;
        }
        if (!obj.isSensor()) {
          return;
        }
        const sensor = obj as DetailedSensor;

        const sensorManagerInstance = ServiceLocator.getSensorManager();
        // No sensor manager on mobile

        sensorManagerInstance.setSensor(null, sensor.sensorId);

        if (sensorManagerInstance.currentSensors.length === 0) {
          throw new Error('No sensors found');
        }
        const timeManagerInstance = ServiceLocator.getTimeManager();

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

    EventBus.getInstance().on(
      EventBusEvent.onCruncherReady,
      () => {
        if (!settingsManager.disableUI && settingsManager.isLoadLastSensor && settingsManager.offlineMode) {
          ServiceLocator.getSensorManager().loadSensorJson();
        }
      },
    );

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean, isShift: boolean) => {
      if (key === 'Home' && !isShift && !isRepeat) {
        // If a sensor is selected rotate the camera to it
        if ((ServiceLocator.getSensorManager().currentSensors.length > 0) &&
          (ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_EARTH)) {
          const sensor = ServiceLocator.getSensorManager().currentSensors[0];

          ServiceLocator.getMainCamera().lookAtLatLon(sensor.lat, sensor.lon, sensor.zoom ?? ZoomValue.GEO, ServiceLocator.getTimeManager().selectedDate);
          ServiceLocator.getSoundManager()?.play(SoundNames.WHOOSH);
        }
      }
    });
  }

  sensorListContentClick(sensorClick: string) {
    if (!this.isMenuButtonActive) {
      return;
    }

    const sensorManagerInstance = ServiceLocator.getSensorManager();

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
    if ((PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) <= -1) {
      try {
        keepTrackApi
          .getMainCamera()
          .lookAtLatLon(
            sensorManagerInstance.currentSensors[0].lat,
            sensorManagerInstance.currentSensors[0].lon,
            sensorManagerInstance.currentSensors[0].zoom ?? ZoomValue.GEO,
            ServiceLocator.getTimeManager().selectedDate,
          );
      } catch (e) {
        // TODO: More intentional conditional statement
        errorManagerInstance.warn(`Error in sensorListContentClick: ${e}`);
        // Multi-sensors break this
      }
    }
  }

  private static createLiForSensor_(sensor: DetailedSensor) {
    return html`
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
          (link) => html`<li class="menu-selectable sensor-top-link" data-sensor="${params.name}">
              <span>${link.name}</span>
              <span class="badge dark-blue-badge" data-badge-caption="${link.badge}"></span>
            </li>`,
        )
        .join('');

      return html`
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
