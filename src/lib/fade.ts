
export const fadeIn = (el: HTMLElement, type?: string, duration?: number, callback?: () => void): void => {
  // Avoid errors for now TODO: Throw an error here
  if (!el) {
    return;
  }

  type ??= 'block';
  if (el.style.display === type) {
    return;
  }
  duration = duration ?? 1000;
  el.style.transition = `opacity ${duration / 1000}s ease-in-out`;
  el.style.display = type;
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.transition = 'none';
    // eslint-disable-next-line callback-return
    callback?.();
  }, duration);
};

export const fadeOut = (el: HTMLElement, duration?: number, callback?: () => void): void => {
  // Avoid errors for now TODO: Throw an error here
  if (!el) {
    return;
  }

  if (el.style.display === 'none') {
    return;
  }
  duration = duration ?? 1000;
  el.style.opacity = '0';
  el.style.transition = `opacity ${duration / 1000}s ease-in-out`;
  setTimeout(() => {
    el.style.display = 'none';
    // eslint-disable-next-line callback-return
    callback?.();
  }, duration);
};
