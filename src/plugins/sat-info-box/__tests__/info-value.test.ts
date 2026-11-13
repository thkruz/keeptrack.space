import { getEl } from '@app/engine/utils/get-el';
import { createInfoCircle, INFO_CIRCLE_CLASS, infoCircleHtml, setValueWithInfo } from '../info-value';

describe('info-value helper (#191)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="v"></div>';
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => cb());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createInfoCircle is focusable, labelled and carries the tooltip', () => {
    const circle = createInfoCircle('from the GP element set');

    expect(circle.className).toBe(INFO_CIRCLE_CLASS);
    expect(circle.tabIndex).toBe(0);
    expect(circle.getAttribute('aria-label')).toBe('from the GP element set');
    expect(circle.getAttribute('kt-tooltip')).toBe('from the GP element set');
  });

  it('infoCircleHtml escapes quotes in the explanation', () => {
    expect(infoCircleHtml('a "b" <c>')).toContain('aria-label="a &quot;b&quot; &lt;c&gt;"');
  });

  it('setValueWithInfo writes the short value then the circle', () => {
    setValueWithInfo('v', 'TEME', 'from the GP element set');
    const el = getEl('v')!;

    expect(el.firstChild?.textContent).toBe('TEME');
    expect(el.querySelector(`.${INFO_CIRCLE_CLASS}`)?.getAttribute('aria-label')).toBe('from the GP element set');
  });

  it('setValueWithInfo without an explanation adds no circle', () => {
    setValueWithInfo('v', 'LEO');
    expect(getEl('v')!.querySelector(`.${INFO_CIRCLE_CLASS}`)).toBeNull();
  });
});
