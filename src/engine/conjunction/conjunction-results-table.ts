/**
 * Generic, column-configurable results table for the Conjunctions family.
 *
 * Conjunction tools all render a list of approaches into a `<table>` whose rows
 * are clickable; only the columns differ (TOCA/POCA shows RIC + countdown,
 * Debris Screening shows Pc + risk, etc.). This renderer owns the shared
 * structure - a `<thead>` of headers and a `<tbody>` of rows that carry the
 * row class plus `data-*` hooks the plugin's delegated click handler reads -
 * so each tool only supplies its column spec.
 *
 * Pure DOM building (no ServiceLocator/network), so it is unit-testable.
 */

/** One column: a header label and a cell-text accessor for a row of type T. */
export interface ConjunctionColumn<T> {
  header: string;
  /** Cell text for `row`. */
  cell: (row: T) => string;
  /** Optional class on the `<td>` (e.g. a hook the plugin updates lazily). */
  className?: string;
  /**
   * Optional stable sort key for the column. When set and `options.sort` is
   * provided, the header becomes click-to-sort: it gets the `kt-sortable` class
   * and a `data-sort-key` attribute, and shows a ▲/▼ arrow when it is active.
   */
  sortKey?: string;
}

export interface ConjunctionTableOptions<T> {
  /** Class applied to every body `<tr>` (the click handler keys off it). */
  rowClass: string;
  /**
   * Optional `data-*` attributes (without the `data-` prefix) for each row,
   * e.g. `{ secondaryScc: row.scc, tcaMs: String(row.tcaMs) }`. `row` (the
   * index) is always set as `data-row`.
   */
  rowData?: (row: T, index: number) => Record<string, string>;
  /**
   * Optional active-sort state. When provided, columns carrying a `sortKey`
   * render sortable headers (the plugin owns the actual row reordering and the
   * header click handler).
   */
  sort?: { key: string; asc: boolean };
}

/** Render `rows` into `tbl` using `columns`. Clears the table first. */
export const renderConjunctionTable = <T>(tbl: HTMLTableElement, rows: readonly T[], columns: ReadonlyArray<ConjunctionColumn<T>>, options: ConjunctionTableOptions<T>): void => {
  tbl.innerHTML = '';

  const headerRow = tbl.createTHead().insertRow();

  for (const column of columns) {
    const th = document.createElement('th');

    th.textContent = column.header;

    if (options.sort && column.sortKey) {
      th.classList.add('kt-sortable');
      th.dataset.sortKey = column.sortKey;

      if (options.sort.key === column.sortKey) {
        th.classList.add('kt-sort-active');
        th.textContent = `${column.header} ${options.sort.asc ? '▲' : '▼'}`;
      }
    }

    headerRow.appendChild(th);
  }

  const tbody = tbl.createTBody();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const tr = tbody.insertRow();

    tr.className = options.rowClass;
    tr.dataset.row = i.toString();

    if (options.rowData) {
      const data = options.rowData(row, i);

      for (const key of Object.keys(data)) {
        tr.dataset[key] = data[key];
      }
    }

    for (const column of columns) {
      const cell = tr.insertCell();

      cell.textContent = column.cell(row);
      if (column.className) {
        cell.className = column.className;
      }
    }
  }
};
