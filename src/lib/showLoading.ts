import { fadeIn, fadeOut } from './fade';
import { getEl } from './get-el';

/**
 * Show loading screen for a given time and then run callback
 */
export const showLoading = (callback?: () => void, delay?: number): void => {
  const loading = getEl('loading-screen', true);
  if (!loading) return; // TODO: This is a hack to get around the fact that the loading screen is not always present

  fadeIn(loading, 'flex', 500);
  setTimeout(() => {
    if (callback) callback();
    fadeOut(loading, 500);
  }, delay || 100);
};

export const showLoadingSticky = (): void => {
  const loading = getEl('loading-screen');
  fadeIn(loading, 'flex', 500);
};

export const hideLoading = () => {
  const loading = getEl('loading-screen');
  fadeOut(loading, 500);
};
