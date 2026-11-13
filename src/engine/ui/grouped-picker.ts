/**
 * grouped-picker.ts is a reusable "app drawer" picker: it enhances a native `<select>` that uses
 * `<optgroup>`s. The select stays in the DOM (hidden) as the source of truth, so existing code that reads
 * `select.value` or listens for `change` keeps working. A trigger button shows the current choice; clicking
 * it opens a drawer with a search box and collapsible groups. Choosing an entry sets the select's value and
 * dispatches `change`. Options are re-read each time the drawer opens. No dependency on any plugin.
 */
import './grouped-picker.css';

export interface GroupedPickerOptions {
  /** Drawer heading and accessible name. */
  title: string;
  /** Placeholder for the search box. */
  searchPlaceholder?: string;
  /** Text for the empty-search state. */
  noResultsText?: string;
  /** Multi-select mode: items toggle, the drawer stays open, the trigger shows a summary. */
  multiple?: boolean;
  /** Trigger text when nothing is selected in multiple mode. */
  emptyText?: string;
  /** Trigger summary in multiple mode; receives the selected labels. Defaults to a comma list. */
  summarize?: (labels: string[]) => string;
}

interface PickerGroup {
  label: string;
  options: { value: string; text: string }[];
}

const cleanText_ = (el: Element): string => (el.textContent ?? '').replace(/\s+/gu, ' ').trim();

