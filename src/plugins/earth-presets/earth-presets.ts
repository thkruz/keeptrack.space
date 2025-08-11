import { keepTrackApi } from '@app/keepTrackApi';

import { AtmosphereSettings, EarthTextureStyle } from '@app/singletons/draw-manager/earth';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { NightToggle } from '../night-toggle/night-toggle';

export class EarthPresetsPlugin extends KeepTrackPlugin {
  readonly id = 'EarthPresetsPlugin';
  dependencies_ = [];

  rmbL1ElementName = 'earth-rmb';
  rmbL1Html = keepTrackApi.html`<li class="rmb-menu-item" id="${this.rmbL1ElementName}"><a href="#">Earth Style &#x27A4;</a></li>`;
  rmbL2ElementName = 'earth-rmb-menu';
  rmbL2Html = keepTrackApi.html`
  <ul class='dropdown-contents'>
    <li id="earth-satellite-rmb"><a href="#">Satellite Images</a></li>
    <li id="earth-engineer-rmb"><a href="#">Engineering Tool</a></li>
    <li id="earth-opscenter-rmb"><a href="#">Operations Center</a></li>
    <li id="earth-90sGraphics-rmb"><a href="#">90s Graphics</a></li>
  </ul>
  `;
  rmbMenuOrder = 15;
  isRmbOnEarth = true;
  isRmbOffEarth = false;
  isRmbOnSat = false;

  rmbCallback = (targetId: string): void => {
    switch (targetId) {
      case 'earth-satellite-rmb':
        keepTrackApi.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.BLUE_MARBLE);
        settingsManager.isDrawCloudsMap = true;
        settingsManager.isDrawBumpMap = true;
        settingsManager.isDrawSpecMap = true;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.ON;
        settingsManager.isEarthAmbientLighting = true;
        keepTrackApi.getPlugin(NightToggle)?.setBottomIconToUnselected();
        keepTrackApi.getPlugin(NightToggle)?.off();
        break;
      case 'earth-engineer-rmb':
        keepTrackApi.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.BLUE_MARBLE);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        keepTrackApi.getPlugin(NightToggle)?.on();
        break;
      case 'earth-opscenter-rmb':
        keepTrackApi.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.FLAT);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = true;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        keepTrackApi.getPlugin(NightToggle)?.on();
        break;
      case 'earth-90sGraphics-rmb':
        keepTrackApi.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.FLAT);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        keepTrackApi.getPlugin(NightToggle)?.on();
        break;
      default:
        break;
    }
  };
}
