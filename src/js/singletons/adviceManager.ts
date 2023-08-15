/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek

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

import { getEl } from '../lib/get-el';
import { keepTrackApi } from '../keepTrackApi';

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
    try {
      localStorage.setItem('isAdviceEnabled', 'false');
    } catch {
      // Do Nothing
    }
    this.isAdviceEnabled = false;
    this.isAdviceOpen = false;
    this.helpOuterDOM.style.display = 'none';
    this.tutIconDOM.classList.remove('bmenu-item-selected');
  }

  public on() {
    try {
      localStorage.setItem('isAdviceEnabled', 'true');
    } catch {
      // Do Nothing
    }
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
