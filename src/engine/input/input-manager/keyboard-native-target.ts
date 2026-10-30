/** Native controls own activation keys; their descendants include SVG/icon content. */
export const isNativeKeyboardTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(target.closest('button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [contenteditable]:not([contenteditable="false"])'));

/** Tab traverses every focusable widget, including custom controls. */
export const isKeyboardFocusableTarget = (target: EventTarget | null): boolean =>
  isNativeKeyboardTarget(target) || (target instanceof Element && !target.matches('canvas') && Boolean(target.closest('[tabindex]')));
