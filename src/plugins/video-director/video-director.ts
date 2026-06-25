import { CameraType } from '@app/engine/camera/camera-type';
import { MenuMode } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';
import videoSettingsPng from '@public/img/icons/video-settings.png';

import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IHelpConfig, IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import './video-director.css';
import { DIRECTION_TOGGLES, getOppositeToDisable, parseSpeed, ROTATE_TOGGLE_IDS, SPEED_CONFIGS } from './video-director-core';

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

/** A Materialize lever switch row. */
const lever = (id: string, labelKey: string, checked = false): string => html`
  <div class="switch row">
    <label data-position="top" data-delay="50" data-tooltip="${l(labelKey)}">
      <input id="${id}" type="checkbox"${checked ? ' checked' : ''} />
      <span class="lever"></span>
      ${l(labelKey)}
    </label>
  </div>`;

/** A single full-width speed text field. */
const speedField = (id: string, value: string, labelKey: string): string => html`
  <div class="kt-field-row">
    <div class="input-field col s12">
      <input value="${value}" id="${id}" type="text" maxlength="9" inputmode="decimal" />
      <label for="${id}" class="active">${l(labelKey)}</label>
    </div>
  </div>`;

export class VideoDirectorPlugin extends KeepTrackPlugin {
  readonly id = 'VideoDirectorPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.EXPERIMENTAL, MenuMode.ALL];

  bottomIconElementName: string = 'video-director-icon';
  bottomIconImg = videoSettingsPng;
  sideMenuElementName: string = 'video-director-menu';
  sideMenuElementHtml: string = VideoDirectorPlugin.buildMenuHtml_();

  /** Sync the form from current settings whenever the menu is opened. */
  bottomIconCallback = (): void => {
    if (this.isMenuButtonActive) {
      this.syncFormFromSettings_();
    }
  };

