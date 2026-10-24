import { errorManagerInstance } from '@app/engine/utils/errorManager';

const EASING_EXIT = 'cubic-bezier(0.4, 0, 1, 1)';
const EASING_ENTER = 'cubic-bezier(0, 0, 0.2, 1)';

// Menu transitions own interaction state; generic animations such as Colorbox
// retain their existing callback and detached-element behavior.
const sideMenuTransitions_ = new WeakMap<HTMLElement, object>();

const beginSideMenuTransition_ = (element: HTMLElement, opening: boolean): object | null => {
  if (!element.classList.contains('side-menu-parent')) {
    return null;
  }
  const token = {};

  sideMenuTransitions_.set(element, token);
  element.toggleAttribute('inert', !opening);

  return token;
};

const isCurrentTransition_ = (element: HTMLElement, token: object | null): boolean => token === null || (element.isConnected && sideMenuTransitions_.get(element) === token);

export const slideOutLeft = (el: HTMLElement | null, duration: number, callback?: (() => void) | null, offset?: number): void => {
  if (!el) {
    errorManagerInstance.debug('Element not found!');

    return;
  }

  const transition = beginSideMenuTransition_(el, false);

  if (el.style.display === 'none') {
    return;
  }
  el.style.transition = `transform ${duration / 1000}s ${EASING_EXIT}`;
  el.style.transform = `translateX(${offset ?? -120}%)`;
  setTimeout(() => {
    if (!isCurrentTransition_(el, transition)) {
      return;
    }
    if (callback) {
      callback();
    }
  }, duration);
};
/**
 * Causes the HTML Element to slide in from the right
 */

export const slideInRight = (el: HTMLElement | null, duration: number, callback?: () => void): void => {
  if (!el) {
    errorManagerInstance.debug('Element not found!');

    return;
  }

  const transition = beginSideMenuTransition_(el, true);

  // Start off the screen
  el.style.display = 'block';
  el.style.transform = 'translateX(-120%)';
  el.style.transition = `transform 0s ${EASING_ENTER}`;
  setTimeout(() => {
    if (!isCurrentTransition_(el, transition)) {
      return;
    }
    el.style.display = 'block';
    el.style.transition = `transform ${duration / 1000}s ${EASING_ENTER}`;
    el.style.transform = 'translateX(0)';
  }, 16);
  setTimeout(() => {
    if (!isCurrentTransition_(el, transition)) {
      return;
    }
    if (callback) {
      callback();
    }
  }, duration);
};
/**
 * Causes the HTML Element to slide out to the top
 */

export const slideOutUp = (el: HTMLElement, duration: number, callback?: () => void): void => {
  if (!el) {
    errorManagerInstance.debug('Element not found!');

    return;
  }

  if (el.style.display === 'none') {
    return;
  }
  el.style.transition = `transform ${duration / 1000}s ${EASING_EXIT}`;
  el.style.transform = `translateY(${-120}%)`;
  setTimeout(() => {
    if (callback) {
      callback();
    }
  }, duration);
};

export const slideInDown = (el: HTMLElement, duration: number, callback?: () => void): void => {
  if (!el) {
    errorManagerInstance.debug('Element not found!');

    return;
  }

  el.style.transform = 'translateY(-120%)';
  el.style.transition = `transform 0s ${EASING_ENTER}`;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'block';
    el.style.transition = `transform ${duration / 1000}s ${EASING_ENTER}`;
    el.style.transform = 'translateY(0)';
    if (callback) {
      callback();
    }
  }, 16);
};
