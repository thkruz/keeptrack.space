import { MenuMode } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';
import videoSettingsPng from '@public/img/icons/video-settings.png';

import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';

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

declare module '@app/engine/core/interfaces' {
  interface UserSettings {
    isBlackEarth: boolean;
    isDrawMilkyWay: boolean;
  }
}

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.VideoDirectorPlugin.${key}` as Parameters<typeof t7e>[0]);

export class VideoDirectorPlugin extends KeepTrackPlugin {
  readonly id = 'VideoDirectorPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.EXPERIMENTAL, MenuMode.ALL];

  isRotateL = true;
  isRotateR = false;
  isRotateU = false;
  isRotateD = false;
  bottomIconElementName: string = 'video-director-icon';
  bottomIconImg = videoSettingsPng;
  sideMenuElementName: string = 'video-director-menu';
  sideMenuElementHtml: string = html`
  <div id="video-director-menu" class="side-menu-parent start-hidden">
    <div id="video-director-content" class="side-menu">
      <div class="row">
        <form id="video-director-form">
          <div id="video-director-general">
            <div class="row center"></div>
            </br>
            <div class="row center">
              <button id="video-director-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">${l('labels.updateSettings')} &#9658;</button>
            </div>
            <h5 class="center-align">${l('labels.cameraMovements')}</h5>
            <div class="input-field col s12">
              <input value="0.000075" id="video-director-rotateSpeed" type="text" maxlength="9" />
              <label for="video-director-rotateSpeed" class="active">${l('labels.rotateSpeed')}</label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.rotateLeft')}">
                <input id="video-director-rotateL" type="checkbox" checked/>
                <span class="lever"></span>
                ${l('labels.rotateLeft')}
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.rotateRight')}">
                <input id="video-director-rotateR" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.rotateRight')}
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.rotateUp')}">
                <input id="video-director-rotateU" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.rotateUp')}
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.rotateDown')}">
                <input id="video-director-rotateD" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.rotateDown')}
              </label>
            </div>
            <div class="input-field col s12">
              <input value="0.05" id="video-director-panSpeed" type="text" maxlength="9" />
              <label for="video-director-panSpeed" class="active">${l('labels.panSpeed')}</label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.panLeft')}">
                <input id="video-director-panL" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.panLeft')}
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.panRight')}">
                <input id="video-director-panR" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.panRight')}
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.panUp')}">
                <input id="video-director-panU" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.panUp')}
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.panDown')}">
                <input id="video-director-panD" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.panDown')}
              </label>
            </div>
            <div class="input-field col s12">
              <input value="0.0005" id="video-director-zoomSpeed" type="text" maxlength="9" />
              <label for="video-director-zoomSpeed" class="active">${l('labels.zoomSpeed')}</label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.zoomIn')}">
                <input id="video-director-zoomIn" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.zoomIn')}
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.zoomOut')}">
                <input id="video-director-zoomOut" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.zoomOut')}
              </label>
          </div>
          <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="${l('labels.disableSelectedDot')}">
                <input id="video-director-selectedColor" type="checkbox"/>
                <span class="lever"></span>
                ${l('labels.disableSelectedDot')}
              </label>
          </div>
          <div class="center-align row">
            <button id="video-director-rotate" class="btn btn-ui waves-effect waves-light" type="button" name="action">${l('labels.startAutoRotate')} &#9658;</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  isNotColorPickerInitialSetup = false;

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/video-director/video-director-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
    };
  }

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('video-director-form')!.addEventListener('change', VideoDirectorPlugin.onFormChange);
        getEl('video-director-form')!.addEventListener('submit', VideoDirectorPlugin.onSubmit);
        getEl('video-director-rotate')!.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);
          ServiceLocator.getMainCamera().autoRotate(true);
        });
      },
    );
  }

  private static onFormChange(e: Event) {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }

    const elementId = (<HTMLElement>e.target)?.id;

    switch (elementId) {
      case 'video-director-rotateL':
      case 'video-director-rotateR':
      case 'video-director-rotateU':
      case 'video-director-rotateD':
      case 'video-director-panL':
      case 'video-director-panR':
      case 'video-director-panU':
      case 'video-director-panD':
      case 'video-director-zoomIn':
      case 'video-director-zoomOut':
        if ((<HTMLInputElement>getEl(elementId))?.checked) {
          // Play sound for enabling option
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
        } else {
          // Play sound for disabling option
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
        }
        break;
      default:
        break;
    }

    if ((<HTMLInputElement>getEl('video-director-selectedColor')).checked && settingsManager.selectedColor[3] !== 0) {
      settingsManager.selectedColorFallback = settingsManager.selectedColor;
      settingsManager.selectedColor = [0, 0, 0, 0];
    } else {
      settingsManager.selectedColor = settingsManager.selectedColorFallback;
    }

    settingsManager.autoRotateSpeed = parseFloat((<HTMLInputElement>getEl('video-director-rotateSpeed')).value);
    settingsManager.autoPanSpeed = parseFloat((<HTMLInputElement>getEl('video-director-panSpeed')).value);
    settingsManager.autoZoomSpeed = parseFloat((<HTMLInputElement>getEl('video-director-zoomSpeed')).value);

    const isRotateL = (<HTMLInputElement>getEl('video-director-rotateL')).checked;
    const isRotateR = (<HTMLInputElement>getEl('video-director-rotateR')).checked;
    const isRotateU = (<HTMLInputElement>getEl('video-director-rotateU')).checked;
    const isRotateD = (<HTMLInputElement>getEl('video-director-rotateD')).checked;
    const isPanL = (<HTMLInputElement>getEl('video-director-panL')).checked;
    const isPanR = (<HTMLInputElement>getEl('video-director-panR')).checked;
    const isPanU = (<HTMLInputElement>getEl('video-director-panU')).checked;
    const isPanD = (<HTMLInputElement>getEl('video-director-panD')).checked;
    const isZoomIn = (<HTMLInputElement>getEl('video-director-zoomIn')).checked;
    const isZoomOut = (<HTMLInputElement>getEl('video-director-zoomOut')).checked;

    if (isRotateL && !settingsManager.isAutoRotateL) {
      (<HTMLInputElement>getEl('video-director-rotateR')).checked = false;
    }

    if (isRotateR && !settingsManager.isAutoRotateR) {
      (<HTMLInputElement>getEl('video-director-rotateL')).checked = false;
    }

    if (isRotateU && !settingsManager.isAutoRotateU) {
      (<HTMLInputElement>getEl('video-director-rotateD')).checked = false;
    }

    if (isRotateD && !settingsManager.isAutoRotateD) {
      (<HTMLInputElement>getEl('video-director-rotateU')).checked = false;
    }

    if (isPanL && !settingsManager.isAutoPanL) {
      (<HTMLInputElement>getEl('video-director-panR')).checked = false;
    }

    if (isPanR && !settingsManager.isAutoPanR) {
      (<HTMLInputElement>getEl('video-director-panL')).checked = false;
    }

    if (isPanU && !settingsManager.isAutoPanU) {
      (<HTMLInputElement>getEl('video-director-panD')).checked = false;
    }

    if (isPanD && !settingsManager.isAutoPanD) {
      (<HTMLInputElement>getEl('video-director-panU')).checked = false;
    }

    if (isZoomIn && !settingsManager.isAutoZoomIn) {
      (<HTMLInputElement>getEl('video-director-zoomOut')).checked = false;
    }

    if (isZoomOut && !settingsManager.isAutoZoomOut) {
      (<HTMLInputElement>getEl('video-director-zoomIn')).checked = false;
    }
  }

  private static onSubmit(e: SubmitEvent) {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }
    e.preventDefault();

    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    settingsManager.isAutoRotateR = (<HTMLInputElement>getEl('video-director-rotateR')).checked;
    settingsManager.isAutoRotateL = (<HTMLInputElement>getEl('video-director-rotateL')).checked;
    settingsManager.isAutoRotateU = (<HTMLInputElement>getEl('video-director-rotateU')).checked;
    settingsManager.isAutoRotateD = (<HTMLInputElement>getEl('video-director-rotateD')).checked;
    settingsManager.isAutoPanR = (<HTMLInputElement>getEl('video-director-panR')).checked;
    settingsManager.isAutoPanL = (<HTMLInputElement>getEl('video-director-panL')).checked;
    settingsManager.isAutoPanU = (<HTMLInputElement>getEl('video-director-panU')).checked;
    settingsManager.isAutoPanD = (<HTMLInputElement>getEl('video-director-panD')).checked;
    settingsManager.isAutoZoomIn = (<HTMLInputElement>getEl('video-director-zoomIn')).checked;
    settingsManager.isAutoZoomOut = (<HTMLInputElement>getEl('video-director-zoomOut')).checked;
  }
}

