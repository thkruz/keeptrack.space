import { summarizeFragments } from '@app/plugins/breakup-analysis/breakup-analysis-core';
import { BreakupLabels, buildFragmentTable, buildStatsCard, likelyDecayedNote } from '@app/plugins/breakup-analysis/breakup-analysis-table';
import { Satellite, SpaceObjectType } from '@ootk/src/main';

const fakeSat = (over: Record<string, unknown> = {}): Satellite =>
  ({
    type: SpaceObjectType.DEBRIS,
    sccNum: '25730',
    name: 'FENGYUN 1C DEB',
    perigee: 800,
    apogee: 900,
    inclination: 98.5,
    eccentricity: 0.005,
    period: 101.3,
    epochYear: 26,
    epochDay: 102,
    getTypeString: () => 'Debris',
    ...over,
  }) as unknown as Satellite;

/** Every label is its own key, except the parameterized ones. */
const labels = new Proxy(
  {
    likelyDecayedNote: 'Flagged below {perigee} km or {days} days older than {date}.',
    showingOf: '(showing {shown} of {total})',
  } as Record<string, string>,
  { get: (target, key: string) => target[key] ?? key }
) as unknown as BreakupLabels;

// Archive date 2026-04-13 at 00:00 UTC.
const ARCHIVE_MS = Date.UTC(2026, 3, 13);

const flaggedSccs = (table: string): (string | null)[] => {
  const doc = new DOMParser().parseFromString(table, 'text/html');

  return [...doc.querySelectorAll('tr.breakup-likely-decayed')].map((row) => row.getAttribute('data-scc'));
};

describe('breakup-analysis-table likely decayed', () => {
  const sats = [fakeSat({ sccNum: '1' }), fakeSat({ sccNum: '2', epochYear: 7, epochDay: 37 }), fakeSat({ sccNum: '3', perigee: 110 })];

  it('shows the count next to the tracking ratio and explains the rule', () => {
    const card = buildStatsCard(summarizeFragments(sats, 3, ARCHIVE_MS), labels, ARCHIVE_MS);

    expect(card).toContain('<span class="ba-decayed-count">2</span>');
    expect(card).toContain('Flagged below 120 km or 90 days older than 2026-04-13.');
    expect(card.indexOf('trackingRatio')).toBeLessThan(card.indexOf('likelyDecayed'));
  });

  it('shows 0 and no note when nothing is flagged', () => {
    const card = buildStatsCard(summarizeFragments([fakeSat()], 1, ARCHIVE_MS), labels, ARCHIVE_MS);

    expect(card).toContain('likelyDecayed');
    expect(card).not.toContain('ba-decayed-count');
    expect(card).not.toContain('ba-decayed-note');
    expect(likelyDecayedNote(0, ARCHIVE_MS, labels)).toBe('');
  });

  it('tags flagged rows in the fragment table', () => {
    const table = buildFragmentTable(sats, { sortKey: 'sccNum', sortDir: 'asc', showAll: true, maxRows: 100, decayReferenceMs: ARCHIVE_MS }, labels);
    const doc = new DOMParser().parseFromString(table, 'text/html');

    expect(flaggedSccs(table)).toEqual(['2', '3']);
    expect(doc.querySelector('tr[data-scc="2"] .ba-decayed-tag')?.textContent).toBe('likelyDecayedTag');
    expect(doc.querySelector('tr[data-scc="1"] .ba-decayed-tag')).toBeNull();
  });

  it('applies only the perigee rule without a reference time', () => {
    const table = buildFragmentTable(sats, { sortKey: 'sccNum', sortDir: 'asc', showAll: true, maxRows: 100 }, labels);

    expect(flaggedSccs(table)).toEqual(['3']);
  });
});
