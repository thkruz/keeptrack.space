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

import { getEl } from '../../lib/helpers';
import { keepTrackApi } from '../../api/keepTrackApi';

let isAdviceEnabled = true;
let isAdviceOpen = false;
let helpOuterDOM: HTMLElement;
let helpHeaderDOM: HTMLElement;
let helpTextDOM: HTMLElement;
let tutIconDOM: HTMLElement;

export const isEnabled = (): boolean => isAdviceEnabled;
export const on = () => {
  try {
    localStorage.setItem('isAdviceEnabled', 'true');
  } catch {
    // Do Nothing
  }
  isAdviceEnabled = true;
  tutIconDOM.classList.add('bmenu-item-selected');
};
export const off = () => {
  try {
    localStorage.setItem('isAdviceEnabled', 'false');
  } catch {
    // Do Nothing
  }
  isAdviceEnabled = false;
  isAdviceOpen = false;
  helpOuterDOM.style.display = 'none';
  tutIconDOM.classList.remove('bmenu-item-selected');
};
export const showAdvice = (header: string, text: string) => {
  if (!isAdviceEnabled) return;

  isAdviceOpen = true;

  adviceManager.clearAdvice();

  helpOuterDOM.style.display = 'block';
  helpHeaderDOM.innerHTML = header;
  helpTextDOM.innerHTML = text;
  helpOuterDOM.addEventListener('click', function () {
    isAdviceOpen = false;
    helpOuterDOM.style.display = 'none';
  });
};
export const clearAdvice = function (): void {
  helpHeaderDOM.classList.remove('help-header-sel');
  helpHeaderDOM.onclick = null;
};
export const init = () => {
  helpOuterDOM = getEl('help-outer-container');
  helpHeaderDOM = getEl('help-header');
  helpTextDOM = getEl('help-text');
  tutIconDOM = getEl('tutorial-icon');

  tutIconDOM.addEventListener('click', function () {
    keepTrackApi.methods.onHelpMenuClick();
  });

  window.onkeydown = (e: KeyboardEvent) => {
    // If Shift + F1
    if (e.shiftKey && e.code === 'F1') {
      if (isAdviceOpen) {
        isAdviceOpen = false;
        helpOuterDOM.style.display = 'none';
      } else {
        keepTrackApi.methods.onHelpMenuClick();
      }
    }
  };
};

export const adviceManager = {
  clearAdvice: clearAdvice,
  isEnabled: isEnabled,
  off: off,
  on: on,
  showAdvice: showAdvice,
};
