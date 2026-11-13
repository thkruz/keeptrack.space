import { describe, expect, it } from 'vitest';
import { writeAttrIfChanged, writeHtmlIfChanged, writeTextIfChanged, writeTitleIfChanged } from '../get-el';

const countMutations = (el: HTMLElement, fn: () => void): number => {
  const observer = new MutationObserver(() => undefined);

  observer.observe(el, { childList: true, characterData: true, subtree: true });
  fn();

  return observer.takeRecords().length;
};

describe('writeHtmlIfChanged', () => {
  it('writes once, then skips an unchanged value (no childList replacement)', () => {
    const el = document.createElement('div');

    expect(countMutations(el, () => writeHtmlIfChanged(el, '12.5&deg; <b>x</b>'))).toBe(1);
    expect(
      countMutations(el, () => {
        writeHtmlIfChanged(el, '12.5&deg; <b>x</b>');
        writeHtmlIfChanged(el, '12.5&deg; <b>x</b>');
      })
    ).toBe(0);
  });

  it('writes again when the value changes or the element was edited elsewhere', () => {
    const el = document.createElement('div');

    writeHtmlIfChanged(el, 'a');
    expect(writeHtmlIfChanged(el, 'b')).toBe(true);
    el.textContent = 'tampered';
    expect(writeHtmlIfChanged(el, 'b')).toBe(true);
    expect(el.innerHTML).toBe('b');
  });
});

describe('writeTextIfChanged', () => {
  it('skips an unchanged value and writes a changed one', () => {
    const el = document.createElement('span');

    expect(countMutations(el, () => writeTextIfChanged(el, 'Over Peru'))).toBe(1);
    expect(countMutations(el, () => writeTextIfChanged(el, 'Over Peru'))).toBe(0);
    expect(writeTextIfChanged(el, 'Over Chile')).toBe(true);
  });
});

describe('writeAttrIfChanged', () => {
  it('skips an identical attribute value (no attribute mutation record) and writes a changed one', () => {
    const el = document.createElement('div');
    const observer = new MutationObserver(() => undefined);

    expect(writeAttrIfChanged(el, 'kt-tooltip', '1.00')).toBe(true);
    observer.observe(el, { attributes: true });
    expect(writeAttrIfChanged(el, 'kt-tooltip', '1.00')).toBe(false);
    expect(observer.takeRecords()).toHaveLength(0);
    expect(writeAttrIfChanged(el, 'kt-tooltip', '2.00')).toBe(true);
    expect(observer.takeRecords()).toHaveLength(1);
    expect(el.getAttribute('kt-tooltip')).toBe('2.00');
  });
});

describe('writeTitleIfChanged', () => {
  it('skips a repeated title, including the empty title once the attribute exists', () => {
    const el = document.createElement('div');
    const observer = new MutationObserver(() => undefined);

    observer.observe(el, { attributes: true });
    expect(writeTitleIfChanged(el, '')).toBe(true);
    observer.takeRecords();
    expect(writeTitleIfChanged(el, '')).toBe(false);
    expect(writeTitleIfChanged(el, '12.5')).toBe(true);
    expect(writeTitleIfChanged(el, '12.5')).toBe(false);
    expect(el.title).toBe('12.5');
  });
});
