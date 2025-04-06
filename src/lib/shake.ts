export const shake = (el: HTMLElement | HTMLDivElement | null, duration?: number, callback?: () => void): void => {
  if (!el) {
    // eslint-disable-next-line no-console
    console.warn('Element not found!');

    return;
  }

  if (el.classList.contains('shake')) {
    return;
  }

  duration ??= 500;
  el.classList.add('shake');
  setTimeout(() => {
    el.classList.remove('shake');
    if (callback) {
      // eslint-disable-next-line callback-return
      callback();
    }
  }, duration);
};
