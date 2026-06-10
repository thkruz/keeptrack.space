import { CameraType } from '@app/engine/camera/camera-type';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { keepTrackApi } from '@app/keepTrackApi';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import gpsPng from '@public/img/icons/gps.png';

import { CatalogManager } from '@app/app/data/catalog-manager';
import type { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType } from '@app/app/data/object-group';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { DopMath, ElevationMaskFn } from '@app/engine/math/dop-math';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { Degrees, Kilometers, Satellite, TemeVec3, eci2lla } from '@ootk/src/main';
import './dops.css';

export class DopsPlugin extends KeepTrackPlugin {
  readonly id = 'DopsPlugin';
  dependencies_ = [];

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-dops',
      label: t7e('plugins.DopsPlugin.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: gpsPng,
      menuMode: [MenuMode.SENSORS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'dops-menu',
      title: t7e('plugins.DopsPlugin.title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  protected getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 550,
      maxWidth: 800,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.DopsPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.DopsPlugin.help.overview'),
          image: {
            src: 'img/help/dops/dops-menu.png',
            alt: t7e('plugins.DopsPlugin.help.imgAlt'),
            caption: t7e('plugins.DopsPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.DopsPlugin.help.valuesHeading'),
          content: t7e('plugins.DopsPlugin.help.values'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.DopsPlugin.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.DopsPlugin.help.tip1'),
        t7e('plugins.DopsPlugin.help.tip2'),
        t7e('plugins.DopsPlugin.help.tip3'),
      ],
      shortcuts: [{ keys: ['D'], description: t7e('plugins.DopsPlugin.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'D',
        callback: () => {
          if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
 return;
}
          this.bottomMenuClicked();
        },
      },
    ];
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  protected buildSideMenuHtml_(): string {
    return html`
    <div id="dops-menu" class="side-menu-parent start-hidden">
      <div id="dops-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">${t7e('plugins.DopsPlugin.title')}</h5>
        </div>
        <form id="dops-form">
          <div class="switch row">
            <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="${t7e('plugins.DopsPlugin.tooltips.latitude')}">
              <input value="41" id="dops-lat" type="text">
              <label for="dops-lat" class="active">${t7e('plugins.DopsPlugin.labels.latitude')}</label>
            </div>
            <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="${t7e('plugins.DopsPlugin.tooltips.longitude')}">
              <input value="-71" id="dops-lon" type="text">
              <label for="dops-lon" class="active">${t7e('plugins.DopsPlugin.labels.longitude')}</label>
            </div>
            <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="${t7e('plugins.DopsPlugin.tooltips.altitude')}">
              <input value="0" id="dops-alt" type="text">
              <label for="dops-alt" class="active">${t7e('plugins.DopsPlugin.labels.altitude')}</label>
            </div>
            <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="${t7e('plugins.DopsPlugin.tooltips.mask')}">
              <input value="15" id="dops-el" type="text">
              <label for="dops-el" class="active">${t7e('plugins.DopsPlugin.labels.mask')}</label>
            </div>
          </div>
          <div class="row center">
            <button id="dops-submit" class="btn btn-ui waves-effect waves-light" type="submit"
              name="action">${t7e('plugins.DopsPlugin.labels.updateDopData')} &#9658;
            </button>
          </div>
        </form>
      <div class="row">
        <table id="dops" class="center-align striped-light centered"></table>
      </div>
    </div>`;
  }

  // =========================================================================
  // Legacy bridges
  // =========================================================================

  bottomIconCallback = (): void => {
    if (this.isMenuButtonActive) {
      showLoading(() => this.updateSideMenu());
    }
  };

  // =========================================================================
  // Context menu
  // =========================================================================

  rmbL1ElementName = 'dops-rmb';
  rmbL1Html = html`
  <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">${t7e('plugins.DopsPlugin.rmb.dops')} &#x27A4;</a></li>
`;

  isRmbOnEarth = true;
  isRmbOffEarth = false;
  isRmbOnSat = false;

  rmbL2ElementName = 'dops-rmb-menu';
  rmbL2Html = html`
  <ul class='dropdown-contents'>
    <li id="dops-curdops-rmb"><a href="#">${t7e('plugins.DopsPlugin.rmb.currentGpsDops')}</a></li>
    <li id="dops-24dops-rmb"><a href="#">${t7e('plugins.DopsPlugin.rmb.twentyFourHourGpsDops')}</a></li>
  </ul>
`;

  rmbCallback = (targetId: string): void => {
    switch (targetId) {
      case 'dops-curdops-rmb': {
        {
          const inputManager = ServiceLocator.getInputManager();
          let latLon = inputManager.mouse.latLon;
          const dragPosition = inputManager.mouse.dragPosition;

          if (typeof latLon === 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
            errorManagerInstance.debug('latLon undefined!');
            const gmst = ServiceLocator.getTimeManager().gmst;

            latLon = eci2lla(
              {
                x: dragPosition[0],
                y: dragPosition[1],
                z: dragPosition[2],
              } as TemeVec3,
              gmst,
            );
          }
          const gpsSatObjects = DopsPlugin.getGpsSats(ServiceLocator.getCatalogManager(), ServiceLocator.getGroupsManager());
          const gpsDOP = DopMath.getDops(ServiceLocator.getTimeManager().simulationTimeObj, gpsSatObjects, latLon.lat, latLon.lon, <Kilometers>0, this.getElevationMask_());

          keepTrackApi
            .getUiManager()
            .toast(
              t7e('plugins.DopsPlugin.toast.dopValues')
                .replace('{hdop}', gpsDOP.hdop)
                .replace('{vdop}', gpsDOP.vdop)
                .replace('{pdop}', gpsDOP.pdop)
                .replace('{gdop}', gpsDOP.gdop)
                .replace('{tdop}', gpsDOP.tdop),
              ToastMsgType.normal,
              true,
            );
        }
        break;
      }
      case 'dops-24dops-rmb': {
        const latLon = ServiceLocator.getInputManager().mouse.latLon;

        if (typeof latLon === 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
          errorManagerInstance.warn(t7e('plugins.DopsPlugin.errorMsgs.invalidLocation'));

          return;
        }

        if (!this.isMenuButtonActive) {
          (<HTMLInputElement>getEl('dops-lat')).value = latLon.lat.toFixed(3);
          (<HTMLInputElement>getEl('dops-lon')).value = latLon.lon.toFixed(3);
          (<HTMLInputElement>getEl('dops-alt')).value = '0';
          (<HTMLInputElement>getEl('dops-el')).value = settingsManager.gpsElevationMask.toString();
          this.bottomMenuClicked();
        } else {
          showLoading(() => this.updateSideMenu());
          this.setBottomIconToEnabled();
          break;
        }
      }
        break;
      default:
        break;
    }
  };

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('dops-form')!.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          this.updateSideMenu();
        });
      },
    );
  }

  /**
   * Returns the elevation mask to use for DOP calculations.
   * Override in pro plugin to return a terrain-aware function.
   */
  protected getElevationMask_(): Degrees | ElevationMaskFn {
    return <Degrees>parseFloat((<HTMLInputElement>getEl('dops-el')).value);
  }

  protected updateSideMenu(): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const timeManagerInstance = ServiceLocator.getTimeManager();

    const lat = <Degrees>parseFloat((<HTMLInputElement>getEl('dops-lat')).value);
    const lon = <Degrees>parseFloat((<HTMLInputElement>getEl('dops-lon')).value);
    const alt = <Kilometers>parseFloat((<HTMLInputElement>getEl('dops-alt')).value);
    const el = this.getElevationMask_();

    if (typeof el === 'number') {
      settingsManager.gpsElevationMask = el;
    }
    const gpsSats = DopsPlugin.getGpsSats(catalogManagerInstance, groupManagerInstance);
    const getOffsetTimeObj = (now: number) => timeManagerInstance.getOffsetTimeObj(now);
    const dopsList = DopMath.getDopsList(getOffsetTimeObj, gpsSats, lat, lon, alt, el);

    DopMath.updateDopsTable(dopsList);
  }

  static getGpsSats(catalogManagerInstance: CatalogManager, groupManagerInstance: GroupsManager): Satellite[] {
    if (!groupManagerInstance.groupList.GPSGroup) {
      groupManagerInstance.groupList.GPSGroup = groupManagerInstance.createGroup(GroupType.NAME_REGEX, /NAVSTAR/iu, 'GPSGroup');
    }
    const gpsSats = groupManagerInstance.groupList.GPSGroup;
    const gpsSatObjects = [] as Satellite[];

    gpsSats.ids.forEach((id: number) => {
      const sat = catalogManagerInstance.getSat(id);

      if (sat) {
        gpsSatObjects.push(sat);
      }
    });

    return gpsSatObjects;
  }
}
