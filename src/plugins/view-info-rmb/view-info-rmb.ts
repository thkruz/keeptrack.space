
import { LaunchSite } from '@app/app/data/catalog-manager/LaunchFacility';
import { GetSatType, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { openColorbox } from '@app/engine/utils/colorbox';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { hideEl, showEl } from '@app/engine/utils/get-el';
import { DetailedSatellite, DetailedSensor, eci2lla } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SensorInfoPlugin } from '../sensor/sensor-info-plugin';

export class ViewInfoRmbPlugin extends KeepTrackPlugin {
  readonly id = 'ViewInfoRmbPlugin';
  dependencies_ = [];

  rmbL1ElementName = 'view-rmb';
  rmbL1Html = html`<li class="rmb-menu-item" id="view-rmb"><a href="#">View &#x27A4;</a></li>`;
  rmbL2ElementName = 'view-rmb-menu';
  rmbL2Html = html`
  <ul class='dropdown-contents'>
    <li id="view-info-rmb"><a href="#">Earth Info</a></li>
    <li id="view-sensor-info-rmb"><a href="#">Sensor Info</a></li>
    <li id="view-launchsite-info-rmb"><a href="#">Launch Site Info</a></li>
    <li id="view-sat-info-rmb"><a href="#">Satellite Info</a></li>
    <li id="view-related-sats-rmb"><a href="#">Related Satellites</a></li>
  </ul>
  `;
  rmbMenuOrder = 1;
  isRmbOnEarth = true;
  isRmbOffEarth = true;
  isRmbOnSat = true;

  rmbCallback = (targetId: string, clickedSat?: number): void => {
    switch (targetId) {
      case 'view-info-rmb':
        {
          let latLon = ServiceLocator.getInputManager().mouse.latLon;
          const dragPosition = ServiceLocator.getInputManager().mouse.dragPosition;

          if (typeof latLon === 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
            errorManagerInstance.debug('latLon undefined!');
            const gmst = ServiceLocator.getTimeManager().gmst;

            latLon = eci2lla({ x: dragPosition[0], y: dragPosition[1], z: dragPosition[2] }, gmst);
          }
          ServiceLocator.getUiManager().toast(`Lat: ${latLon.lat.toFixed(3)}<br>Lon: ${latLon.lon.toFixed(3)}`, ToastMsgType.normal, true);
        }
        break;
      case 'view-sat-info-rmb':
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(clickedSat ?? -1);
        break;
      case 'view-sensor-info-rmb':
        this.viewSensorInfoRmb(clickedSat);
        break;
      case 'view-launchsite-info-rmb':
        {
          const launchSite = ServiceLocator.getCatalogManager().getObject(clickedSat) as LaunchSite;

          if (typeof launchSite === 'undefined' || launchSite === null) {
            errorManagerInstance.warn('Launch site not found!');

            return;
          }

          if (launchSite.wikiUrl) {
            openColorbox(launchSite.wikiUrl);
          }
        }
        break;
      case 'view-related-sats-rmb':
        {
          const intldes = ServiceLocator.getCatalogManager().getSat(clickedSat ?? -1, GetSatType.EXTRA_ONLY)?.intlDes;

          if (!intldes) {
            ServiceLocator.getUiManager().toast('Time 1 is Invalid!', ToastMsgType.serious);
          }
          const searchStr = intldes?.slice(0, 8) ?? '';

          ServiceLocator.getUiManager().doSearch(searchStr);
        }
        break;
      default:
        break;
    }
  };

  addJs() {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.rightBtnMenuOpen, (_isEarth, clickedSatId) => {
      if (typeof clickedSatId === 'undefined') {
        return;
      }
      const sat = ServiceLocator.getCatalogManager().getObject(clickedSatId);

      if (sat instanceof DetailedSatellite === false) {
        hideEl('view-sat-info-rmb');
        hideEl('view-related-sats-rmb');
      } else {
        showEl('view-sat-info-rmb');
        showEl('view-related-sats-rmb');
      }

      if (sat instanceof DetailedSensor === false) {
        hideEl('view-sensor-info-rmb');
      } else {
        showEl('view-sensor-info-rmb');
      }

      if (sat instanceof LaunchSite === false) {
        hideEl('view-launchsite-info-rmb');
      } else {
        showEl('view-launchsite-info-rmb');
      }
    });
  }

  viewSensorInfoRmb(clickedSat = -1): void {
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(clickedSat);

    const sensorInfoPluginInstance = PluginRegistry.getPlugin(SensorInfoPlugin);

    if (!sensorInfoPluginInstance || clickedSat < 0) {
      return;
    }

    const firstSensor = ServiceLocator.getSensorManager().currentSensors[0];

    if (!firstSensor) {
      errorManagerInstance.warn('Sensor not found! Select a sensor first.');

      return;
    }

    if (!sensorInfoPluginInstance.isMenuButtonActive) {
      sensorInfoPluginInstance.setBottomIconToSelected();
      sensorInfoPluginInstance.openSideMenu();
    }

    sensorInfoPluginInstance.getSensorInfo();
  }
}
