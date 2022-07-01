import { keepTrackApi } from '@app/js/api/keepTrackApi';
import '@materializecss/materialize';

const SECOND_IN_MS = 1000;
const LONG_TIMER_DELAY = SECOND_IN_MS * 100;

// materialize has to be loaded for this to work
const M = window.M;

export type ToastMsgType = 'standby' | 'normal' | 'caution' | 'serious' | 'critical';

export const toast = (toastText: string, type: ToastMsgType, isLong: boolean) => {
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
      break;
    case 'serious':
      toastMsg.$el[0].style.background = 'var(--statusDarkSerious)';
      break;
    case 'critical':
      toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
      break;
  }
};
