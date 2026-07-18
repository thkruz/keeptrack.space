import { SoundNames } from '@app/engine/audio/sounds';
import { TranslationKey, t7e } from '@app/locales/keys';
import { ServiceLocator } from '../core/service-locator';
import { fadeIn, fadeOut } from './fade';

const messages_ = ['cunningPlan', 'satIntel', 'science', 'science2', 'math', 'dots', 'painting', 'coloring', 'elsets', 'models'];

let overlayEl_: HTMLElement | null = null;
let textEl_: HTMLElement | null = null;

const getRandomMessage_ = () => {
  const randomIndex = Math.floor(Math.random() * messages_.length);
  const msg = messages_[randomIndex];

  return t7e(`loadingScreenMsgs.${msg}` as TranslationKey);
};

const ensureOverlayExists_ = (): HTMLElement => {
  if (overlayEl_ && overlayEl_.isConnected) {
    return overlayEl_;
  }

  overlayEl_ = document.createElement('div');
  overlayEl_.id = 'loading-overlay';

  const inner = document.createElement('div');

  inner.id = 'loading-overlay-inner';

  const spinner = document.createElement('div');

  spinner.id = 'loading-overlay-spinner';

  textEl_ = document.createElement('span');
  textEl_.id = 'loading-overlay-text';

  inner.appendChild(spinner);
  inner.appendChild(textEl_);
  overlayEl_.appendChild(inner);
  document.body.appendChild(overlayEl_);

  return overlayEl_;
};

/**
 * Show loading screen for a given time and then run callback
 *
 * Use -1 to show loading screen indefinitely and remove it manually
 */
export const showLoading = (callback?: () => void, delay?: number): void => {
  const overlay = ensureOverlayExists_();

  if (textEl_) {
    textEl_.textContent = getRandomMessage_();
  }

  ServiceLocator.getSoundManager()?.play(SoundNames.LOADING);

  fadeIn(overlay, 'flex', 500);

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
  const overlay = ensureOverlayExists_();

  if (textEl_) {
    textEl_.textContent = getRandomMessage_();
  }

  fadeIn(overlay, 'flex', 500);
};

export const hideLoading = () => {
  if (!overlayEl_) {
    return;
  }

  fadeOut(overlayEl_, 1000);
  ServiceLocator.getSoundManager()?.stop(SoundNames.LOADING);
};
