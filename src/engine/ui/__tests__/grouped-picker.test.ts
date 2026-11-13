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

describe('GroupedPicker keyboard and multi-select', () => {
  it('marks the search box keyboard-priority and stops typed keys at the drawer', () => {
    const { picker } = build();
    const outer = vi.fn();

    document.body.addEventListener('keydown', outer);
    picker.open();
    const search = document.querySelector('.kt-picker-search') as HTMLInputElement;

    expect(search.classList.contains('keyboard-priority')).toBe(true);
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    expect(outer).not.toHaveBeenCalled();
    document.body.removeEventListener('keydown', outer);
  });

  it('toggles several options in multiple mode and keeps the drawer open', () => {
    document.body.innerHTML = `<select id="m" multiple>
      <optgroup label="USA"><option value="a">Cape</option><option value="b">Vandenberg</option></optgroup></select>`;
    const select = document.getElementById('m') as HTMLSelectElement;
    const onChange = vi.fn();

    select.addEventListener('change', onChange);
    const picker = new GroupedPicker(select, { title: 'Sites', multiple: true, emptyText: 'None chosen' });

    expect(document.querySelector('.kt-picker-trigger')?.textContent).toBe('None chosen');
    picker.open();
    const items = document.querySelectorAll<HTMLElement>('.kt-picker-item');

    items[0].click();
    document.querySelectorAll<HTMLElement>('.kt-picker-item')[1].click();
    expect(Array.from(select.selectedOptions).map((o) => o.value)).toEqual(['a', 'b']);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(picker.isOpen()).toBe(true);
    expect(document.querySelector('.kt-picker-trigger')?.textContent).toBe('Cape, Vandenberg');
    document.querySelectorAll<HTMLElement>('.kt-picker-item')[0].click();
    expect(Array.from(select.selectedOptions).map((o) => o.value)).toEqual(['b']);
  });

  it('moves focus with arrow keys from the search box through headings and items', () => {
    const { picker } = build();

    picker.open();
    const search = document.querySelector<HTMLInputElement>('.kt-picker-search')!;
    const press = (key: string): void => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    };

    expect(document.activeElement).toBe(search);
    press('ArrowDown');
    expect(document.activeElement?.tagName).toBe('SUMMARY');
    press('ArrowDown');
    expect(document.activeElement?.className).toContain('kt-picker-item');
    press('ArrowUp');
    press('ArrowUp');
    expect(document.activeElement).toBe(search);
  });
});
