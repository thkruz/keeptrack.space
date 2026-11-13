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
  circle.setAttribute('kt-tooltip-tap', '');
  circle.textContent = 'i';

  return circle;
};

/** HTML form of the same markup, for static row templates. */
export const infoCircleHtml = (explanation: string): string => {
  const safe = escapeAttr_(explanation);

  return `<span class="${INFO_CIRCLE_CLASS}" tabindex="0" role="img" aria-label="${safe}" kt-tooltip="${safe}" kt-tooltip-tap>i</span>`;
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

    // The info box refreshes rows about twice a second. Rewriting an unchanged row would detach a
    // focused or hovered info circle, so leave the DOM alone when nothing changed.
    const existing = el.querySelector(`.${INFO_CIRCLE_CLASS}`);
    const currentText = existing ? el.firstChild?.textContent : el.textContent;
    const isSame =
      currentText === shortText &&
      (!existing || existing.textContent === 'i') &&
      (explanation ? existing?.getAttribute('kt-tooltip') === explanation : !existing) &&
      el.childNodes.length === (explanation ? 2 : 1);

    if (isSame) {
      return;
    }

    // Same circle, new text: update it in place so a hovered or focused circle keeps its tooltip and the visible
    // tooltip follows the new selection instead of showing the previous object's text (#274)
    if (explanation && existing instanceof HTMLElement && el.firstChild?.nodeType === Node.TEXT_NODE && el.childNodes.length === 2) {
      el.firstChild.textContent = shortText;
      existing.textContent = 'i';
      existing.setAttribute('aria-label', explanation);
      existing.setAttribute('kt-tooltip', explanation);
      PluginRegistry.getPlugin(TooltipsPlugin)?.refreshTooltip(existing);

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

/** Plain text of an info box element with the info circles ("i") left out, for copy / export. */
export const plainValueText = (el: Element | null | undefined): string => {
  if (!el) {
    return '';
  }
  const clone = el.cloneNode(true) as Element;

  clone.querySelectorAll(`.${INFO_CIRCLE_CLASS}`).forEach((c) => {
    c.remove();
  });

  return (clone.textContent ?? '').replace(/\s+/gu, ' ').trim();
};
