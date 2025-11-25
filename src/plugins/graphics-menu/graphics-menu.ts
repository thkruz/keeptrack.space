import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { SettingsManager } from '@app/settings/settings';
import graphicsPng from '@public/img/icons/settings.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SoundNames } from '../sounds/sounds';

/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

export class GraphicsMenuPlugin extends KeepTrackPlugin {
  readonly id = 'GraphicsMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.SETTINGS, MenuMode.ALL];

  bottomIconElementName: string = 'graphics-menu-icon';
  bottomIconImg = graphicsPng;
  sideMenuElementName: string = 'graphics-menu';
  sideMenuElementHtml: string = html`
  <div id="graphics-menu" class="side-menu-parent start-hidden text-select">
    <div id="graphics-content" class="side-menu">
      <div class="row">
        <form id="graphics-form">
          <div class="row center">
            <button id="graphics-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Graphics &#9658;</button>
          </div>
          <div class="row center">
            <button id="graphics-reset" class="btn btn-ui waves-effect waves-light" type="button" name="action">Reset to Defaults &#9658;</button>
          </div>

          <h5 class="center-align">Earth Rendering</h5>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Hide earth textures and make globe black">
              <input id="graphics-blackEarth" type="checkbox"/>
              <span class="lever"></span>
              Black Earth
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Enable grayscale earth textures">
              <input id="graphics-grayScale" type="checkbox"/>
              <span class="lever"></span>
              Grayscale Earth
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Enable ambient lighting on Earth">
              <input id="graphics-ambientLighting" type="checkbox" checked/>
              <span class="lever"></span>
              Ambient Lighting
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Draw political boundaries map">
              <input id="graphics-politicalMap" type="checkbox" checked/>
              <span class="lever"></span>
              Political Map
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Draw clouds on Earth">
              <input id="graphics-cloudsMap" type="checkbox" checked/>
              <span class="lever"></span>
              Clouds Map
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Enable specularity map">
              <input id="graphics-specMap" type="checkbox" checked/>
              <span class="lever"></span>
              Specularity Map
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Enable bump/terrain map">
              <input id="graphics-bumpMap" type="checkbox" checked/>
              <span class="lever"></span>
              Bump Map
            </label>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Atmosphere & Effects</h5>
          <div class="input-field col s12">
            <select id="graphics-atmosphere">
              <option value="0">Off</option>
              <option value="1" selected>On</option>
            </select>
            <label>Atmosphere Rendering</label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Draw Aurora effect">
              <input id="graphics-aurora" type="checkbox" checked/>
              <span class="lever"></span>
              Aurora Effect
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable godrays (improves performance)">
              <input id="graphics-disableGodrays" type="checkbox"/>
              <span class="lever"></span>
              Disable Godrays
            </label>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <select id="graphics-godraysSamples">
                <option value="24" selected>24 (Fastest)</option>
                <option value="36">36 (Balanced)</option>
                <option value="52">52 (High Quality)</option>
                <option value="80">80 (Ultra)</option>
              </select>
              <label>Godray Samples</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="0.4" id="graphics-godraysExposure" type="number" step="0.05" min="0.0" max="2.0" data-position="top" data-delay="50" data-tooltip="Godray brightness/intensity" />
              <label for="graphics-godraysExposure" class="active">Godray Exposure</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="1.8" id="graphics-godraysDensity" type="number" step="0.1" min="0.0" max="5.0" data-position="top" data-delay="50" data-tooltip="Godray density/thickness" />
              <label for="graphics-godraysDensity" class="active">Godray Density</label>
            </div>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Sun Settings</h5>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Draw the sun">
              <input id="graphics-drawSun" type="checkbox" checked/>
              <span class="lever"></span>
              Draw Sun
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Use custom sun texture">
              <input id="graphics-sunTexture" type="checkbox"/>
              <span class="lever"></span>
              Use Sun Texture
            </label>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="1.1" id="graphics-sizeOfSun" type="number" step="0.1" min="0.1" max="5.0" data-position="top" data-delay="50" data-tooltip="Size of the sun (scale factor)" />
              <label for="graphics-sizeOfSun" class="active">Sun Size</label>
            </div>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Space Background</h5>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Draw Milky Way background">
              <input id="graphics-milkyWay" type="checkbox" checked/>
              <span class="lever"></span>
              Milky Way
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Use high-resolution Milky Way texture">
              <input id="graphics-hiresMilkyWay" type="checkbox"/>
              <span class="lever"></span>
              High-Res Milky Way
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Use gray skybox instead of black">
              <input id="graphics-graySkybox" type="checkbox"/>
              <span class="lever"></span>
              Gray Skybox
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable skybox rendering">
              <input id="graphics-disableSkybox" type="checkbox"/>
              <span class="lever"></span>
              Disable Skybox
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable planet rendering">
              <input id="graphics-disablePlanets" type="checkbox"/>
              <span class="lever"></span>
              Disable Planets
            </label>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Satellite Rendering</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="5.5" id="graphics-satMinSize" type="number" step="0.5" min="1.0" max="50.0" data-position="top" data-delay="50" data-tooltip="Minimum satellite size in pixels" />
              <label for="graphics-satMinSize" class="active">Min Satellite Size</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="70.0" id="graphics-satMaxSize" type="number" step="1.0" min="10.0" max="200.0" data-position="top" data-delay="50" data-tooltip="Maximum satellite size in pixels" />
              <label for="graphics-satMaxSize" class="active">Max Satellite Size</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="12" id="graphics-vertShadersSize" type="number" step="1" min="1" max="50" data-position="top" data-delay="50" data-tooltip="Size of dot vertex shader" />
              <label for="graphics-vertShadersSize" class="active">Vertex Shader Size</label>
            </div>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Performance</h5>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Use smaller image sizes for faster loading">
              <input id="graphics-smallImages" type="checkbox"/>
              <span class="lever"></span>
              Use Small Images
            </label>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="128" id="graphics-earthLatSegs" type="number" step="16" min="32" max="256" data-position="top" data-delay="50" data-tooltip="Earth latitude segments (higher = smoother)" />
              <label for="graphics-earthLatSegs" class="active">Earth Lat Segments</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="128" id="graphics-earthLonSegs" type="number" step="16" min="32" max="256" data-position="top" data-delay="50" data-tooltip="Earth longitude segments (higher = smoother)" />
              <label for="graphics-earthLonSegs" class="active">Earth Lon Segments</label>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();
    getEl('graphics-form')?.addEventListener('change', GraphicsMenuPlugin.onFormChange_);
    getEl('graphics-form')?.addEventListener('submit', GraphicsMenuPlugin.onSubmit_);
    getEl('graphics-reset')?.addEventListener('click', GraphicsMenuPlugin.resetToDefaults);
  }

  addJs(): void {
    super.addJs();
    // Sync form with current settings
    setTimeout(() => GraphicsMenuPlugin.syncOnLoad(), 100);
  }

  static syncOnLoad() {
    const graphicsSettings = [
      { id: 'graphics-blackEarth', setting: 'isBlackEarth' },
      { id: 'graphics-grayScale', setting: 'isEarthGrayScale' },
      { id: 'graphics-ambientLighting', setting: 'isEarthAmbientLighting' },
      { id: 'graphics-politicalMap', setting: 'isDrawPoliticalMap' },
      { id: 'graphics-cloudsMap', setting: 'isDrawCloudsMap' },
      { id: 'graphics-specMap', setting: 'isDrawSpecMap' },
      { id: 'graphics-bumpMap', setting: 'isDrawBumpMap' },
      { id: 'graphics-aurora', setting: 'isDrawAurora' },
      { id: 'graphics-disableGodrays', setting: 'isDisableGodrays' },
      { id: 'graphics-drawSun', setting: 'isDrawSun' },
      { id: 'graphics-sunTexture', setting: 'isUseSunTexture' },
      { id: 'graphics-milkyWay', setting: 'isDrawMilkyWay' },
      { id: 'graphics-hiresMilkyWay', setting: 'hiresMilkWay' },
      { id: 'graphics-graySkybox', setting: 'isGraySkybox' },
      { id: 'graphics-disableSkybox', setting: 'isDisableSkybox' },
      { id: 'graphics-disablePlanets', setting: 'isDisablePlanets' },
      { id: 'graphics-smallImages', setting: 'smallImages' },
    ];

    graphicsSettings.forEach(({ id, setting }) => {
      const element = <HTMLInputElement>getEl(id);

      if (element) {
        element.checked = settingsManager[setting];
      }
    });

    // Numeric settings
    const atmosphereEl = <HTMLInputElement>getEl('graphics-atmosphere');

    if (atmosphereEl) {
      atmosphereEl.value = settingsManager.isDrawAtmosphere.toString();
    }

    const godraysSamplesEl = <HTMLInputElement>getEl('graphics-godraysSamples');

    if (godraysSamplesEl) {
      godraysSamplesEl.value = settingsManager.godraysSamples.toString();
    }

    const godraysExposureEl = <HTMLInputElement>getEl('graphics-godraysExposure');

    if (godraysExposureEl) {
      godraysExposureEl.value = settingsManager.godraysExposure.toString();
    }

    const godraysDensityEl = <HTMLInputElement>getEl('graphics-godraysDensity');

    if (godraysDensityEl) {
      godraysDensityEl.value = settingsManager.godraysDensity.toString();
    }

    const sizeOfSunEl = <HTMLInputElement>getEl('graphics-sizeOfSun');

    if (sizeOfSunEl) {
      sizeOfSunEl.value = settingsManager.sizeOfSun.toString();
    }

    const satMinSizeEl = <HTMLInputElement>getEl('graphics-satMinSize');

    if (satMinSizeEl) {
      satMinSizeEl.value = settingsManager.satShader.minSize.toString();
    }

    const satMaxSizeEl = <HTMLInputElement>getEl('graphics-satMaxSize');

    if (satMaxSizeEl) {
      satMaxSizeEl.value = settingsManager.satShader.maxSize.toString();
    }

    const vertShadersSizeEl = <HTMLInputElement>getEl('graphics-vertShadersSize');

    if (vertShadersSizeEl) {
      vertShadersSizeEl.value = settingsManager.vertShadersSize.toString();
    }

    const earthLatSegsEl = <HTMLInputElement>getEl('graphics-earthLatSegs');

    if (earthLatSegsEl) {
      earthLatSegsEl.value = settingsManager.earthNumLatSegs.toString();
    }

    const earthLonSegsEl = <HTMLInputElement>getEl('graphics-earthLonSegs');

    if (earthLonSegsEl) {
      earthLonSegsEl.value = settingsManager.earthNumLonSegs.toString();
    }
  }

  private static onFormChange_(e: Event) {
    const toggleIds = [
      'graphics-blackEarth',
      'graphics-grayScale',
      'graphics-ambientLighting',
      'graphics-politicalMap',
      'graphics-cloudsMap',
      'graphics-specMap',
      'graphics-bumpMap',
      'graphics-aurora',
      'graphics-disableGodrays',
      'graphics-drawSun',
      'graphics-sunTexture',
      'graphics-milkyWay',
      'graphics-hiresMilkyWay',
      'graphics-graySkybox',
      'graphics-disableSkybox',
      'graphics-disablePlanets',
      'graphics-smallImages',
    ];

    const targetId = (<HTMLElement>e.target)?.id;

    if (toggleIds.includes(targetId)) {
      const isChecked = (<HTMLInputElement>getEl(targetId))?.checked;

      if (isChecked) {
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      } else {
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
      }
    }
  }

  static resetToDefaults() {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    // Earth Rendering
    settingsManager.isBlackEarth = false;
    settingsManager.isEarthGrayScale = false;
    settingsManager.isEarthAmbientLighting = true;
    settingsManager.isDrawPoliticalMap = true;
    settingsManager.isDrawCloudsMap = true;
    settingsManager.isDrawSpecMap = true;
    settingsManager.isDrawBumpMap = true;

    // Atmosphere & Effects
    settingsManager.isDrawAtmosphere = 1;
    settingsManager.isDrawAurora = true;
    settingsManager.isDisableGodrays = false;
    settingsManager.godraysSamples = 24;
    settingsManager.godraysExposure = 0.4;
    settingsManager.godraysDensity = 1.8;

    // Sun Settings
    settingsManager.isDrawSun = true;
    settingsManager.isUseSunTexture = false;
    settingsManager.sizeOfSun = 1.1;

    // Space Background
    settingsManager.isDrawMilkyWay = true;
    settingsManager.hiresMilkWay = false;
    settingsManager.isGraySkybox = false;
    settingsManager.isDisableSkybox = false;
    settingsManager.isDisablePlanets = false;

    // Satellite Rendering
    settingsManager.satShader.minSize = 5.5;
    settingsManager.satShader.maxSize = 70.0;
    settingsManager.vertShadersSize = 12;

    // Performance
    settingsManager.smallImages = false;
    settingsManager.earthNumLatSegs = 128;
    settingsManager.earthNumLonSegs = 128;

    SettingsManager.preserveSettings();
    GraphicsMenuPlugin.syncOnLoad();
  }

  private static onSubmit_(e: SubmitEvent) {
    e.preventDefault();

    const uiManagerInstance = ServiceLocator.getUiManager();

    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    // Earth Rendering
    settingsManager.isBlackEarth = (<HTMLInputElement>getEl('graphics-blackEarth')).checked;
    settingsManager.isEarthGrayScale = (<HTMLInputElement>getEl('graphics-grayScale')).checked;
    settingsManager.isEarthAmbientLighting = (<HTMLInputElement>getEl('graphics-ambientLighting')).checked;
    settingsManager.isDrawPoliticalMap = (<HTMLInputElement>getEl('graphics-politicalMap')).checked;
    settingsManager.isDrawCloudsMap = (<HTMLInputElement>getEl('graphics-cloudsMap')).checked;
    settingsManager.isDrawSpecMap = (<HTMLInputElement>getEl('graphics-specMap')).checked;
    settingsManager.isDrawBumpMap = (<HTMLInputElement>getEl('graphics-bumpMap')).checked;

    // Atmosphere & Effects
    settingsManager.isDrawAtmosphere = parseInt((<HTMLInputElement>getEl('graphics-atmosphere')).value);
    settingsManager.isDrawAurora = (<HTMLInputElement>getEl('graphics-aurora')).checked;
    settingsManager.isDisableGodrays = (<HTMLInputElement>getEl('graphics-disableGodrays')).checked;

    const godraysSamples = parseInt((<HTMLInputElement>getEl('graphics-godraysSamples')).value);

    if (!isNaN(godraysSamples)) {
      settingsManager.godraysSamples = godraysSamples;
    }

    const godraysExposure = parseFloat((<HTMLInputElement>getEl('graphics-godraysExposure')).value);

    if (!isNaN(godraysExposure) && godraysExposure >= 0.0 && godraysExposure <= 2.0) {
      settingsManager.godraysExposure = godraysExposure;
    }

    const godraysDensity = parseFloat((<HTMLInputElement>getEl('graphics-godraysDensity')).value);

    if (!isNaN(godraysDensity) && godraysDensity >= 0.0 && godraysDensity <= 5.0) {
      settingsManager.godraysDensity = godraysDensity;
    }

    // Sun Settings
    settingsManager.isDrawSun = (<HTMLInputElement>getEl('graphics-drawSun')).checked;
    settingsManager.isUseSunTexture = (<HTMLInputElement>getEl('graphics-sunTexture')).checked;

    const sizeOfSun = parseFloat((<HTMLInputElement>getEl('graphics-sizeOfSun')).value);

    if (!isNaN(sizeOfSun) && sizeOfSun >= 0.1 && sizeOfSun <= 5.0) {
      settingsManager.sizeOfSun = sizeOfSun;
    }

    // Space Background
    settingsManager.isDrawMilkyWay = (<HTMLInputElement>getEl('graphics-milkyWay')).checked;
    settingsManager.hiresMilkWay = (<HTMLInputElement>getEl('graphics-hiresMilkyWay')).checked;
    settingsManager.isGraySkybox = (<HTMLInputElement>getEl('graphics-graySkybox')).checked;
    settingsManager.isDisableSkybox = (<HTMLInputElement>getEl('graphics-disableSkybox')).checked;
    settingsManager.isDisablePlanets = (<HTMLInputElement>getEl('graphics-disablePlanets')).checked;

    // Satellite Rendering
    const satMinSize = parseFloat((<HTMLInputElement>getEl('graphics-satMinSize')).value);

    if (!isNaN(satMinSize) && satMinSize >= 1.0 && satMinSize <= 50.0) {
      settingsManager.satShader.minSize = satMinSize;
    }

    const satMaxSize = parseFloat((<HTMLInputElement>getEl('graphics-satMaxSize')).value);

    if (!isNaN(satMaxSize) && satMaxSize >= 10.0 && satMaxSize <= 200.0) {
      settingsManager.satShader.maxSize = satMaxSize;
    }

    const vertShadersSize = parseInt((<HTMLInputElement>getEl('graphics-vertShadersSize')).value);

    if (!isNaN(vertShadersSize) && vertShadersSize >= 1 && vertShadersSize <= 50) {
      settingsManager.vertShadersSize = vertShadersSize;
    }

    // Performance
    settingsManager.smallImages = (<HTMLInputElement>getEl('graphics-smallImages')).checked;

    const earthLatSegs = parseInt((<HTMLInputElement>getEl('graphics-earthLatSegs')).value);

    if (!isNaN(earthLatSegs) && earthLatSegs >= 32 && earthLatSegs <= 256) {
      settingsManager.earthNumLatSegs = earthLatSegs;
    }

    const earthLonSegs = parseInt((<HTMLInputElement>getEl('graphics-earthLonSegs')).value);

    if (!isNaN(earthLonSegs) && earthLonSegs >= 32 && earthLonSegs <= 256) {
      settingsManager.earthNumLonSegs = earthLonSegs;
    }

    SettingsManager.preserveSettings();
    uiManagerInstance.toast('Graphics settings updated! Some changes may require a page refresh.', ToastMsgType.normal);
  }
}
