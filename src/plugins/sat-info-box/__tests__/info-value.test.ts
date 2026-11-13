import { getEl } from '@app/engine/utils/get-el';
import { createInfoCircle, INFO_CIRCLE_CLASS, infoCircleHtml, plainValueText, setValueWithInfo } from '../info-value';

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

  it('setValueWithInfo restores an emptied "i" glyph (deselect blanked the circle text, #277)', () => {
    setValueWithInfo('v', 'LEO', 'Low Earth orbit.');
    const circle = getEl('v')!.querySelector(`.${INFO_CIRCLE_CLASS}`) as HTMLElement;

    circle.textContent = '';
    setValueWithInfo('v', 'LEO', 'Low Earth orbit.');

    expect((getEl('v')!.querySelector(`.${INFO_CIRCLE_CLASS}`) as HTMLElement).textContent).toBe('i');
  });

  it('setValueWithInfo keeps the same circle node when nothing changed (focus survives refresh)', () => {
    setValueWithInfo('v', 'LEO', 'Low Earth orbit.');
    const circle = getEl('v')!.querySelector(`.${INFO_CIRCLE_CLASS}`) as HTMLElement;

    circle.focus();
    setValueWithInfo('v', 'LEO', 'Low Earth orbit.');

    expect(getEl('v')!.querySelector(`.${INFO_CIRCLE_CLASS}`)).toBe(circle);
    expect(document.activeElement).toBe(circle);
  });

  it('setValueWithInfo rewrites when the value or explanation changes', () => {
    setValueWithInfo('v', 'LEO', 'Low Earth orbit.');
    setValueWithInfo('v', 'GEO', 'Geostationary.');

    expect(getEl('v')!.firstChild?.textContent).toBe('GEO');
    expect(getEl('v')!.querySelector(`.${INFO_CIRCLE_CLASS}`)?.getAttribute('kt-tooltip')).toBe('Geostationary.');
  });

  it('a changed explanation updates the same circle in place so a hovered tooltip follows (#274)', () => {
    setValueWithInfo('v', 'GEO', 'Geostationary orbit.');
    const circle = getEl('v')!.querySelector(`.${INFO_CIRCLE_CLASS}`) as HTMLElement;

    setValueWithInfo('v', 'MEO', 'Medium Earth orbit.');

    expect(getEl('v')!.querySelector(`.${INFO_CIRCLE_CLASS}`)).toBe(circle);
    expect(circle.getAttribute('kt-tooltip')).toBe('Medium Earth orbit.');
    expect(getEl('v')!.firstChild?.textContent).toBe('MEO');
  });

  it('plainValueText leaves the circle glyph out (#300)', () => {
    setValueWithInfo('v', 'LEO', 'Low Earth orbit.');

    expect(plainValueText(getEl('v'))).toBe('LEO');
  });
});
