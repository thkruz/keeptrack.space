import { LaunchSite } from '@app/app/data/catalog-manager/LaunchFacility';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { GetSatType, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { IContextMenuCapable, IContextMenuConfig, RmbMenuContext } from '@app/engine/plugins/core/plugin-capabilities';
import { openColorbox } from '@app/engine/utils/colorbox';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { hideEl, showEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { eci2lla, Satellite } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SensorInfoPlugin } from '../sensor/sensor-info-plugin';

export class ViewInfoRmbPlugin extends KeepTrackPlugin implements IContextMenuCapable {
  readonly id = 'ViewInfoRmbPlugin';
  dependencies_ = [];

  private t_(key: string): string {
    return t7e(`plugins.ViewInfoRmbPlugin.${key}` as Parameters<typeof t7e>[0]);
  }

  getContextMenuConfig(): IContextMenuConfig {
    const m = (key: string) => this.t_(`rmbMenu.${key}`);

    return {
      level1ElementName: 'view-rmb',
      level1Html: html`<li class="rmb-menu-item" id="view-rmb"><a href="#">${this.t_('rmbMenu.title')} &#x27A4;</a></li>`,
      level2ElementName: 'view-rmb-menu',
      level2Html: html`
        <ul class='dropdown-contents'>
          <li id="view-info-rmb"><a href="#">${m('earthInfo')}</a></li>
          <li id="view-sensor-info-rmb"><a href="#">${m('sensorInfo')}</a></li>
          <li id="view-launchsite-info-rmb"><a href="#">${m('launchSiteInfo')}</a></li>
          <li id="view-related-sats-rmb"><a href="#">${m('relatedSatellites')}</a></li>
        </ul>
      `,
      order: 1,
      isVisible: (ctx: RmbMenuContext) => ViewInfoRmbPlugin.hasAnyInfo_(ctx),
    };
  }

  /** At least one submenu row applies to this click. */
  private static hasAnyInfo_(ctx: RmbMenuContext): boolean {
    return ctx.surface === 'earth' || ctx.target instanceof Satellite || ctx.target instanceof DetailedSensor || ctx.target instanceof LaunchSite;
  }

  onContextMenuOpen(ctx: RmbMenuContext): void {
    const toggle = (elementId: string, isShown: boolean) => (isShown ? showEl(elementId) : hideEl(elementId));

    toggle('view-info-rmb', ctx.surface === 'earth');
    toggle('view-related-sats-rmb', ctx.target instanceof Satellite);
    toggle('view-sensor-info-rmb', ctx.target instanceof DetailedSensor);
    toggle('view-launchsite-info-rmb', ctx.target instanceof LaunchSite);
  }

  onContextMenuAction(targetId: string, clickedSat?: number): void {
    switch (targetId) {
      case 'view-info-rmb':
        {
          let latLon = ServiceLocator.getInputManager().mouse.latLon;
          const dragPosition = ServiceLocator.getInputManager().mouse.dragPosition;

          if (latLon === undefined || Number.isNaN(latLon.lat) || Number.isNaN(latLon.lon)) {
            errorManagerInstance.debug('latLon undefined!');
            const gmst = ServiceLocator.getTimeManager().gmst;

            latLon = eci2lla({ x: dragPosition[0], y: dragPosition[1], z: dragPosition[2] }, gmst);
          }
          ServiceLocator.getUiManager().toast(`Lat: ${latLon.lat.toFixed(3)}<br>Lon: ${latLon.lon.toFixed(3)}`, ToastMsgType.normal, true);
        }
        break;
      case 'view-sensor-info-rmb':
        this.viewSensorInfoRmb(clickedSat);
        break;
      case 'view-launchsite-info-rmb':
        {
          const launchSite = ServiceLocator.getCatalogManager().getObject(clickedSat) as LaunchSite;

          if (launchSite === undefined || launchSite === null) {
            errorManagerInstance.warn(this.t_('errorMsgs.launchSiteNotFound'));

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
            ServiceLocator.getUiManager().toast(this.t_('errorMsgs.noRelatedSats'), ToastMsgType.serious);
          }
          const searchStr = intldes?.slice(0, 8) ?? '';

          ServiceLocator.getUiManager().doSearch(searchStr);
        }
        break;
      default:
        break;
    }
  }

  viewSensorInfoRmb(clickedSat = -1): void {
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(clickedSat);

    const sensorInfoPluginInstance = PluginRegistry.getPlugin(SensorInfoPlugin);

    if (!sensorInfoPluginInstance || clickedSat < 0) {
      return;
    }

    const firstSensor = ServiceLocator.getSensorManager().currentSensors[0];

    if (!firstSensor) {
      errorManagerInstance.warn(this.t_('errorMsgs.sensorNotFound'));

      return;
    }

    if (!sensorInfoPluginInstance.isMenuButtonActive) {
      sensorInfoPluginInstance.setBottomIconToSelected();
      sensorInfoPluginInstance.openSideMenu();
    }

    sensorInfoPluginInstance.getSensorInfo();
  }
}
