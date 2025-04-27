/* eslint-disable @typescript-eslint/no-explicit-any */
import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { hideLoading, showLoading } from '@app/lib/showLoading';
import { SettingsManager } from '@app/settings/settings';
import { EarthDayTextureQuality, EarthNightTextureQuality } from '@app/singletons/draw-manager/earth';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import displaySettingsPng from '@public/img/icons/display-settings.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SoundNames } from '../sounds/SoundNames';

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

export enum GodraySamples {
  OFF = -1,
  CUSTOM = -2,
  LOW = 16,
  MEDIUM = 32,
  HIGH = 64,
  ULTRA = 128,
}

export class GraphicsMenuPlugin extends KeepTrackPlugin {
  readonly id = 'GraphicsMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = displaySettingsPng;
  private readonly formPrefix_ = 'gm';
  sideMenuElementName: string = 'graphics-menu';
  sideMenuElementHtml = keepTrackApi.html`
  <div id="${this.sideMenuElementName}" class="side-menu-parent start-hidden text-select">
    <div id="${this.sideMenuElementName}-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Graphics Menu</h5>
        <form id="${this.sideMenuElementName}-form" class="col s12">
          <div class="row center"></div>
          </br>
          <div class="row center">
            <button id="${this.sideMenuElementName}-reset-btn" class="btn btn-ui waves-effect waves-light" type="button" name="action">Reset to Defaults &#9658;</button>
          </div>
          <div>
            <div class="input-field col s12">
              <select id="${this.formPrefix_}-godrays-quality">
                <option value="-1">Off</option>
                <option value="16">Low</option>
                <option value="32" selected>Medium</option>
                <option value="64">High</option>
                <option value="128">Ultra</option>
                <option value="-2">Custom</option>
              </select>
              <label>Godrays Quality</label>
            </div>
            <div class="input-field col s12 start-hidden">
              <input value="32" id="${this.formPrefix_}-godrays-samples" type="text" data-position="top" data-delay="50" data-tooltip="The number of samples for the godrays.">
              <label for="${this.formPrefix_}-godrays-samples">Godray Samples</label>
            </div>
            <div class="input-field col s12 start-hidden">
              <input value="30" id="${this.formPrefix_}-godrays-decay" type="text" data-position="top" data-delay="50" data-tooltip="The rate at which the godrays decay.">
              <label for="${this.formPrefix_}-godrays-decay">Godrays Decay</label>
            </div>
            <div class="input-field col s12 start-hidden">
              <input value="0.6" id="${this.formPrefix_}-godrays-exposure" type="text" data-position="top" data-delay="50" data-tooltip="The exposure of the godrays.">
              <label for="${this.formPrefix_}-godrays-exposure">Godrays Exposure</label>
            </div>
            <div class="input-field col s12 start-hidden">
              <input value="0.1" id="${this.formPrefix_}-godrays-density" type="text" data-position="top" data-delay="50" data-tooltip="The density of the godrays.">
              <label for="${this.formPrefix_}-godrays-density">Godrays Density</label>
            </div>
            <div class="input-field col s12 start-hidden">
              <input value="0.5" id="${this.formPrefix_}-godrays-weight" type="text" data-position="top" data-delay="50" data-tooltip="The weight of the godrays.">
              <label for="${this.formPrefix_}-godrays-weight">Godrays Weight</label>
            </div>
            <div class="input-field col s12 start-hidden">
              <input value="0.5" id="${this.formPrefix_}-godrays-illumination-decay" type="text" data-position="top" data-delay="50"
              data-tooltip="The decay of the godrays illumination.">
              <label for="${this.formPrefix_}-godrays-illumination-decay">Godrays Illumination Decay</label>
            </div>
          </div>
          <div class="input-field col s12">
            <select id="${this.formPrefix_}-earth-day-texture-quality">
              <option value="${EarthNightTextureQuality.POTATO}">Potato</option>
              <option value="${EarthNightTextureQuality.LOW}">Low</option>
              <option value="${EarthNightTextureQuality.MEDIUM}" selected>Medium</option>
              <option value="${EarthNightTextureQuality.HIGH}">High</option>
              <option value="${EarthNightTextureQuality.ULTRA}">Ultra</option>
            </select>
            <label>Earth Day Quality</label>
          </div>
          <div class="input-field col s12">
            <select id="${this.formPrefix_}-earth-night-texture-quality">
              <option value="${EarthNightTextureQuality.POTATO}">Potato</option>
              <option value="${EarthNightTextureQuality.LOW}">Low</option>
              <option value="${EarthNightTextureQuality.MEDIUM}" selected>Medium</option>
              <option value="${EarthNightTextureQuality.HIGH}">High</option>
              <option value="${EarthNightTextureQuality.ULTRA}">Ultra</option>
            </select>
            <label>Earth Night Quality</label>
          </div>
          <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Draw the Sun">
                <input id="settings-drawSun" type="checkbox" checked/>
                <span class="lever"></span>
                Draw the Sun
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Hides Earth Textures">
                <input id="settings-drawBlackEarth" type="checkbox"/>
                <span class="lever"></span>
                Draw Black Earth
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Disable to hide the Atmosphere">
                <input id="settings-drawAtmosphere" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Atmosphere
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Disable to hide the Aurora">
                <input id="settings-drawAurora" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Aurora
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Change the Skybox to Gray">
                <input id="settings-graySkybox" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Gray Background
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Draw Milky Way in Background">
                <input id="settings-drawMilkyWay" type="checkbox" checked/>
                <span class="lever"></span>
                Draw the Milky Way
              </label>
            </div>
        </form>
      </div>
    </div>
  </div>
`;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        getEl(`${this.sideMenuElementName}-form`)?.addEventListener('change', this.onFormChange_.bind(this));
        getEl(`${this.sideMenuElementName}-reset-btn`)?.addEventListener('click', this.resetToDefaults_.bind(this));

