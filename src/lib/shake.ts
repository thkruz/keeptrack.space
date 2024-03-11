export const shake = (el: HTMLElement | HTMLDivElement | null, duration?: number, callback?: () => void): void => {
  if (!el) {
    console.warn('Element not found!');
    return;
  }

  if (el.classList.contains('shake')) return;

  duration ??= 500;
  el.classList.add('shake');
  setTimeout(() => {
    el.classList.remove('shake');
    if (callback) callback();
  }, duration);
};
