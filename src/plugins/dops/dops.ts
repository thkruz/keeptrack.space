import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { keepTrackApi } from '@app/keepTrackApi';
import gpsPng from '@public/img/icons/gps.png';

import { CatalogManager } from '@app/app/data/catalog-manager';
import type { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType } from '@app/app/data/object-group';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { DopMath } from '@app/engine/math/dop-math';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { Degrees, DetailedSatellite, EciVec3, Kilometers, eci2lla } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class DopsPlugin extends KeepTrackPlugin {
  readonly id = 'DopsPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.EXPERIMENTAL, MenuMode.ALL];

  bottomIconImg = gpsPng;
  bottomIconCallback = (): void => {
    if (this.isMenuButtonActive) {
      showLoading(DopsPlugin.updateSideMenu);
    }
  };

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 550,
    maxWidth: 800,
  };

  helpTitle = 'Dilution of Precision (DOP) Menu';
  helpBody = html`The Dilution of Precision (DOP) Menu is used to calculate the Dilution of Precision (DOP) for a given location and elevation mask.
    <br><br>
    HDOP is the Horizontal Dilution of Precision. It is a measure of the accuracy of the horizontal position.
    <br><br>
    PDOP is the Position Dilution of Precision. It is a measure of the accuracy of the position.
    <br><br>
    GDOP is the Geometric Dilution of Precision. It is a measure of the accuracy of the position.
  `;

  sideMenuElementName = 'dops-menu';
  sideMenuElementHtml = html`
  <div id="${this.sideMenuElementName}" class="side-menu-parent start-hidden text-select">
    <div id="dops-content" class="side-menu">
      <form id="dops-form">
        <div class="switch row">
          <h5 class="center-align">DOP Table</h5>
          <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="Latitude in Degrees">
            <input value="41" id="dops-lat" type="text">
            <label for="dops-lat" class="active">Latitude</label>
          </div>
          <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="Longitude in Degrees">
            <input value="-71" id="dops-lon" type="text">
            <label for="dops-lon" class="active">Longitude</label>
          </div>
          <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="Altitude in KM">
            <input value="-71" id="dops-alt" type="text">
            <label for="dops-lon" class="active">Altitude</label>
          </div>
          <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="Minimum Elevation for GPS Lock">
            <input value="15" id="dops-el" type="text">
            <label for="dops-el" class="active">Mask</label>
          </div>
        </div>
        <div class="row center">
          <button id="dops-submit" class="btn btn-ui waves-effect waves-light" type="submit"
            name="action">Update DOP Data &#9658;
          </button>
        </div>
      </form>
    <div class="row">
      <table id="dops" class="center-align striped-light centered"></table>
    </div>
  </div>`;

  rmbL1ElementName = 'dops-rmb';
  rmbL1Html = html`
  <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">DOPs &#x27A4;</a></li>
`;

  isRmbOnEarth = true;
  isRmbOffEarth = false;
  isRmbOnSat = false;

  rmbL2ElementName = 'dops-rmb-menu';
  rmbL2Html = html`
  <ul class='dropdown-contents'>
    <li id="dops-curdops-rmb"><a href="#">Current GPS DOPs</a></li>
    <li id="dops-24dops-rmb"><a href="#">24 Hour GPS DOPs</a></li>
  </ul>
`;

  rmbCallback = (targetId: string): void => {
    switch (targetId) {
      case 'dops-curdops-rmb': {
        {
          let latLon = ServiceLocator.getInputManager().mouse.latLon;
          const dragPosition = ServiceLocator.getInputManager().mouse.dragPosition;

          if (typeof latLon === 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
            errorManagerInstance.debug('latLon undefined!');
            const gmst = ServiceLocator.getTimeManager().gmst;

            latLon = eci2lla(
              {
                x: dragPosition[0],
                y: dragPosition[1],
                z: dragPosition[2],
              } as EciVec3,
              gmst,
            );
          }
          const gpsSatObjects = DopsPlugin.getGpsSats(ServiceLocator.getCatalogManager(), ServiceLocator.getGroupsManager());
          const gpsDOP = DopMath.getDops(ServiceLocator.getTimeManager().simulationTimeObj, gpsSatObjects, latLon.lat, latLon.lon, <Kilometers>0, settingsManager.gpsElevationMask);

          keepTrackApi
            .getUiManager()
            .toast(`HDOP: ${gpsDOP.hdop}<br/>VDOP: ${gpsDOP.vdop}<br/>PDOP: ${gpsDOP.pdop}<br/>GDOP: ${gpsDOP.gdop}<br/>TDOP: ${gpsDOP.tdop}`, ToastMsgType.normal, true);
        }
        break;
      }
      case 'dops-24dops-rmb': {
        const latLon = ServiceLocator.getInputManager().mouse.latLon;

        if (typeof latLon === 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
          errorManagerInstance.warn('Please select a valid location on Earth for 24 Hour DOPs!');

          return;
        }

        if (!this.isMenuButtonActive) {
          (<HTMLInputElement>getEl('dops-lat')).value = latLon.lat.toFixed(3);
          (<HTMLInputElement>getEl('dops-lon')).value = latLon.lon.toFixed(3);
          (<HTMLInputElement>getEl('dops-alt')).value = '0';
          (<HTMLInputElement>getEl('dops-el')).value = settingsManager.gpsElevationMask.toString();
          this.bottomMenuClicked();
        } else {
          showLoading(DopsPlugin.updateSideMenu);
          this.setBottomIconToEnabled();
          break;
        }
      }
        break;
      default:
        break;
    }
  };

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('dops-form')!.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          DopsPlugin.updateSideMenu();
        });
      },
    );
  }

  static updateSideMenu(): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const timeManagerInstance = ServiceLocator.getTimeManager();

    const lat = <Degrees>parseFloat((<HTMLInputElement>getEl('dops-lat')).value);
    const lon = <Degrees>parseFloat((<HTMLInputElement>getEl('dops-lon')).value);
    const alt = <Kilometers>parseFloat((<HTMLInputElement>getEl('dops-alt')).value);
    const el = <Degrees>parseFloat((<HTMLInputElement>getEl('dops-el')).value);

    settingsManager.gpsElevationMask = el;
    const gpsSats = DopsPlugin.getGpsSats(catalogManagerInstance, groupManagerInstance);
    const getOffsetTimeObj = (now: number) => timeManagerInstance.getOffsetTimeObj(now);
    const dopsList = DopMath.getDopsList(getOffsetTimeObj, gpsSats, lat, lon, alt, el);

    DopMath.updateDopsTable(dopsList);
  }

  static getGpsSats(catalogManagerInstance: CatalogManager, groupManagerInstance: GroupsManager): DetailedSatellite[] {
    if (!groupManagerInstance.groupList.GPSGroup) {
      groupManagerInstance.groupList.GPSGroup = groupManagerInstance.createGroup(GroupType.NAME_REGEX, /NAVSTAR/iu, 'GPSGroup');
    }
    const gpsSats = groupManagerInstance.groupList.GPSGroup;
    const gpsSatObjects = [] as DetailedSatellite[];

    gpsSats.ids.forEach((id: number) => {
      const sat = catalogManagerInstance.getSat(id);

      if (sat) {
        gpsSatObjects.push(sat);
      }
    });

    return gpsSatObjects;
  }
}
