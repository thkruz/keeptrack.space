import { ChipList } from '@app/engine/ui/chip-list';
import { vi } from 'vitest';

describe('ChipList', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  const chips = () => host.querySelectorAll('.kt-chip');

  it('renders the empty placeholder when there are no items', () => {
    const list = new ChipList(host, { emptyText: 'Nothing here' });

    expect(list.getIds()).toEqual([]);
    expect(host.querySelector('.kt-chip-empty')?.textContent).toBe('Nothing here');
  });

  it('adds items and renders a chip with a remove button each', () => {
    const list = new ChipList(host);

    list.addItem({ id: 'a', label: 'Alpha' });
    list.addItem({ id: 'b', label: 'Bravo' });

    expect(chips()).toHaveLength(2);
    expect(host.querySelectorAll('.kt-chip-remove')).toHaveLength(2);
    expect(host.textContent).toContain('Alpha');
  });

  it('deduplicates by id', () => {
    const list = new ChipList(host);

    expect(list.addItem({ id: 'a', label: 'Alpha' })).toBe(true);
    expect(list.addItem({ id: 'a', label: 'Alpha again' })).toBe(false);
    expect(chips()).toHaveLength(1);
  });

  it('omits the remove button when removable is false', () => {
    const list = new ChipList(host);

    list.addItem({ id: 'a', label: 'Alpha', removable: false });

    expect(host.querySelector('.kt-chip-remove')).toBeNull();
  });

  it('removes a chip and fires onRemove when its button is clicked', () => {
    const onRemove = vi.fn();
    const list = new ChipList(host, { onRemove });

    list.addItem({ id: 'a', label: 'Alpha' });
    (host.querySelector('.kt-chip-remove') as HTMLElement).click();

    expect(onRemove).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a' }));
    expect(chips()).toHaveLength(0);
    expect(list.getIds()).toEqual([]);
  });

  it('setItems replaces the contents and getItems/getIds reflect order', () => {
    const list = new ChipList(host);

    list.setItems([
      { id: 'x', label: 'X' },
      { id: 'y', label: 'Y' },
    ]);

    expect(list.getIds()).toEqual(['x', 'y']);
    expect(list.has('y')).toBe(true);

    list.removeItem('x');
    expect(list.getIds()).toEqual(['y']);
  });

  it('clear empties the list and destroy detaches it', () => {
    const list = new ChipList(host);

    list.setItems([{ id: 'x', label: 'X' }]);
    list.clear();
    expect(chips()).toHaveLength(0);

    list.destroy();
    expect(host.childElementCount).toBe(0);
  });
});
