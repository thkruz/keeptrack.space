import { sensors } from '@app/app/data/catalogs/sensors';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SoundNames } from '@app/engine/audio/sounds';
import { CameraType } from '@app/engine/camera/camera-type';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ICommandPaletteCapable, ICommandPaletteCommand, IHelpConfig, IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getClass } from '@app/engine/utils/get-class';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite, ZoomValue } from '@ootk/src/main';
import sensorPng from '@public/img/icons/sensor.png';
import { SensorGroup, sensorGroups } from '../../app/data/catalogs/sensor-groups';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { DateTimeManager } from '../date-time-manager/date-time-manager';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { keepTrackApi } from './../../keepTrackApi';
import './sensor-list.css';

// TODO: Add a search bar and filter for sensors

export class SensorListPlugin extends KeepTrackPlugin implements ICommandPaletteCapable {
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

  menuMode: MenuMode[] = [MenuMode.SENSORS, MenuMode.ALL];

  bottomIconImg = sensorPng;

  sideMenuElementName: string = 'sensor-list-menu';
  sideMenuElementHtml: string =
    html`
    <div id="sensor-list-menu" class="side-menu-parent start-hidden">
        <div id="sensor-list-content" class="side-menu">
        <div class="row">
          <ul id="reset-sensor-text" class="sensor-reset-menu">
            <button id="reset-sensor-button" class="center-align btn btn-ui waves-effect waves-light menu-selectable" type="button" disabled>${t7e('plugins.SensorListPlugin.buttons.resetSensor' as Parameters<typeof t7e>[0])} &#9658;</button>
          </ul>
          <ul id="list-of-sensors">` +
    this.sensorGroups_.map((sensorGroup) => this.genericSensors_(sensorGroup.name)).join('') +
    html`
          </ul>
        </div>
      </div>
    </div>`;

  isSensorLinksAdded = false;

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.SensorListPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.SensorListPlugin.help.overview'),
          image: {
            src: 'img/help/sensor-list/sensor-list-menu.png',
            alt: t7e('plugins.SensorListPlugin.help.imgAlt'),
            caption: t7e('plugins.SensorListPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.SensorListPlugin.help.sensorTypesHeading'),
          content: t7e('plugins.SensorListPlugin.help.sensorTypes'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.SensorListPlugin.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.SensorListPlugin.help.tip1'),
        t7e('plugins.SensorListPlugin.help.tip2'),
        t7e('plugins.SensorListPlugin.help.tip3'),
      ],
      shortcuts: [
        { keys: ['S'], description: t7e('plugins.SensorListPlugin.help.shortcutToggle') },
        { keys: ['Ctrl', 'Home'], description: t7e('plugins.SensorListPlugin.help.shortcutCamera') },
      ],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'S',
        callback: () => {
          if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
            return;
          }
          this.bottomMenuClicked();
        },
      },
      {
        key: 'Home',
        ctrl: true,
        callback: () => {
          if ((ServiceLocator.getSensorManager().currentSensors.length > 0) &&
            (ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_EARTH)) {
            const sensor = ServiceLocator.getSensorManager().currentSensors[0];

            ServiceLocator.getMainCamera().lookAtLatLon(sensor.lat, sensor.lon, sensor.zoom ?? ZoomValue.GEO, ServiceLocator.getTimeManager().selectedDate);
            ServiceLocator.getSoundManager()?.play(SoundNames.WHOOSH);
          }
        },
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.SensorListPlugin.commands.category' as Parameters<typeof t7e>[0]);

    const sensorCommands: ICommandPaletteCommand[] = Object.entries(sensors).map(([key, sensor]) => ({
      id: `SensorListPlugin.setSensor.${key}`,
      label: t7e('plugins.SensorListPlugin.commands.setSensor' as Parameters<typeof t7e>[0]).replace('{name}', `${sensor.uiName}`),
      category,
      callback: () => {
        const sm = ServiceLocator.getSensorManager();

        sm.clearSecondarySensors();
        sm.setSensor(sensor);

        if ((PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) <= -1) {
          try {
            keepTrackApi
              .getMainCamera()
              .lookAtLatLon(
                sm.currentSensors[0].lat,
                sm.currentSensors[0].lon,
                sm.currentSensors[0].zoom ?? ZoomValue.GEO,
                ServiceLocator.getTimeManager().selectedDate,
              );
          } catch {
            // Multi-sensor groups may fail
          }
        }
      },
    }));

    const groupCommands: ICommandPaletteCommand[] = this.sensorGroups_.map((group) => ({
      id: `SensorListPlugin.setSensorGroup.${group.name}`,
      label: t7e('plugins.SensorListPlugin.commands.setSensorGroup' as Parameters<typeof t7e>[0]).replace('{name}', group.header),
      category,
      callback: () => {
        const sm = ServiceLocator.getSensorManager();

        sm.clearSecondarySensors();
        sm.setSensor(group.name);

        if ((PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) <= -1) {
          try {
            keepTrackApi
              .getMainCamera()
              .lookAtLatLon(
                sm.currentSensors[0].lat,
                sm.currentSensors[0].lon,
                sm.currentSensors[0].zoom ?? ZoomValue.GEO,
                ServiceLocator.getTimeManager().selectedDate,
              );
          } catch {
            // Multi-sensor groups may fail
          }
        }
      },
    }));

    return [...groupCommands, ...sensorCommands];
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        getEl('nav-top-center')?.insertAdjacentHTML(
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
          this.bottomMenuClicked();
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
                        data-tooltip="${t7e('plugins.SensorListPlugin.labels.tooltipSensorsInFov' as Parameters<typeof t7e>[0])}">${t7e('plugins.SensorListPlugin.buttons.showSensorsWithFov' as Parameters<typeof t7e>[0])}</div>
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

            ServiceLocator.getLineManager().createSensorsToSatFovOnly(sat as Satellite);
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
    const missingData = t7e('plugins.SensorListPlugin.labels.missingData' as Parameters<typeof t7e>[0]);

    return html`
      <li class="menu-selectable" data-sensor="${sensor.objName ?? 'Missing Data'}">
        <span>${sensor.uiName ?? missingData}</span>
        <span>${sensor.system ?? missingData}</span>
        <span class="badge dark-blue-badge" data-badge-caption="${sensor.operator ?? missingData}"></span>
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
