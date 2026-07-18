import { sensors } from '@app/app/data/catalogs/sensors';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SoundNames } from '@app/engine/audio/sounds';
import { CameraType } from '@app/engine/camera/camera-type';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { StorageKey } from '@app/engine/persistence/storage-key';
import {
  ICommandPaletteCapable, ICommandPaletteCommand, IContextMenuConfig, IHelpConfig, IKeyboardShortcut, RmbMenuContext,
} from '@app/engine/plugins/core/plugin-capabilities';
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
    <div id="sensor-list-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="sensor-list-content" class="side-menu">
          <section class="kt-section">
            <button id="reset-sensor-button" class="kt-action waves-effect menu-selectable" type="button" disabled>
              <span class="kt-action-label">${t7e('plugins.SensorListPlugin.buttons.resetSensor' as Parameters<typeof t7e>[0])}</span>
            </button>
          </section>
          <div id="list-of-sensors">` +
    this.renderSensorCategories_() +
    html`
          </div>
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

  /**
   * Right-clicking a sensor dot activates that sensor - the map equivalent of
   * picking it from the sensor list menu.
   */
  getContextMenuConfig(): IContextMenuConfig {
    return {
      level1ElementName: 'use-sensor-rmb',
      level1Html: html`<li class="rmb-menu-item" id="use-sensor-rmb"><a href="#">${t7e('plugins.SensorListPlugin.rmbMenu.useThisSensor' as Parameters<typeof t7e>[0])}</a></li>`,
      order: 3,
      isVisible: (ctx: RmbMenuContext) => ctx.target instanceof DetailedSensor,
    };
  }

  onContextMenuAction(targetId: string, clickedSatId?: number): void {
    if (targetId !== 'use-sensor-rmb') {
      return;
    }

    const obj = ServiceLocator.getCatalogManager().getObject(clickedSatId ?? -1);

    if (!(obj instanceof DetailedSensor)) {
      return;
    }

    const sm = ServiceLocator.getSensorManager();

    sm.clearSecondarySensors();
    sm.setSensor(obj, obj.sensorId ?? null);
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
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

          const markGroup = realTarget.dataset.markGroup;

          if (markGroup) {
            this.toggleSensorGroupMarkers_(markGroup);

            return;
          }

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
        if (!settingsManager.disableUI && settingsManager.isLoadLastSensor) {
          ServiceLocator.getSensorManager().loadSensorJson();
        }
      },
    );

    // Account sync applied a cloud-newer sensor selection: re-apply it
    EventBus.getInstance().on(EventBusEvent.remoteSettingsApplied, (changedKeys) => {
      if (changedKeys.includes(StorageKey.CURRENT_SENSOR)) {
        ServiceLocator.getSensorManager().loadSensorJson();
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

  /**
   * Toggle short vertical marker lines above every sensor in a group so their
   * locations stand out on the globe. Does NOT select the sensors; the lines
   * are ordinary LineManager lines, so Clear Lines (or clicking again) removes
   * them.
   */
  private toggleSensorGroupMarkers_(groupName: string): void {
    const sensorGroup = this.sensorGroups_.find((group) => group.name === groupName);

    if (!sensorGroup) {
      errorManagerInstance.debug(`No sensor group found with name: ${groupName}`);

      return;
    }

    const lineManager = ServiceLocator.getLineManager();
    const wasMarked = lineManager.hasSensorMarkers(sensorGroup.header);

    // Markers are exclusive: only one group is marked at a time. Clear every other
    // group's markers (and reset their toggles) before drawing this one.
    this.sensorGroups_.forEach((group) => {
      if (group.name !== groupName && lineManager.hasSensorMarkers(group.header)) {
        lineManager.removeLinesByKind('sensorMarker', group.header);
        this.updateMarkToggleState_(group.name, false);
      }
    });

    if (wasMarked) {
      lineManager.removeLinesByKind('sensorMarker', sensorGroup.header);
    } else {
      const groupSensors = sensorGroup.list
        .map((sensorName) => sensors[sensorName])
        .filter((sensor): sensor is DetailedSensor => Boolean(sensor));

      lineManager.createSensorMarkers(groupSensors, sensorGroup.header);
    }

    this.updateMarkToggleState_(groupName, !wasMarked);
  }

  /** Reflect the marker on/off state on the group's header toggle (red = off, green = on). */
  private updateMarkToggleState_(groupName: string, isMarked: boolean): void {
    const toggle = getEl('sensor-list-content')?.querySelector<HTMLElement>(`.sensor-mark-toggle[data-mark-group="${groupName}"]`);

    if (!toggle) {
      return;
    }

    toggle.classList.toggle('is-marked', isMarked);
    toggle.setAttribute('aria-pressed', isMarked ? 'true' : 'false');
  }

  private static createSensorRow_(sensor: DetailedSensor) {
    const missingData = t7e('plugins.SensorListPlugin.labels.missingData' as Parameters<typeof t7e>[0]);

    return html`
      <button type="button" class="kt-action waves-effect menu-selectable sensor-row" data-sensor="${sensor.objName ?? 'Missing Data'}">
        <span class="kt-action-label">
          <span class="sensor-name">${sensor.uiName ?? missingData}</span>
          <span class="sensor-system">${sensor.system ?? missingData}</span>
        </span>
        <span class="sensor-badge">${sensor.operator ?? missingData}</span>
      </button>
    `;
  }

  /**
   * Renders all sensor groups, split into labeled categories: surveillance
   * sensors (radars/telescopes) first, then TT&C tracking networks
   * (cooperative dishes like DSN, SCN, ESTRACK). Groups without a category
   * are treated as surveillance for backwards compatibility.
   */
  private renderSensorCategories_(): string {
    const surveillanceGroups = this.sensorGroups_.filter((group) => group.category !== 'ttc');
    const ttcGroups = this.sensorGroups_.filter((group) => group.category === 'ttc');
    const renderGroups = (groups: SensorGroup[]) => groups.map((group) => this.genericSensors_(group.name)).join('');

    if (ttcGroups.length === 0 || surveillanceGroups.length === 0) {
      return renderGroups(this.sensorGroups_);
    }

    return html`
      <div class="sensor-category-label">${t7e('plugins.SensorListPlugin.labels.categorySurveillance' as Parameters<typeof t7e>[0])}</div>
      ${renderGroups(surveillanceGroups)}
      <div class="sensor-category-label">${t7e('plugins.SensorListPlugin.labels.categoryTtc' as Parameters<typeof t7e>[0])}</div>
      ${renderGroups(ttcGroups)}
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

      const markLabel = t7e('plugins.SensorListPlugin.buttons.markAll' as Parameters<typeof t7e>[0]).replace('{name}', sensorGroup.topLink.name);
      const isMarked = ServiceLocator.getLineManager().hasSensorMarkers(sensorGroup.header);
      const renderedTopLink = params.topLinks
        .map(
          (link) => html`<button type="button" class="kt-action waves-effect menu-selectable sensor-top-link" data-sensor="${params.name}">
              <span class="kt-action-label">${link.name}</span>
              <span class="sensor-badge">${link.badge}</span>
            </button>`,
        )
        .join('');

      /* Compact marker toggle pinned to the right of the group header. It draws (or
       * removes) the group's 100 km location-marker lines without touching the sensor
       * selection. Following the app status palette it reads red when off / green when
       * enabled. This is the only marker control for the SSN group, whose select-all
       * link is intentionally hidden. */
      const markToggle = html`<button type="button" class="sensor-mark-toggle menu-selectable${isMarked ? ' is-marked' : ''}"
          data-mark-group="${params.name}" kt-tooltip="${markLabel}" aria-label="${markLabel}" aria-pressed="${isMarked ? 'true' : 'false'}">
          <span class="material-icons">place</span>
        </button>`;

      return html`
        <section class="kt-section sensor-group-section" data-sensor-group="${params.name}">
          <div class="kt-section-label sensor-group-header">
            <span class="sensor-group-header-text">${params.header}</span>
            ${markToggle}
          </div>
          ${renderedTopLink}
          ${params.sensors.map((sensor) => SensorListPlugin.createSensorRow_(sensor)).join('')}
        </section>
      `;
    } catch (error) {
      errorManagerInstance.warn('Error generating HTML:', error);

      return '';
    }
  }
}
