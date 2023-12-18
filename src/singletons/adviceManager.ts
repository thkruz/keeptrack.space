/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2023, Theodore Kruczek

advice-module.js manages all recommended actions to the user in a semi-tutorial
manner. It works closely with ui.js
http://keeptrack.space

All rights reserved. No part of this web site may be reproduced, published,
distributed, displayed, performed, copied or stored for public or private
use, without written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { PersistenceManager, StorageKey } from './persistence-manager';

export class AdviceManager {
  private helpHeaderDOM: HTMLElement;
  private helpOuterDOM: HTMLElement;
  private helpTextDOM: HTMLElement;
  private isAdviceEnabled = true;
  private isAdviceOpen = false;
  private tutIconDOM: HTMLElement;

  public clearAdvice(): void {
    this.helpHeaderDOM.classList.remove('help-header-sel');
    this.helpHeaderDOM.onclick = null;
  }

  public init() {
    this.helpOuterDOM = getEl('help-outer-container');
    this.helpHeaderDOM = getEl('help-header');
    this.helpTextDOM = getEl('help-text');
    this.tutIconDOM = getEl('tutorial-icon');

    this.tutIconDOM.addEventListener('click', function () {
      keepTrackApi.methods.onHelpMenuClick();
    });

    window.onkeydown = (e: KeyboardEvent) => {
      // If Shift + F1
      if (e.shiftKey && e.code === 'F1') {
        if (this.isAdviceOpen) {
          this.isAdviceOpen = false;
          this.helpOuterDOM.style.display = 'none';
        } else {
          keepTrackApi.methods.onHelpMenuClick();
        }
      }
    };
  }

  public isEnabled(): boolean {
    return this.isAdviceEnabled;
  }

  public off() {
    PersistenceManager.getInstance().saveItem(StorageKey.IS_ADVICE_ENABLED, 'false');
    this.isAdviceEnabled = false;
    this.isAdviceOpen = false;
    this.helpOuterDOM.style.display = 'none';
    this.tutIconDOM.classList.remove('bmenu-item-selected');
  }

  public on() {
    PersistenceManager.getInstance().saveItem(StorageKey.IS_ADVICE_ENABLED, 'true');
    this.isAdviceEnabled = true;
    this.tutIconDOM.classList.add('bmenu-item-selected');
  }

  public showAdvice(header: string, text: string): void {
    if (!this.isAdviceEnabled) return;

    this.isAdviceOpen = true;

    this.clearAdvice();

    this.helpOuterDOM.style.display = 'block';
    this.helpHeaderDOM.innerHTML = header;
    this.helpTextDOM.innerHTML = text;
    this.helpOuterDOM.addEventListener('click', () => {
      this.isAdviceOpen = false;
      this.helpOuterDOM.style.display = 'none';
    });
  }
}

export const adviceManagerInstance = new AdviceManager();
