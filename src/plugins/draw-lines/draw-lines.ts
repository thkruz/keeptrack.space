import { keepTrackApi } from '@app/keepTrackApi';

import { KeepTrackApiEvents } from '@app/interfaces';
import { hideEl } from '@app/lib/get-el';
import { MissileObject } from '@app/singletons/catalog-manager/MissileObject';
import { lineManagerInstance } from '@app/singletons/draw-manager/line-manager';
import { LineColors } from '@app/singletons/draw-manager/line-manager/line';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { DetailedSatellite } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class DrawLinesPlugin extends KeepTrackPlugin {
  readonly id = 'DrawLinesPlugin';
  dependencies_ = [];

  rmbL1ElementName = 'draw-rmb';
  rmbL1Html = keepTrackApi.html`<li class="rmb-menu-item" id="draw-rmb"><a href="#">Draw &#x27A4;</a></li>`;
  rmbL2ElementName = 'draw-rmb-menu';
  rmbL2Html = keepTrackApi.html`
  <ul class='dropdown-contents'>
    <li id="line-eci-axis-rmb"><a href="#">ECI Axes</a></li>
    <li id="line-eci-xgrid-rmb"><a href="#">X Axes Grid</a></li>
    <li id="line-eci-ygrid-rmb"><a href="#">Y Axes Grid</a></li>
    <li id="line-eci-zgrid-rmb"><a href="#">Z Axes Grid</a></li>
    <li id="line-earth-sat-rmb"><a href="#">Earth to Satellite</a></li>
    <li id="line-sensor-sat-rmb"><a href="#">Sensor to Satellite</a></li>
    <li id="line-sat-sat-rmb"><a href="#">Satellite to Satellite</a></li>
    <li id="line-sat-sun-rmb"><a href="#">Satellite to Sun</a></li>
  </ul>
  `;
  rmbMenuOrder = 5;
  isRmbOnEarth = true;
  isRmbOffEarth = true;
  isRmbOnSat = true;

  rmbCallback = (targetId: string, clickedSat?: number): void => {
    let clickSatObj: DetailedSatellite | MissileObject | null = null;
    const obj = keepTrackApi.getCatalogManager().getObject(clickedSat);

    if ((obj instanceof DetailedSatellite) || (obj instanceof MissileObject)) {
      clickSatObj = obj;
    }

    switch (targetId) {
      case 'line-eci-axis-rmb':
        lineManagerInstance.createRef2Ref([0, 0, 0], [25000, 0, 0], LineColors.RED);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 25000, 0], LineColors.GREEN);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 0, 25000], LineColors.BLUE);
        break;
      case 'line-eci-xgrid-rmb':
        lineManagerInstance.createGrid('x', [0.6, 0.2, 0.2, 1], 1);
        break;
      case 'line-eci-ygrid-rmb':
        lineManagerInstance.createGrid('y', [0.2, 0.6, 0.2, 1], 1);
        break;
      case 'line-eci-zgrid-rmb':
        lineManagerInstance.createGrid('z', [0.2, 0.2, 0.6, 1], 1);
        break;
      case 'line-earth-sat-rmb':
        lineManagerInstance.createSatToRef(clickSatObj, [0, 0, 0], LineColors.PURPLE);
        break;
      case 'line-sensor-sat-rmb':
        lineManagerInstance.createSensorToSat(keepTrackApi.getSensorManager().getSensor(), clickSatObj, LineColors.GREEN);
        break;
      case 'line-sat-sat-rmb':
        {
          const primarySatObj = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

          if (!primarySatObj) {
            errorManagerInstance.warn('No primary satellite selected for Earth to Satellite line.');

            return;
          }
          lineManagerInstance.createObjToObj(clickSatObj, primarySatObj, LineColors.BLUE);
        }
        break;
      case 'line-sat-sun-rmb':
        lineManagerInstance.createSat2Sun(clickSatObj);
        break;
      default:
        break;
    }
  };

  addJs() {
    super.addJs();

    keepTrackApi.on(KeepTrackApiEvents.rightBtnMenuOpen, (isEarth, clickedSatId) => {
      if (!isEarth) {
        hideEl('line-eci-axis-rmb');
      }

      if ((keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) === -1) {
        hideEl('line-sat-sat-rmb');
      }

      const sensorManager = keepTrackApi.getSensorManager();

      if (!sensorManager.isSensorSelected() || sensorManager.whichRadar === 'CUSTOM') {
        hideEl('line-sensor-sat-rmb');
      }

      if (clickedSatId === -1 || settingsManager.isMobileModeEnabled) {
        hideEl('line-earth-sat-rmb');
        hideEl('line-sensor-sat-rmb');
        hideEl('line-sat-sat-rmb');
        hideEl('line-sat-sun-rmb');
      }
    });
  }
}
