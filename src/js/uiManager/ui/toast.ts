import '@materializecss/materialize';

import { keepTrackApi } from '@app/js/api/keepTrackApi';

const SECOND_IN_MS = 1000;
const LONG_TIMER_DELAY = SECOND_IN_MS * 100;

// materialize has to be loaded for this to work
const M = window.M;

export type ToastMsgType = 'standby' | 'normal' | 'caution' | 'serious' | 'critical' | 'error';

export const toast = (toastText: string, type: ToastMsgType, isLong = false) => {
  let toastMsg = M.toast({
    text: toastText,
  });
  type = type || 'standby';
  if (isLong) toastMsg.timeRemaining = LONG_TIMER_DELAY;
  switch (type) {
    case 'standby':
      toastMsg.$el[0].style.background = 'var(--statusDarkStandby)';
      keepTrackApi.programs.soundManager?.play('standby');
      break;
    case 'normal':
      toastMsg.$el[0].style.background = 'var(--statusDarkNormal)';
      keepTrackApi.programs.soundManager?.play('standby');
      break;
    case 'caution':
      toastMsg.$el[0].style.background = 'var(--statusDarkCaution)';
      keepTrackApi.programs.soundManager?.play('standby');
      break;
    case 'serious':
      toastMsg.$el[0].style.background = 'var(--statusDarkSerious)';
      keepTrackApi.programs.soundManager?.play('standby');
      break;
    case 'critical':
      toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
      keepTrackApi.programs.soundManager?.play('standby');
      break;
    case 'error':
      toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
      keepTrackApi.programs.soundManager?.play('error');
      break;
  }
};