        this.syncOnLoad_();
      },
    });
  }

  addJs(): void {
    super.addJs();
  }

  private resetToDefaults_() {
    keepTrackApi.getSoundManager().play(SoundNames.BUTTON_CLICK);

    showLoading(() => {
      (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-quality`)).value = GodraySamples.OFF.toString();
      (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-quality`)).dispatchEvent(new Event('change'));
      this.updateGodrays_(GodraySamples.OFF);

      (<HTMLInputElement>getEl(`${this.formPrefix_}-earth-day-texture-quality`)).value = EarthNightTextureQuality.MEDIUM;
      (<HTMLInputElement>getEl(`${this.formPrefix_}-earth-night-texture-quality`)).value = EarthNightTextureQuality.MEDIUM;
      (<HTMLInputElement>getEl(`${this.formPrefix_}-earth-day-texture-quality`)).dispatchEvent(new Event('change'));
      (<HTMLInputElement>getEl(`${this.formPrefix_}-earth-night-texture-quality`)).dispatchEvent(new Event('change'));

      settingsManager.isDrawSun = true;
      if (settingsManager.isBlackEarth) {
        settingsManager.isBlackEarth = false;
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
      }
      settingsManager.isDrawAtmosphere = true;
      settingsManager.isDrawAurora = true;
      settingsManager.isDrawMilkyWay = true;
      settingsManager.isGraySkybox = false;
    });

    SettingsManager.preserveSettings();
    this.syncOnLoad_();
  }

  private onFormChange_(e: Event): void {
    e.preventDefault();

    const targetElement = <HTMLElement>e.target;

    switch (targetElement?.id) {
      case 'settings-drawSun':
      case 'settings-drawBlackEarth':
      case 'settings-drawAtmosphere':
      case 'settings-drawAurora':
      case 'settings-drawMilkyWay':
      case 'settings-graySkybox':
        if ((<HTMLInputElement>getEl(targetElement?.id)).checked) {
          // Play sound for enabling option
          keepTrackApi.getSoundManager()?.play(SoundNames.TOGGLE_ON);
        } else {
          // Play sound for disabling option
          keepTrackApi.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
        }
        break;
      case `${this.formPrefix_}-godrays-quality`:
      case `${this.formPrefix_}-godrays-samples`:
      case `${this.formPrefix_}-godrays-decay`:
      case `${this.formPrefix_}-godrays-exposure`:
      case `${this.formPrefix_}-godrays-density`:
      case `${this.formPrefix_}-godrays-weight`:
      case `${this.formPrefix_}-godrays-illumination-decay`:
        {
          const godraysQuality = parseInt((<HTMLSelectElement>getEl(`${this.formPrefix_}-godrays-quality`)).value, 10);

          showLoading(() => this.updateGodrays_(godraysQuality));
        }
        break;
      case `${this.formPrefix_}-earth-day-texture-quality`:
        {
          const earth = keepTrackApi.getScene().earth;
          const earthDayTextureQuality = (<HTMLSelectElement>getEl(`${this.formPrefix_}-earth-day-texture-quality`)).value as EarthDayTextureQuality;
          const src = `${settingsManager.installDirectory}textures/earthmap${earthDayTextureQuality}.jpg`;

          settingsManager.earthDayTextureQuality = earthDayTextureQuality;

          if (earthDayTextureQuality === EarthDayTextureQuality.HIGH || earthDayTextureQuality === EarthDayTextureQuality.ULTRA) {
            showLoading(() => {
              earth.loadHiRes(earth.textureDay, src, hideLoading);
            }, -1);
          } else {
            earth.loadHiRes(earth.textureDay, src);
          }

          SettingsManager.preserveSettings();
        }
        break;
      case `${this.formPrefix_}-earth-night-texture-quality`:
        {
          const earth = keepTrackApi.getScene().earth;
          const earthNightTextureQuality = (<HTMLSelectElement>getEl(`${this.formPrefix_}-earth-night-texture-quality`)).value as EarthNightTextureQuality;
          const src = `${settingsManager.installDirectory}textures/earthlights${earthNightTextureQuality}.jpg`;

          settingsManager.earthNightTextureQuality = earthNightTextureQuality;

          if (earthNightTextureQuality === EarthNightTextureQuality.HIGH || earthNightTextureQuality === EarthNightTextureQuality.ULTRA) {
            showLoading(() => {
              earth.loadHiRes(earth.textureNight, src, hideLoading);
            }, -1);
          } else {
            earth.loadHiRes(earth.textureNight, src);
          }

          SettingsManager.preserveSettings();
        }
        break;
      default:
        break;
    }

    settingsManager.isDrawSun = (<HTMLInputElement>getEl('settings-drawSun')).checked;
    if (settingsManager.isDrawSun) {
      keepTrackApi.getScene().drawTimeArray = Array(150).fill(16);
    }
    const isBlackEarthChanged = settingsManager.isBlackEarth !== (<HTMLInputElement>getEl('settings-drawBlackEarth')).checked;
    const isDrawAtmosphereChanged = settingsManager.isDrawAtmosphere !== (<HTMLInputElement>getEl('settings-drawAtmosphere')).checked;
    const isDrawAuroraChanged = settingsManager.isDrawAurora !== (<HTMLInputElement>getEl('settings-drawAurora')).checked;

    settingsManager.isBlackEarth = (<HTMLInputElement>getEl('settings-drawBlackEarth')).checked;
    settingsManager.isDrawAtmosphere = (<HTMLInputElement>getEl('settings-drawAtmosphere')).checked;
    settingsManager.isDrawAurora = (<HTMLInputElement>getEl('settings-drawAurora')).checked;
    if (isBlackEarthChanged || isDrawAtmosphereChanged || isDrawAuroraChanged) {
      keepTrackApi.getScene().earth.reloadEarthHiResTextures();
    }

    // Must come after the above checks
    const isDrawMilkyWayChanged = settingsManager.isDrawMilkyWay !== (<HTMLInputElement>getEl('settings-drawMilkyWay')).checked;
    const isGraySkyboxChanged = settingsManager.isGraySkybox !== (<HTMLInputElement>getEl('settings-graySkybox')).checked;

    if (isGraySkyboxChanged) {
      (<HTMLInputElement>getEl('settings-drawMilkyWay')).checked = false;
    }

    if (isDrawMilkyWayChanged) {
      (<HTMLInputElement>getEl('settings-graySkybox')).checked = false;
    }

    settingsManager.isDrawMilkyWay = (<HTMLInputElement>getEl('settings-drawMilkyWay')).checked;
    settingsManager.isGraySkybox = (<HTMLInputElement>getEl('settings-graySkybox')).checked;

    if (isDrawMilkyWayChanged || isGraySkyboxChanged) {
      keepTrackApi.getScene().skybox.init(settingsManager, keepTrackApi.getRenderer().gl);
    }

    SettingsManager.preserveSettings();
  }

  private updateGodrays_(godraysQuality: GodraySamples): void {
    const previousQuality = settingsManager.godraysSamples;

    // Validate that it is a valid GodraySamples value
    if (!Object.values(GodraySamples).includes(godraysQuality)) {
      errorManagerInstance.warn('Invalid Godrays Quality value!');

      return;
    }

    const godraysSamples = parseInt((<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-samples`)).value, 10);

    // Validate that it is a valid number
    if (isNaN(godraysSamples) && godraysSamples > 0) {
      errorManagerInstance.warn('Invalid Godrays Samples value! Must be a number greater than 0!');

      return;
    }

    const godraysDecayValue = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-decay`)).value);
    const godraysExposureValue = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-exposure`)).value);
    const godraysDensityValue = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-density`)).value);
    const godraysWeightValue = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-weight`)).value);
    const godraysIlluminationDecayValue = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-illumination-decay`)).value);

    const godraysSamplesParent = getEl(`${this.formPrefix_}-godrays-samples`)?.parentElement;
    const godraysDecayParent = getEl(`${this.formPrefix_}-godrays-decay`)?.parentElement;
    const godraysExposureParent = getEl(`${this.formPrefix_}-godrays-exposure`)?.parentElement;
    const godraysDensityParent = getEl(`${this.formPrefix_}-godrays-density`)?.parentElement;
    const godraysWeightParent = getEl(`${this.formPrefix_}-godrays-weight`)?.parentElement;
    const godraysIlluminationDecayParent = getEl(`${this.formPrefix_}-godrays-illumination-decay`)?.parentElement;

    if (!godraysSamplesParent || !godraysDecayParent || !godraysExposureParent || !godraysDensityParent || !godraysWeightParent || !godraysIlluminationDecayParent) {
      errorManagerInstance.warn('Could not find the godray settings elements!');

      return;
    }

    if (godraysQuality === GodraySamples.CUSTOM && previousQuality !== GodraySamples.CUSTOM) {
      // Unhide the custom settings
      godraysSamplesParent.style.display = 'block';
      godraysDecayParent.style.display = 'block';
      godraysExposureParent.style.display = 'block';
      godraysDensityParent.style.display = 'block';
      godraysWeightParent.style.display = 'block';
      godraysDecayParent.style.display = 'block';
      godraysIlluminationDecayParent.style.display = 'block';
    }

    if (godraysQuality !== GodraySamples.CUSTOM) {
      // Hide the custom settings
      godraysSamplesParent.style.display = 'none';
      godraysDecayParent.style.display = 'none';
      godraysExposureParent.style.display = 'none';
      godraysDensityParent.style.display = 'none';
      godraysDecayParent.style.display = 'none';
      godraysIlluminationDecayParent.style.display = 'none';
    }

    if (godraysQuality === GodraySamples.OFF) {
      settingsManager.isDisableGodrays = true;
      settingsManager.sizeOfSun = 1.65;
      settingsManager.isUseSunTexture = true;

      return;
    }

    settingsManager.isUseSunTexture = false;
    settingsManager.isDisableGodrays = false;
    settingsManager.godraysSamples = godraysQuality;

    if (settingsManager.godraysSamples === GodraySamples.CUSTOM) {
      settingsManager.godraysSamples = godraysSamples;
      settingsManager.godraysDecay = godraysDecayValue;
      settingsManager.godraysExposure = godraysExposureValue;
      settingsManager.godraysDensity = godraysDensityValue;
      settingsManager.godraysWeight = godraysWeightValue;
      settingsManager.godraysIlluminationDecay = godraysIlluminationDecayValue;
    } else {
      settingsManager.godraysDecay = 0.983;
      settingsManager.godraysDensity = 1.8;
      settingsManager.godraysWeight = 0.085;
    }

    if (settingsManager.godraysSamples === GodraySamples.LOW) {
      settingsManager.sizeOfSun = 1.1;
      settingsManager.godraysExposure = 0.75;
      settingsManager.godraysIlluminationDecay = 2.7;
    } else if (settingsManager.godraysSamples === GodraySamples.MEDIUM) {
      settingsManager.sizeOfSun = 0.9;
      settingsManager.godraysExposure = 0.6;
      settingsManager.godraysIlluminationDecay = 2.5;
    } else if (settingsManager.godraysSamples === GodraySamples.HIGH) {
      settingsManager.sizeOfSun = 0.8;
      settingsManager.godraysExposure = 0.5;
      settingsManager.godraysIlluminationDecay = 2.4;
    } else if (settingsManager.godraysSamples === GodraySamples.ULTRA) {
      settingsManager.sizeOfSun = 0.8;
      settingsManager.godraysDecay = 0.99;
      settingsManager.godraysExposure = 0.6;
      settingsManager.godraysDensity = 1.5;
      settingsManager.godraysWeight = 0.15;
      settingsManager.godraysIlluminationDecay = 0.6;
    }

    SettingsManager.preserveSettings();
  }

  private syncOnLoad_() {
    this.loadGodraySettings_();

    (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-quality`)).value = settingsManager.godraysSamples.toString();
    (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-decay`)).value = settingsManager.godraysDecay.toString();
    (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-exposure`)).value = settingsManager.godraysExposure.toString();
    (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-density`)).value = settingsManager.godraysDensity.toString();
    (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-weight`)).value = settingsManager.godraysWeight.toString();
    (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-illumination-decay`)).value = settingsManager.godraysIlluminationDecay.toString();

    (<HTMLInputElement>getEl(`${this.formPrefix_}-earth-day-texture-quality`)).value = settingsManager.earthDayTextureQuality;
    (<HTMLInputElement>getEl(`${this.formPrefix_}-earth-night-texture-quality`)).value = settingsManager.earthNightTextureQuality;

    const settingsElements = [
      { id: 'settings-drawSun', setting: 'isDrawSun' },
      { id: 'settings-drawBlackEarth', setting: 'isBlackEarth' },
      { id: 'settings-drawAtmosphere', setting: 'isDrawAtmosphere' },
      { id: 'settings-drawAurora', setting: 'isDrawAurora' },
      { id: 'settings-drawMilkyWay', setting: 'isDrawMilkyWay' },
      { id: 'settings-graySkybox', setting: 'isGraySkybox' },
    ];

    settingsElements.forEach(({ id, setting }) => {
      const element = <HTMLInputElement>getEl(id);

      if (element) {
        if (setting.includes('colors.transparent')) {
          element.checked = settingsManager.colors.transparent[3] === 0;
        } else {
          element.checked = settingsManager[setting];
        }
      }
    });
  }

  private loadGodraySettings_() {
    try {
      settingsManager.godraysSamples = parseInt(
        PersistenceManager.getInstance().getItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_SAMPLES) ||
        GodraySamples.OFF.toString(),
      );
      settingsManager.godraysDecay = parseFloat(
        PersistenceManager.getInstance().getItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_DECAY) ||
        '0.983',
      );
      settingsManager.godraysExposure = parseFloat(
        PersistenceManager.getInstance().getItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_EXPOSURE) ||
        '0.5',
      );
      settingsManager.godraysDensity = parseFloat(
        PersistenceManager.getInstance().getItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_DENSITY) ||
        '1.8',
      );
      settingsManager.godraysWeight = parseFloat(
        PersistenceManager.getInstance().getItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_WEIGHT) ||
        '0.085',
      );
      settingsManager.godraysIlluminationDecay = parseFloat(
        PersistenceManager.getInstance().getItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_ILLUMINATION_DECAY) ||
        '2.5',
      );

      if (settingsManager.godraysSamples === GodraySamples.OFF) {
        settingsManager.isUseSunTexture = true;
        settingsManager.isDisableGodrays = true;
        settingsManager.sizeOfSun = 1.65;
      }

    } catch (error) {
      errorManagerInstance.warn('Failed to load godray settings from local storage! Resetting to defaults.');
      (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-quality`)).value = GodraySamples.OFF.toString();
      (<HTMLInputElement>getEl(`${this.formPrefix_}-godrays-quality`)).dispatchEvent(new Event('change'));
      this.updateGodrays_(GodraySamples.OFF);
    }
  }
}

