import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { getEl, requestIdleWrite } from '@app/engine/utils/get-el';
import { TooltipsPlugin } from '../tooltips/tooltips';

/**
 * Shared pattern for info box values that need an explanation: the value shows only the short term
 * ("TEME", "LEO") followed by a small info circle whose kt-tooltip holds the explanation. The circle is
 * keyboard focusable (the tooltip plugin shows it on keyboard focus) and carries an aria-label.
 */
export const INFO_CIRCLE_CLASS = 'sat-info-circle';

const escapeAttr_ = (text: string): string => text.replace(/&/gu, '&amp;').replace(/"/gu, '&quot;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

/** Builds the info circle element for an explanation. */
export const createInfoCircle = (explanation: string): HTMLElement => {
  const circle = document.createElement('span');

  circle.className = INFO_CIRCLE_CLASS;
  circle.tabIndex = 0;
  circle.setAttribute('role', 'img');
  circle.setAttribute('aria-label', explanation);
  circle.setAttribute('kt-tooltip', explanation);
  circle.textContent = 'i';

  return circle;
};

/** HTML form of the same markup, for static row templates. */
export const infoCircleHtml = (explanation: string): string => {
  const safe = escapeAttr_(explanation);

  return `<span class="${INFO_CIRCLE_CLASS}" tabindex="0" role="img" aria-label="${safe}" kt-tooltip="${safe}">i</span>`;
};

/**
 * Writes `shortText` into the element with `id`, followed by an info circle when `explanation` is given.
 * Goes through the same idle write queue as setInnerHtml so later plain writes to the element stay ordered.
 */
export const setValueWithInfo = (id: string, shortText: string, explanation?: string): void => {
  requestIdleWrite(() => {
    const el = getEl(id, true);

    if (!el) {
      return;
    }

    el.textContent = shortText;

    if (explanation) {
      const circle = createInfoCircle(explanation);

      el.appendChild(circle);
      PluginRegistry.getPlugin(TooltipsPlugin)?.createTooltip(circle);
    }
  });
};
