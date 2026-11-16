import { TearrType } from '@app/app/sensors/sensor-math';
import { computeFraming, describeFraming, inViewIntervals, parseExposureStart } from '../look-angles-framing';

const looks = [
  { time: '2026-11-04 05:33:00', type: TearrType.RISE },
  { time: '2026-11-04 05:33:57', type: TearrType.SET },
  { time: '2026-11-04 07:10:00', type: TearrType.RISE },
  { time: '2026-11-04 07:12:00', type: TearrType.SET },
];
const ref = Date.UTC(2026, 10, 4, 0, 0, 0);

describe('look-angles framing plan', () => {
  it('parses full and time-only starts, rejects junk', () => {
    expect(parseExposureStart('2026-11-04 05:33:30', ref)).toBe(Date.UTC(2026, 10, 4, 5, 33, 30));
    expect(parseExposureStart('05:33:30', ref)).toBe(Date.UTC(2026, 10, 4, 5, 33, 30));
    expect(parseExposureStart('', ref)).toBeNaN();
    expect(parseExposureStart('25:00:00', ref)).toBeNaN();
    expect(parseExposureStart('soon', ref)).toBeNaN();
  });

  it('builds intervals from rise/set rows', () => {
    expect(inViewIntervals(looks)).toHaveLength(2);
  });

  it('reports 27 s in frame for a 30 s exposure starting 05:33:30 (issue example)', () => {
    const r = computeFraming(looks, Date.UTC(2026, 10, 4, 5, 33, 30), 30);

    expect(r.inFrameSec).toBe(27);
    expect(r.exitMs).toBe(Date.UTC(2026, 10, 4, 5, 33, 57));
    expect(r.entryMs).toBeNull();
  });

  it('reports a late entry and zero outside a pass', () => {
    const r = computeFraming(looks, Date.UTC(2026, 10, 4, 5, 32, 50), 30);

    expect(r.inFrameSec).toBe(20);
    expect(r.entryMs).toBe(Date.UTC(2026, 10, 4, 5, 33, 0));
    expect(computeFraming(looks, Date.UTC(2026, 10, 4, 6, 0, 0), 30).inFrameSec).toBe(0);
  });

  it('treats an in-progress row as the pass start', () => {
    const r = computeFraming(
      [
        { time: '2026-11-04 05:00:00', inProgress: true },
        { time: '2026-11-04 05:01:00', type: TearrType.SET },
      ],
      Date.UTC(2026, 10, 4, 5, 0, 30),
      60
    );

    expect(r.inFrameSec).toBe(30);
  });

  it('frames sampled rows (no type) as in view across consecutive samples', () => {
    const sampled = ['05:33:00', '05:33:10', '05:33:20', '05:33:30', '05:33:40', '05:33:50', '05:34:00'].map((t) => ({ time: `2026-11-04 ${t}` }));
    const r = computeFraming(sampled, Date.UTC(2026, 10, 4, 5, 33, 10), 30, 10);

    expect(r.inFrameSec).toBe(30);
    expect(computeFraming(sampled, Date.UTC(2026, 10, 4, 5, 33, 10), 30).inFrameSec).toBe(30);
    // A gap between samples splits the pass
    const gap = [{ time: '2026-11-04 05:33:00' }, { time: '2026-11-04 05:33:10' }, { time: '2026-11-04 06:00:00' }, { time: '2026-11-04 06:00:10' }];

    expect(computeFraming(gap, Date.UTC(2026, 10, 4, 5, 40, 0), 30, 10).inFrameSec).toBe(0);
  });

  it('describes the result', () => {
    const labels = { inFrame: 'in frame', enters: 'enters', leaves: 'leaves', none: 'none' };
    const text = describeFraming(computeFraming(looks, Date.UTC(2026, 10, 4, 5, 33, 30), 30), labels);

    expect(text).toBe('27 s / 30 s in frame, leaves 05:33:57Z');
    expect(describeFraming({ inFrameSec: 0, lengthSec: 30, exitMs: null, entryMs: null }, labels)).toBe('none');
  });
});
