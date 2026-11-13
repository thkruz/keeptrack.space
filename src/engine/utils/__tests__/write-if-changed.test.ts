import { describe, expect, it } from 'vitest';
import { writeHtmlIfChanged, writeTextIfChanged } from '../get-el';

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
