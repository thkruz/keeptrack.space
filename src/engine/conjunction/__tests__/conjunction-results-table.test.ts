import { renderConjunctionTable } from '@app/engine/conjunction/conjunction-results-table';

interface Row {
  a: string;
  b: number;
}

const rows: Row[] = [{ a: 'x', b: 1 }, { a: 'y', b: 2 }];

describe('conjunction-results-table', () => {
  it('renders a header row plus one body row per item, with hooks', () => {
    const tbl = document.createElement('table');

    renderConjunctionTable(
      tbl,
      rows,
      [
        { header: 'A', cell: (r) => r.a },
        { header: 'B', cell: (r) => r.b.toFixed(1), className: 'b-cell' },
      ],
      { rowClass: 'evt link', rowData: (r) => ({ scc: r.a }) },
    );

    expect(tbl.querySelectorAll('thead th')).toHaveLength(2);
    expect(tbl.querySelectorAll('tbody tr')).toHaveLength(2);

    const firstRow = tbl.querySelector('tbody tr') as HTMLTableRowElement;

    expect(firstRow.className).toBe('evt link');
    expect(firstRow.dataset.row).toBe('0');
    expect(firstRow.dataset.scc).toBe('x');
    expect(firstRow.querySelector('.b-cell')!.textContent).toBe('1.0');
  });

  it('clears existing content before rendering', () => {
    const tbl = document.createElement('table');

    tbl.innerHTML = '<tbody><tr><td>old</td></tr></tbody>';
    renderConjunctionTable(tbl, [], [{ header: 'A', cell: () => '' }], { rowClass: 'r' });

    expect(tbl.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(tbl.querySelectorAll('thead th')).toHaveLength(1);
  });
});