export class GroupedPicker {
  private readonly select_: HTMLSelectElement;
  private readonly options_: GroupedPickerOptions;
  private readonly trigger_: HTMLButtonElement;
  private drawer_: HTMLElement | null = null;
  private searchEl_: HTMLInputElement | null = null;
  private bodyEl_: HTMLElement | null = null;
  private groups_: PickerGroup[] = [];
  private readonly onSelectChange_ = (): void => this.updateTrigger_();
  private readonly onKeyDown_ = (e: KeyboardEvent): void => {
    // Keep typed letters and arrows from reaching the global shortcut handlers.
    e.stopPropagation();
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      this.moveFocus_(e);
    }
  };

  constructor(select: HTMLSelectElement, options: GroupedPickerOptions) {
    this.select_ = select;
    this.options_ = options;
    select.classList.add('no-autoinit', 'kt-picker-source');
    select.style.display = 'none';

    this.trigger_ = document.createElement('button');
    this.trigger_.type = 'button';
    this.trigger_.className = 'kt-picker-trigger';
    this.trigger_.setAttribute('aria-haspopup', 'dialog');
    this.trigger_.setAttribute('aria-expanded', 'false');
    this.trigger_.addEventListener('click', () => this.open());
    select.after(this.trigger_);

    select.addEventListener('change', this.onSelectChange_);
    this.updateTrigger_();
  }

  /** Text of the currently selected option, whitespace-collapsed. */
  getSelectedText(): string {
    const opt = this.select_.selectedOptions?.[0];

    return opt ? cleanText_(opt) : '';
  }

  /** Re-syncs the trigger text with the select (call after setting `select.value` without a change event). */
  refresh(): void {
    this.updateTrigger_();
  }

  isOpen(): boolean {
    return !!this.drawer_;
  }

  open(): void {
    if (this.drawer_) {
      return;
    }
    this.groups_ = this.readGroups_();

    const drawer = document.createElement('div');

    drawer.className = 'kt-picker-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', this.options_.title);

    const head = document.createElement('div');

    head.className = 'kt-picker-head';
    const title = document.createElement('span');

    title.className = 'kt-picker-title';
    title.textContent = this.options_.title;
    const closeBtn = document.createElement('button');

    closeBtn.type = 'button';
    closeBtn.className = 'kt-picker-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.close());
    head.append(title, closeBtn);

    const search = document.createElement('input');

    search.type = 'search';
    search.className = 'kt-picker-search keyboard-priority';
    search.placeholder = this.options_.searchPlaceholder ?? '';
    search.setAttribute('aria-label', this.options_.searchPlaceholder ?? this.options_.title);
    search.addEventListener('input', () => this.render_());

    const body = document.createElement('div');

    body.className = 'kt-picker-body';
    body.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('[data-picker-value]');

      if (item) {
        this.choose_(item.dataset.pickerValue ?? '');
      }
    });

    drawer.append(head, search, body);
    drawer.addEventListener('keydown', this.onKeyDown_);
    document.body.appendChild(drawer);
    this.drawer_ = drawer;
    this.searchEl_ = search;
    this.bodyEl_ = body;
    this.trigger_.setAttribute('aria-expanded', 'true');
    this.render_();
    search.focus();
  }

  close(): void {
    if (!this.drawer_) {
      return;
    }
    this.drawer_.remove();
    this.drawer_ = null;
    this.searchEl_ = null;
    this.bodyEl_ = null;
    this.trigger_.setAttribute('aria-expanded', 'false');
    this.trigger_.focus();
  }

  destroy(): void {
    this.close();
    this.select_.removeEventListener('change', this.onSelectChange_);
    this.trigger_.remove();
    this.select_.style.display = '';
    this.select_.classList.remove('kt-picker-source');
  }

  private choose_(value: string): void {
    if (this.options_.multiple) {
      const opt = Array.from(this.select_.options).find((o) => o.value === value);

      if (opt) {
        opt.selected = !opt.selected;
      }
      this.select_.dispatchEvent(new Event('change', { bubbles: true }));
      this.updateTrigger_();
      this.render_();

      return;
    }
    this.select_.value = value;
    this.select_.dispatchEvent(new Event('change', { bubbles: true }));
    this.updateTrigger_();
    this.close();
  }

  private updateTrigger_(): void {
    if (this.options_.multiple) {
      const labels = Array.from(this.select_.selectedOptions).map(cleanText_);

      this.trigger_.textContent = labels.length === 0 ? (this.options_.emptyText ?? this.options_.title) : (this.options_.summarize?.(labels) ?? labels.join(', '));
      this.trigger_.title = this.options_.title;

      return;
    }
    this.trigger_.textContent = this.getSelectedText() || this.options_.title;
    this.trigger_.title = this.options_.title;
  }

  /** Arrow/Home/End navigation over the search box, group headings and visible items. */
  private moveFocus_(e: KeyboardEvent): void {
    if (!this.drawer_ || !this.searchEl_ || !this.bodyEl_) {
      return;
    }
    const stops: HTMLElement[] = [this.searchEl_];

    this.bodyEl_.querySelectorAll<HTMLElement>('summary, .kt-picker-item').forEach((el) => {
      const details = el.closest('details');

      if (el.tagName === 'SUMMARY' || !details || details.open) {
        stops.push(el);
      }
    });
    const cur = stops.indexOf(document.activeElement as HTMLElement);
    let next = cur;

    if (e.key === 'ArrowDown') {
      next = Math.min(stops.length - 1, cur + 1);
    } else if (e.key === 'ArrowUp') {
      next = Math.max(0, cur - 1);
    } else if (cur > 0) {
      // Home/End move within the list only (the search box keeps its caret keys).
      next = e.key === 'Home' ? 1 : stops.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    stops[next]?.focus();
    stops[next]?.scrollIntoView?.({ block: 'nearest' });
  }

  private readGroups_(): PickerGroup[] {
    const groups: PickerGroup[] = [];
    const loose: PickerGroup = { label: '', options: [] };

    for (const child of Array.from(this.select_.children)) {
      if (child.tagName === 'OPTGROUP') {
        groups.push({
          label: child.getAttribute('label') ?? '',
          options: Array.from(child.querySelectorAll('option')).map((o) => ({ value: o.value, text: cleanText_(o) })),
        });
      } else if (child.tagName === 'OPTION') {
        loose.options.push({ value: (child as HTMLOptionElement).value, text: cleanText_(child) });
      }
    }

    return loose.options.length > 0 ? [loose, ...groups] : groups;
  }

  private render_(): void {
    if (!this.bodyEl_) {
      return;
    }
    const query = (this.searchEl_?.value ?? '').trim().toLowerCase();
    const selectedSet = new Set(this.options_.multiple ? Array.from(this.select_.selectedOptions).map((o) => o.value) : [this.select_.value]);
    const frag = document.createDocumentFragment();
    let shown = 0;

    for (const group of this.groups_) {
      const groupMatches = query !== '' && group.label.toLowerCase().includes(query);
      const opts = query === '' || groupMatches ? group.options : group.options.filter((o) => o.text.toLowerCase().includes(query));

      if (opts.length === 0) {
        continue;
      }
      shown += opts.length;

      const details = document.createElement('details');

      details.className = 'kt-picker-group';
      // Collapsed by default; a search or the group holding the current choice opens it.
      details.open = !group.label || query !== '' || opts.some((o) => selectedSet.has(o.value));
      if (group.label) {
        const summary = document.createElement('summary');

        summary.textContent = `${group.label} (${opts.length})`;
        details.appendChild(summary);
      }
      for (const o of opts) {
        const btn = document.createElement('button');

        btn.type = 'button';
        btn.className = 'kt-picker-item';
        btn.dataset.pickerValue = o.value;
        btn.textContent = o.text;
        if (selectedSet.has(o.value)) {
          btn.classList.add('kt-picker-item-selected');
          btn.setAttribute(this.options_.multiple ? 'aria-pressed' : 'aria-current', 'true');
        } else if (this.options_.multiple) {
          btn.setAttribute('aria-pressed', 'false');
        }
        details.appendChild(btn);
      }
      frag.appendChild(details);
    }

    if (shown === 0) {
      const empty = document.createElement('div');

      empty.className = 'kt-picker-empty';
      empty.textContent = this.options_.noResultsText ?? '';
      frag.appendChild(empty);
    }
    this.bodyEl_.replaceChildren(frag);
  }
}
