import { keepTrackApi } from '@app/keepTrackApi';
import { SoundNames } from '@app/plugins/sounds/SoundNames';
import { fadeIn, fadeOut } from './fade';
import { getEl } from './get-el';

/**
 * Show loading screen for a given time and then run callback
 *
 * Use -1 to show loading screen indefinitely and remove it manually
 */
export const showLoading = (callback?: () => void, delay?: number): void => {
  const loading = getEl('loading-screen', true);

  if (!loading) {
    return;
  }

  keepTrackApi.getSoundManager().play(SoundNames.LOADING);

  fadeIn(loading, 'flex', 500);

  setTimeout(() => {
    if (callback) {
      // eslint-disable-next-line callback-return
      callback();
    }

    if (delay === -1) {
      return;
    }
    hideLoading();
  }, delay || 100);
};

export const showLoadingSticky = (): void => {
  const loading = getEl('loading-screen');

  fadeIn(loading, 'flex', 500);
};

export const hideLoading = () => {
  const loading = getEl('loading-screen');

  fadeOut(loading, 1000);
  keepTrackApi.getSoundManager().stop(SoundNames.LOADING);
};
