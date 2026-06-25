/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * chip-list.ts is a small, app-agnostic "chips" UI primitive: a list of labeled
 * tokens, each with an optional remove (x) button. It owns the DOM inside a host
 * element and exposes add/remove/set/get methods plus an onRemove callback. It has
 * no dependency on satellites, sensors, or any plugin, so it can back any chip UI
 * (sensor pickers, satellite lists, filters, watchlists, ...).
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import './chip-list.css';

export interface ChipListItem {
  /** Stable unique key for the chip. */
  id: string;
  /** Text shown on the chip. */
  label: string;
  /** Optional tooltip / longer description. */
  title?: string;
  /** When false, the chip has no remove button. Defaults to true. */
  removable?: boolean;
}

export interface ChipListOptions {
  /** Invoked when the user clicks a chip's remove button, after the chip is removed. */
  onRemove?: (id: string, item: ChipListItem) => void;
  /** Placeholder shown when there are no chips. */
  emptyText?: string;
  /** Accessible label for the list container. */
  ariaLabel?: string;
}

/**
 * Renders and manages a list of removable chips inside a host element. The host's
 * existing contents are replaced. Call {@link destroy} to detach listeners.
 */
export class ChipList {
  private readonly host_: HTMLElement;
  private readonly listEl_: HTMLElement;
  private readonly options_: ChipListOptions;
  private items_: ChipListItem[] = [];

  constructor(host: HTMLElement, options: ChipListOptions = {}) {
    this.host_ = host;
    this.options_ = options;

    this.listEl_ = document.createElement('div');
    this.listEl_.className = 'kt-chip-list';
    this.listEl_.setAttribute('role', 'list');
    if (options.ariaLabel) {
      this.listEl_.setAttribute('aria-label', options.ariaLabel);
    }

    this.host_.replaceChildren(this.listEl_);
    this.listEl_.addEventListener('click', this.onClick_);
    this.render_();
  }

  /** Replaces all chips. */
  setItems(items: ChipListItem[]): void {
    this.items_ = items.slice();
    this.render_();
  }

  /** Returns a copy of the current chips, in display order. */
  getItems(): ChipListItem[] {
    return this.items_.slice();
  }

  /** Returns the ids of the current chips, in display order. */
  getIds(): string[] {
    return this.items_.map((item) => item.id);
  }

  /** Adds a chip. No-op when a chip with the same id already exists. Returns true when added. */
  addItem(item: ChipListItem): boolean {
    if (this.items_.some((existing) => existing.id === item.id)) {
      return false;
    }
    this.items_.push(item);
    this.render_();

    return true;
  }

  /** Removes the chip with the given id, if present. Does not fire onRemove. */
  removeItem(id: string): void {
    const next = this.items_.filter((item) => item.id !== id);

    if (next.length !== this.items_.length) {
      this.items_ = next;
      this.render_();
    }
  }

  /** Removes all chips. Does not fire onRemove. */
  clear(): void {
    if (this.items_.length === 0) {
      return;
    }
    this.items_ = [];
    this.render_();
  }

  /** Whether a chip with the given id exists. */
  has(id: string): boolean {
    return this.items_.some((item) => item.id === id);
  }

  /** Detaches the click listener and empties the host. */
  destroy(): void {
    this.listEl_.removeEventListener('click', this.onClick_);
    this.host_.replaceChildren();
  }

  private readonly onClick_ = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const removeBtn = target.closest<HTMLElement>('.kt-chip-remove');

    if (!removeBtn) {
      return;
    }

    const id = removeBtn.dataset.chipId;

    if (typeof id === 'undefined') {
      return;
    }

    const item = this.items_.find((existing) => existing.id === id);

    this.removeItem(id);
    if (item) {
      this.options_.onRemove?.(id, item);
    }
  };

  private render_(): void {
    this.listEl_.replaceChildren();

    if (this.items_.length === 0) {
      if (this.options_.emptyText) {
        const empty = document.createElement('span');

        empty.className = 'kt-chip-empty';
        empty.textContent = this.options_.emptyText;
        this.listEl_.appendChild(empty);
      }

      return;
    }

    for (const item of this.items_) {
      this.listEl_.appendChild(this.buildChip_(item));
    }
  }

  private buildChip_(item: ChipListItem): HTMLElement {
    const chip = document.createElement('span');

    chip.className = 'kt-chip';
    chip.setAttribute('role', 'listitem');
    chip.dataset.chipId = item.id;
    if (item.title) {
      chip.title = item.title;
    }

    const label = document.createElement('span');

    label.className = 'kt-chip-label';
    label.textContent = item.label;
    chip.appendChild(label);

    if (item.removable !== false) {
      const remove = document.createElement('button');

      remove.type = 'button';
      remove.className = 'kt-chip-remove';
      remove.dataset.chipId = item.id;
      remove.setAttribute('aria-label', `Remove ${item.label}`);
      remove.textContent = '×';
      chip.appendChild(remove);
    }

    return chip;
  }
}
