import { describe, expect, it, vi } from 'vitest';
import { GroupedPicker } from '../grouped-picker';

const build = () => {
  document.body.innerHTML = `<div><select id="s">
    <optgroup label="USA"><option value="a">Cape - SLC 40</option><option value="b">Vandenberg - SLC 4</option></optgroup>
    <optgroup label="Russia"><option value="c">Plesetsk - Site 43</option></optgroup></select></div>`;
  const select = document.getElementById('s') as HTMLSelectElement;
  const picker = new GroupedPicker(select, { title: 'Facility', searchPlaceholder: 'Search', noResultsText: 'None' });

  return { select, picker };
};

describe('GroupedPicker', () => {
  it('hides the select and shows the selected text on the trigger', () => {
    const { select } = build();

    expect(select.style.display).toBe('none');
    expect(document.querySelector('.kt-picker-trigger')?.textContent).toBe('Cape - SLC 40');
  });

  it('collapses groups that do not hold the selection', () => {
    const { picker } = build();

    picker.open();
    const groups = document.querySelectorAll<HTMLDetailsElement>('.kt-picker-group');

    expect(groups).toHaveLength(2);
    expect(groups[0].open).toBe(true);
    expect(groups[1].open).toBe(false);
  });

  it('filters by option text and by group label, opening matches', () => {
    const { picker } = build();

    picker.open();
    const search = document.querySelector('.kt-picker-search') as HTMLInputElement;

    search.value = 'plesetsk';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('.kt-picker-item')).toHaveLength(1);
    search.value = 'usa';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('.kt-picker-item')).toHaveLength(2);
    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelector('.kt-picker-empty')?.textContent).toBe('None');
  });

  it('choosing an item sets the value, fires change, updates the trigger and closes', () => {
    const { select, picker } = build();
    const onChange = vi.fn();

    select.addEventListener('change', onChange);
    picker.open();
    (document.querySelector('[data-picker-value="c"]') as HTMLElement).click();
    expect(select.value).toBe('c');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.kt-picker-trigger')?.textContent).toBe('Plesetsk - Site 43');
    expect(picker.isOpen()).toBe(false);
  });

  it('follows external value changes and closes on Escape', () => {
    const { select, picker } = build();

    select.value = 'b';
    select.dispatchEvent(new Event('change'));
    expect(document.querySelector('.kt-picker-trigger')?.textContent).toBe('Vandenberg - SLC 4');
    picker.open();
    document.querySelector('.kt-picker-search')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(picker.isOpen()).toBe(false);
  });
});
