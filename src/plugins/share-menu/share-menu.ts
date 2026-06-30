/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * share-menu.ts provides an on-demand "Share" menu. Instead of continuously
 * rewriting the browser URL bar with the live application state, the shareable
 * URL is generated only when this menu is opened. The user can then copy the
 * link or invoke the native share sheet (Web Share API) where supported.
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

import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { UrlManager } from '@app/engine/input/url-manager';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import externalPng from '@public/img/icons/external.png';
import './share-menu.css';

type T7eKey = Parameters<typeof t7e>[0];

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.ShareMenuPlugin.${key}` as T7eKey);

export class ShareMenuPlugin extends KeepTrackPlugin {
  readonly id = 'ShareMenuPlugin';
  dependencies_ = [];

  static readonly URL_INPUT_ID = 'share-url-input';
  static readonly COPY_BTN_ID = 'share-copy-btn';
  static readonly NATIVE_BTN_ID = 'share-native-btn';

  // Bridge to onBottomIconClick until base class wires up component callbacks.
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'share-menu-bottom-icon',
      label: l('bottomIconLabel'),
      image: externalPng,
      menuMode: [MenuMode.TOOLS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'share-menu',
      title: l('title'),
      html: this.buildSideMenuHtml_(),
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'ShareMenuPlugin.open',
        label: l('commandPalette.share'),
        category: 'Tools',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  protected buildSideMenuHtml_(): string {
    return html`
      <div id="share-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div class="side-menu">
          <div class="kt-menu-body">
            <section class="kt-section">
              <div class="kt-section-label">${l('labels.shareLink')}</div>
              <div class="kt-field-row">
                <div class="input-field col s12">
                  <input id="${ShareMenuPlugin.URL_INPUT_ID}" type="text" readonly />
                  <label for="${ShareMenuPlugin.URL_INPUT_ID}" class="active">${l('labels.url')}</label>
                </div>
              </div>
              <button id="${ShareMenuPlugin.COPY_BTN_ID}" type="button" class="kt-action waves-effect">
                <span class="kt-action-label">${l('buttons.copyLink')}</span>
              </button>
              <button id="${ShareMenuPlugin.NATIVE_BTN_ID}" type="button" class="kt-action waves-effect start-hidden">
                <span class="kt-action-label">${l('buttons.share')}</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Refresh the displayed link with the current state whenever the menu opens.
   * The base bottom-icon flow sets isMenuButtonActive before calling this, so a
   * truthy value means the menu was just opened (not toggled closed).
   */
  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      this.refreshShareUrl_();
    }
  }

  private refreshShareUrl_(): void {
    const urlInput = getEl(ShareMenuPlugin.URL_INPUT_ID) as HTMLInputElement | null;

    if (urlInput) {
      urlInput.value = UrlManager.getShareUrl();
    }
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      this.uiManagerFinal_.bind(this),
    );
  }

  protected uiManagerFinal_(): void {
    // The native share sheet is only available in secure contexts on supported
    // browsers/devices (mostly mobile and PWAs). Reveal the button only there.
    if (typeof navigator.share === 'function') {
      getEl(ShareMenuPlugin.NATIVE_BTN_ID)?.classList.remove('start-hidden');
    }

    getEl(ShareMenuPlugin.COPY_BTN_ID)?.addEventListener('click', () => {
      this.copyLink_();
    });

    getEl(ShareMenuPlugin.NATIVE_BTN_ID)?.addEventListener('click', () => {
      this.shareNative_();
    });
  }

  private getShareUrlValue_(): string {
    const urlInput = getEl(ShareMenuPlugin.URL_INPUT_ID) as HTMLInputElement | null;

    return urlInput?.value || UrlManager.getShareUrl();
  }

  private copyLink_(): void {
    const uiManagerInstance = ServiceLocator.getUiManager();
    const url = this.getShareUrlValue_();

    navigator.clipboard.writeText(url).then(() => {
      uiManagerInstance.toast(l('toasts.copied'), ToastMsgType.normal);
    }).catch(() => {
      uiManagerInstance.toast(l('toasts.copyFailed'), ToastMsgType.caution);
    });
  }

  private shareNative_(): void {
    if (typeof navigator.share !== 'function') {
      this.copyLink_();

      return;
    }

    const url = this.getShareUrlValue_();

    navigator.share({ title: document.title, url }).catch((err: Error) => {
      // AbortError is the user dismissing the share sheet — not a real failure.
      if (err?.name !== 'AbortError') {
        errorManagerInstance.debug(`Native share failed: ${err?.message ?? err}`);
      }
    });
  }
}
