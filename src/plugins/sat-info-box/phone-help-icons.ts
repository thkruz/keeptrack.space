import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { TooltipsPlugin } from '../tooltips/tooltips';

/**
 * Phone layout (pro issue #464): a label with a kt-tooltip is a tap target, which forced 45 px rows. On phones the
 * tooltip moves from the label to a small help icon after it, so the row itself is read-only and can be 30 px.
 * Laptop keeps the tooltip on the label. The conversion is reversible so rotating or resizing across the phone
 * breakpoint restores the label tooltip.
 */
export const PHONE_QUERY = '(max-width: 639px), (max-height: 500px) and (max-width: 1000px)';
export const HELP_ICON_CLASS = 'sat-info-help-icon';
/** Holds the label's tooltip text while it lives on the help icon. */
export const STASH_ATTR = 'data-label-tooltip';

const isPhone_ = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;

const toPhone_ = (key: Element): void => {
  const text = key.getAttribute('kt-tooltip');

  // Keys with an inline help toggle (--help) are real buttons and keep their own behaviour.
  if (!text || key.classList.contains('sat-info-key--help') || key.querySelector(`.${HELP_ICON_CLASS}`)) {
    return;
  }
  const icon = document.createElement('span');

  icon.className = HELP_ICON_CLASS;
  icon.tabIndex = 0;
  icon.setAttribute('role', 'button');
  icon.setAttribute('aria-label', text);
  icon.setAttribute('kt-tooltip', text);
  icon.setAttribute('kt-tooltip-tap', '');
  key.setAttribute(STASH_ATTR, text);
  key.removeAttribute('kt-tooltip');
  key.appendChild(icon);
  PluginRegistry.getPlugin(TooltipsPlugin)?.createTooltip(icon);
};

const toLaptop_ = (key: Element): void => {
  const text = key.getAttribute(STASH_ATTR);

  key.querySelector(`.${HELP_ICON_CLASS}`)?.remove();
  if (text) {
    key.setAttribute('kt-tooltip', text);
    key.removeAttribute(STASH_ATTR);
  }
};

/** Idempotent: moves every label tooltip in `root` to or from a help icon depending on the viewport. */
export const syncPhoneHelpIcons = (root: ParentNode | null, phone: boolean = isPhone_()): void => {
  if (!root) {
    return;
  }
  if (phone) {
    root.querySelectorAll('.sat-info-key[kt-tooltip]').forEach(toPhone_);
  } else {
    root.querySelectorAll(`.sat-info-key[${STASH_ATTR}]`).forEach(toLaptop_);
  }
};

/** Keeps `root` in sync: new rows added by plugins and viewport changes. Returns a disposer. */
export const watchPhoneHelpIcons = (root: HTMLElement): (() => void) => {
  let queued = false;
  const run = (): void => {
    queued = false;
    syncPhoneHelpIcons(root);
  };
  const schedule = (): void => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(run);
    }
  };
  const observer = new MutationObserver(schedule);
  const mql = typeof window.matchMedia === 'function' ? window.matchMedia(PHONE_QUERY) : null;

  observer.observe(root, { childList: true, subtree: true });
  mql?.addEventListener?.('change', schedule);
  run();

  return () => {
    observer.disconnect();
    mql?.removeEventListener?.('change', schedule);
  };
};
