/*
 * /////////////////////////////////////////////////////////////////////////////
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * advice-module.js manages all recommended actions to the user in a semi-tutorial
 * manner. It works closely with ui.js
 * https://keeptrack.space
 *
 * All rights reserved. No part of this web site may be reproduced, published,
 * distributed, displayed, performed, copied or stored for public or private
 * use, without written permission of the author.
 *
 * No part of this code may be modified or changed or exploited in any way used
 * for derivative works, or offered for sale, or used to construct any kind of database
 * or mirrored at any other location without the express written permission of the author.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeyboardComponent } from '@app/engine/plugins/components/keyboard/keyboard-component';
import { KeepTrack } from '@app/keeptrack';
import { TranslationKey, t7e } from '@app/locales/keys';
import { EventBus } from '../events/event-bus';
import { buildHelpHtml } from '../plugins/components/help/help-html';
import { getGeneralHelpConfig } from '../ui/help/general-help';
import { html } from './development/formatter';
import { getEl } from './get-el';
import { PersistenceManager, StorageKey } from './persistence-manager';

/** Owner id of the Shift+F1 binding; the general help lists the shortcuts registered under it. */
const ADVICE_MANAGER_ID = 'AdviceManager';

export class AdviceManager {
  private helpHeaderDOM: HTMLElement;
  private helpOuterDOM: HTMLElement;
  private helpTextDOM: HTMLElement;
  private isAdviceEnabled = true;
  private isAdviceOpen = false;
  private tutIconDOM: HTMLElement;
  /** Element that had focus when the help opened, so closing hands focus back to it. */
  private returnFocusEl_: HTMLElement | null = null;
  private isEscapeBound_ = false;
  private readonly onOuterClick_ = (event: MouseEvent): void => {
    if (event.target === this.helpOuterDOM) {
      this.closeAdvice();
    }
  };
  private readonly onFocusIn_ = (event: FocusEvent): void => {
    if (this.isAdviceOpen && !this.helpOuterDOM.contains(event.target as Node)) {
      this.focusableElements_()[0]?.focus();
    }
  };
  private readonly onKeyUp_ = (event: KeyboardEvent): void => {
    if (this.isAdviceOpen) {
      event.stopImmediatePropagation();
    }
  };
  private readonly onKeyDown_ = (event: KeyboardEvent): void => {
    if (!this.isAdviceOpen) {
      return;
    }
    // Capture both keyboard phases before the app's camera/time/drawer listeners.
    // Native link activation and scrolling retain their browser defaults.
    event.stopImmediatePropagation();
    if (event.key === 'Escape' || (event.key === 'F1' && event.shiftKey)) {
      event.preventDefault();
      this.closeAdvice();

      return;
    }
    if (event.key === 'Tab') {
      const focusable = this.focusableElements_();
      const first = focusable[0];
      const last = focusable.at(-1);
      const active = document.activeElement;

      if (!first || !this.helpOuterDOM.contains(active) || (!event.shiftKey && active === last) || (event.shiftKey && active === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    }
  };

  private focusableElements_(): HTMLElement[] {
    return Array.from(this.helpOuterDOM.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
      (element) => element.tabIndex >= 0 && !(element as HTMLButtonElement).disabled && !element.closest('[hidden], [inert]') && getComputedStyle(element).display !== 'none'
    );
  }

  public clearAdvice(): void {
    this.helpHeaderDOM?.classList.remove('help-header-sel');
    if (this.helpHeaderDOM) {
      this.helpHeaderDOM.onclick = null;
    }
  }

  public init() {
    // Advice only applies to things in the bottom menu
    if (settingsManager.isDisableBottomMenu) {
      return;
    }

    KeepTrack.getInstance().containerRoot?.insertAdjacentHTML(
      'beforeend',
      html`
        <div id="help-outer-container" class="valign">
          <div id="help-screen" class="valign-wrapper">
            <div id="help-inner-container" class="valign">
              <p>
                <span id="help-header" class="logo-font">TITLE</span>
              </p>
              <span id="help-text">ADVICE</span>
            </div>
          </div>
        </div>
      `
    );

    this.helpOuterDOM = getEl('help-outer-container')!;
    this.helpHeaderDOM = getEl('help-header')!;
    this.helpTextDOM = getEl('help-text')!;

    new KeyboardComponent(ADVICE_MANAGER_ID, [
      {
        key: 'F1',
        code: 'F1',
        shift: true,
        description: t7e('keyboard.descriptions.openHelp' as TranslationKey),
        callback: () => this.onHelpKey_(),
      },
    ]).init();
  }

  /**
   * Shift+F1: closes an open help; otherwise asks the open menu or active view for its help (at
   * most one plugin answers, see KeepTrackPlugin.resolveHelpTarget) and falls back to the general
   * KeepTrack help when nothing answered.
   */
  private onHelpKey_(): void {
    if (this.isAdviceOpen) {
      this.closeAdvice();

      return;
    }

    EventBus.getInstance().emit(EventBusEvent.onHelpMenuClick);

    if (!this.isAdviceOpen) {
      this.showGeneralHelp();
    }
  }

  /** Shows the app-level help used when no menu or view is open. */
  public showGeneralHelp(): void {
    const config = getGeneralHelpConfig();

    this.showAdvice(config.title, buildHelpHtml(config, ADVICE_MANAGER_ID));
  }

  public isEnabled(): boolean {
    return this.isAdviceEnabled;
  }

  public off() {
    PersistenceManager.getInstance().saveItem(StorageKey.IS_ADVICE_ENABLED, 'false');
    this.isAdviceEnabled = false;
    this.closeAdvice();
    this.tutIconDOM.classList.remove('bmenu-item-selected');
  }

  public on() {
    PersistenceManager.getInstance().saveItem(StorageKey.IS_ADVICE_ENABLED, 'true');
    this.isAdviceEnabled = true;
    this.tutIconDOM.classList.add('bmenu-item-selected');
  }

  public showAdvice(header: string, text: string): void {
    if (!this.isAdviceEnabled) {
      return;
    }

    const wasOpen = this.isAdviceOpen;

    this.isAdviceOpen = true;

    this.clearAdvice();

    // DOM elements may not exist in test environments
    if (!this.helpOuterDOM || !this.helpHeaderDOM || !this.helpTextDOM) {
      return;
    }

    const active = document.activeElement;

    if (!wasOpen) {
      this.returnFocusEl_ = active instanceof HTMLElement && !this.helpOuterDOM.contains(active) ? active : null;
    }

    this.helpOuterDOM.style.display = 'block';
    this.helpHeaderDOM.innerHTML = header;
    this.helpTextDOM.innerHTML = text;
    this.helpOuterDOM.setAttribute('role', 'dialog');
    this.helpOuterDOM.setAttribute('aria-modal', 'true');
    this.helpOuterDOM.setAttribute('aria-labelledby', 'help-header');
    let close = this.helpOuterDOM.querySelector<HTMLButtonElement>('#help-close');

    if (!close) {
      close = document.createElement('button');
      close.id = 'help-close';
      close.type = 'button';
      close.textContent = '×';
      close.addEventListener('click', () => this.closeAdvice());
      (this.helpTextDOM.closest('#help-screen') ?? this.helpOuterDOM).prepend(close);
    }
    close.setAttribute('aria-label', t7e('plugins.OnboardingPlugin.hub.close'));
    ServiceLocator.getInputManager()?.keyboard?.keyStates.clear();
    // Same function reference every time, so repeated opens never stack listeners.
    this.helpOuterDOM.addEventListener('click', this.onOuterClick_);

    if (!this.isEscapeBound_) {
      // Capture phase: Escape must reach the help before menus or the camera keys below it.
      window.addEventListener('keydown', this.onKeyDown_, true);
      window.addEventListener('keyup', this.onKeyUp_, true);
      window.addEventListener('focusin', this.onFocusIn_, true);
      this.isEscapeBound_ = true;
    }
    close.focus();
  }

  /** Hides the help overlay (click, Escape or Shift+F1) and returns focus to the page. */
  public closeAdvice(): void {
    this.isAdviceOpen = false;

    if (this.helpOuterDOM) {
      this.helpOuterDOM.style.display = 'none';
    }

    const returnTo = this.returnFocusEl_;

    this.returnFocusEl_ = null;

    if (returnTo?.isConnected && returnTo !== document.body) {
      returnTo.focus();
    } else if (document.activeElement instanceof HTMLElement && this.helpOuterDOM?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }
}

export const adviceManagerInstance = new AdviceManager();