  /** Build the v13 card-based side menu markup. */
  private static buildMenuHtml_(): string {
    return html`
    <div id="video-director-menu" class="side-menu-parent start-hidden kt-ui-v13">
      <div id="video-director-content" class="side-menu">
        <form id="video-director-form">
          <section class="kt-section">
            <div class="kt-section-label">${l('labels.rotate')}</div>
            ${speedField('video-director-rotateSpeed', '0.000075', 'labels.rotateSpeed')}
            ${lever('video-director-rotateL', 'labels.rotateLeft', true)}
            ${lever('video-director-rotateR', 'labels.rotateRight')}
            ${lever('video-director-rotateU', 'labels.rotateUp')}
            ${lever('video-director-rotateD', 'labels.rotateDown')}
          </section>
          <section class="kt-section">
            <div class="kt-section-label">${l('labels.pan')}</div>
            ${speedField('video-director-panSpeed', '0.05', 'labels.panSpeed')}
            ${lever('video-director-panL', 'labels.panLeft')}
            ${lever('video-director-panR', 'labels.panRight')}
            ${lever('video-director-panU', 'labels.panUp')}
            ${lever('video-director-panD', 'labels.panDown')}
          </section>
          <section class="kt-section">
            <div class="kt-section-label">${l('labels.zoom')}</div>
            ${speedField('video-director-zoomSpeed', '0.0005', 'labels.zoomSpeed')}
            ${lever('video-director-zoomIn', 'labels.zoomIn')}
            ${lever('video-director-zoomOut', 'labels.zoomOut')}
          </section>
          <section class="kt-section">
            <div class="kt-section-label">${l('labels.scene')}</div>
            ${lever('video-director-selectedColor', 'labels.disableSelectedDot')}
            ${lever('video-director-blackEarth', 'labels.blackEarth')}
            ${lever('video-director-milkyWay', 'labels.milkyWay')}
          </section>
          <button id="video-director-rotate" type="button" class="kt-action waves-effect">
            <span class="kt-action-label">${l('labels.startAutoRotate')}</span>
          </button>
        </form>
      </div>
    </div>`;
  }

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

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        // Open/close the Video Director menu.
        key: 'V',
        ctrl: true,
        shift: true,
        callback: () => {
          if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
            return;
          }
          this.bottomMenuClicked();
        },
      },
      {
        // Toggle auto-rotate without opening the menu.
        key: 'R',
        ctrl: true,
        shift: true,
        callback: () => this.toggleAutoRotate_(),
      },
    ];
  }

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('video-director-form')!.addEventListener('change', this.onFormChange_);
        // Prevent an accidental page reload if the user presses Enter in a speed field.
        getEl('video-director-form')!.addEventListener('submit', (e) => e.preventDefault());
        getEl('video-director-rotate')!.addEventListener('click', () => this.toggleAutoRotate_());
      },
    );
  }

  /** Read the form into settings whenever any control changes (immediate-apply). */
  private onFormChange_ = (e: Event): void => {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }

    const target = e.target as HTMLInputElement | null;
    const elementId = target?.id ?? '';
    const isCheckbox = target?.type === 'checkbox';

    // Mutually-exclusive opposite direction: turning one on turns its opposite off.
    if (isCheckbox) {
      const oppositeId = getOppositeToDisable(elementId, target!.checked);

      if (oppositeId) {
        const opposite = getEl(oppositeId) as HTMLInputElement | null;

        if (opposite) {
          opposite.checked = false;
        }
      }

      ServiceLocator.getSoundManager()?.play(target!.checked ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
    }

    this.applySpeeds_();
    this.applyDirectionFlags_();
    this.applySelectedDot_();
    this.applySceneToggle_(elementId);
  };

  /** Parse, clamp and store the three speed fields (NaN-safe). */
  private applySpeeds_(): void {
    SPEED_CONFIGS.forEach((cfg) => {
      const input = getEl(cfg.id) as HTMLInputElement | null;

      if (!input) {
        return;
      }

      const value = parseSpeed(input.value, cfg);

      // Reflect the clamped/sanitized value so the user never sees a stale or invalid entry.
      input.value = value.toString();
      settingsManager[cfg.flag] = value;
    });
  }

  /** Mirror every direction toggle into its settings flag. */
  private applyDirectionFlags_(): void {
    DIRECTION_TOGGLES.forEach((toggle) => {
      const checkbox = getEl(toggle.id) as HTMLInputElement | null;

      if (checkbox) {
        settingsManager[toggle.flag] = checkbox.checked;
      }
    });
  }

  /** Hide or restore the selected-satellite highlight dot for clean footage. */
  private applySelectedDot_(): void {
    const isHide = (getEl('video-director-selectedColor') as HTMLInputElement)?.checked;

    if (isHide && settingsManager.selectedColor[3] !== 0) {
      settingsManager.selectedColorFallback = settingsManager.selectedColor;
      settingsManager.selectedColor = [0, 0, 0, 0];
    } else {
      settingsManager.selectedColor = settingsManager.selectedColorFallback;
    }
  }

  /** Apply Black Earth / Milky Way scene toggles, re-initializing only the affected renderer. */
  private applySceneToggle_(elementId: string): void {
    const scene = ServiceLocator.getScene();

    if (elementId === 'video-director-blackEarth') {
      settingsManager.isBlackEarth = (getEl('video-director-blackEarth') as HTMLInputElement).checked;
      scene?.earth?.init?.();
    }

    if (elementId === 'video-director-milkyWay') {
      settingsManager.isDrawMilkyWay = (getEl('video-director-milkyWay') as HTMLInputElement).checked;
      scene?.skybox?.init?.(ServiceLocator.getRenderer()?.gl);
    }
  }

  /** Toggle auto-rotate on/off, seeding a direction if none is active, and update the button label. */
  private toggleAutoRotate_(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    const camera = ServiceLocator.getMainCamera();
    const willStart = !camera.state.isAutoRotate;

    if (willStart && !this.hasRotateDirection_()) {
      // Default to rotate-left so "Start" always produces visible motion.
      settingsManager.isAutoRotateL = true;
      const rotateL = getEl('video-director-rotateL') as HTMLInputElement | null;

      if (rotateL) {
        rotateL.checked = true;
      }
    }

    camera.autoRotate(willStart);
    this.updateRotateButtonLabel_(willStart);
  }

  /** True when at least one rotate direction flag is enabled. */
  private hasRotateDirection_(): boolean {
    return settingsManager.isAutoRotateL || settingsManager.isAutoRotateR || settingsManager.isAutoRotateU || settingsManager.isAutoRotateD;
  }

  /** Swap the Start/Stop label without clobbering the chevron pseudo-element. */
  private updateRotateButtonLabel_(isRotating: boolean): void {
    const label = getEl('video-director-rotate')?.querySelector('.kt-action-label');

    if (label) {
      label.textContent = isRotating ? l('labels.stopAutoRotate') : l('labels.startAutoRotate');
    }
  }

  /** Populate the form controls from the current settings when the menu opens. */
  private syncFormFromSettings_(): void {
    SPEED_CONFIGS.forEach((cfg) => {
      const input = getEl(cfg.id) as HTMLInputElement | null;

      if (input) {
        input.value = (settingsManager[cfg.flag] as number).toString();
      }
    });

    DIRECTION_TOGGLES.forEach((toggle) => {
      const checkbox = getEl(toggle.id) as HTMLInputElement | null;

      if (checkbox) {
        checkbox.checked = Boolean(settingsManager[toggle.flag]);
      }
    });

    const selectedColor = getEl('video-director-selectedColor') as HTMLInputElement | null;

    if (selectedColor) {
      selectedColor.checked = settingsManager.selectedColor[3] === 0;
    }

    const blackEarth = getEl('video-director-blackEarth') as HTMLInputElement | null;

    if (blackEarth) {
      blackEarth.checked = settingsManager.isBlackEarth;
    }

    const milkyWay = getEl('video-director-milkyWay') as HTMLInputElement | null;

    if (milkyWay) {
      milkyWay.checked = settingsManager.isDrawMilkyWay;
    }

    this.updateRotateButtonLabel_(ServiceLocator.getMainCamera().state.isAutoRotate);
  }

  /** Test seam: drive the change handler with a synthetic event. */
  triggerFormChange(e: Event): void {
    this.onFormChange_(e);
  }

  /** Ids of every rotate/pan/zoom direction toggle, exposed for tests. */
  static get directionToggleIds(): string[] {
    return DIRECTION_TOGGLES.map((t) => t.id);
  }

  /** Ids of the rotate-only direction toggles, exposed for tests. */
  static get rotateToggleIds(): string[] {
    return ROTATE_TOGGLE_IDS;
  }
}
