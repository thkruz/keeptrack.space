import { PolarPass, PolarSample } from '@app/plugins/polar-plot/polar-plot-pass';
import { drawPolarChart } from '@app/plugins/polar-plot/polar-plot-renderer';
import { vi } from 'vitest';

/** A 2D context double covering every method/property the renderer touches. */
const makeCtx = (width = 1000, height = 1000) => ({
  canvas: { width, height },
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  clearRect: vi.fn(),
  closePath: vi.fn(),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  textAlign: '',
  textBaseline: '',
  lineWidth: 0,
  imageSmoothingEnabled: false,
});

const sample = (tIso: string, az: number, el: number): PolarSample => ({
  t: new Date(tIso),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  az: az as any,
  el: el as any,
  rng: 800 as any,
});

const pass: PolarPass = {
  samples: [sample('2026-05-31T00:00:00Z', 100, 5), sample('2026-05-31T00:01:00Z', 130, 40), sample('2026-05-31T00:02:00Z', 160, 8)],
  aos: new Date('2026-05-31T00:00:00Z'),
  los: new Date('2026-05-31T00:02:00Z'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maxEl: 40 as any,
  culmination: new Date('2026-05-31T00:01:00Z'),
  durationMs: 2 * 60 * 1000,
  maskLimited: false,
};

describe('drawPolarChart', () => {
  it('clears, draws rings/track/dots and the header', () => {
    const ctx = makeCtx();

    drawPolarChart(ctx as never, pass, { labels: { sensorName: 'TEST SENSOR', satLabel: 'Satellite 25544' } });

    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled(); // rings + axes + track
    expect(ctx.arc).toHaveBeenCalled(); // rings + start/end dots
    expect(ctx.fillText).toHaveBeenCalledWith('TEST SENSOR', 10, 10);
    // Pass time range across the bottom.
    expect(ctx.fillText).toHaveBeenCalledWith('00:00:00 - 00:02:00', 500, 990);
  });

  it('fills the background when a color is given', () => {
    const ctx = makeCtx();

    drawPolarChart(ctx as never, pass, { labels: { sensorName: 'S', satLabel: 'X' }, backgroundColor: '#101522' });

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1000, 1000);
  });

  it('does not fill the background when transparent', () => {
    const ctx = makeCtx();

    drawPolarChart(ctx as never, pass, { labels: { sensorName: 'S', satLabel: 'X' }, backgroundColor: 'transparent' });

    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('draws the pass-count caption and watermark when provided', () => {
    const ctx = makeCtx();

    drawPolarChart(ctx as never, pass, {
      labels: { sensorName: 'S', satLabel: 'X', passLabel: 'Pass 2 of 4' },
      watermark: 'keeptrack.space',
    });

    expect(ctx.fillText).toHaveBeenCalledWith('Pass 2 of 4', 990, 10);
    expect(ctx.fillText).toHaveBeenCalledWith('keeptrack.space', 10, 990);
  });

  it('honors a non-square canvas without throwing', () => {
    const ctx = makeCtx(1200, 675);

    expect(() => drawPolarChart(ctx as never, pass, { labels: { sensorName: 'S', satLabel: 'X' } })).not.toThrow();
  });

  describe('horizon mask', () => {
    it('adds exactly one fill and a 360-point mask line as the first path', () => {
      const plain = makeCtx();
      const masked = makeCtx();

      drawPolarChart(plain as never, pass, { labels: { sensorName: 'S', satLabel: 'X' } });
      drawPolarChart(masked as never, pass, { labels: { sensorName: 'S', satLabel: 'X' }, mask: () => 20 });

      // Mask band is one extra fill on top of the unmasked chart's fills.
      expect(masked.fill.mock.calls.length).toBe(plain.fill.mock.calls.length + 1);
      expect(masked.fill).toHaveBeenCalledWith('evenodd');

      // First path drawn: moveTo (az 0) + 359 lineTo (az 1..359) = 360 mask points,
      // then the rim (moveTo + one full arc). Nothing else draws lines before it.
      expect(masked.lineTo.mock.calls.length - plain.lineTo.mock.calls.length).toBe(359);
      expect(masked.moveTo.mock.invocationCallOrder[0]).toBeLessThan(masked.lineTo.mock.invocationCallOrder[0]);
      const firstArcOrder = masked.arc.mock.invocationCallOrder[0];
      const lineTosBeforeFirstArc = masked.lineTo.mock.invocationCallOrder.filter((o) => o < firstArcOrder).length;

      expect(lineTosBeforeFirstArc).toBe(359);
    });

    it('places the mask line at the projected elevation', () => {
      const ctx = makeCtx();

      drawPolarChart(ctx as never, pass, { labels: { sensorName: 'S', satLabel: 'X' }, mask: () => 45 });

      /*
       * 1000 px canvas: distanceUnit = (1000 / 225) * 0.9 = 4 px/deg. At az 0, el 45 the radius
       * is (90 - 45) * 4 = 180 px straight up from centre (500, 500) -> (500, 320).
       */
      const [x, y] = ctx.moveTo.mock.calls[0];

      expect(x).toBeCloseTo(500, 9);
      expect(y).toBeCloseTo(320, 9);
      // Rim arc radius 90 * 4 = 360 px, drawn counter-clockwise.
      expect(ctx.arc.mock.calls[0]).toEqual([500, 500, 360, 0, 2 * Math.PI, true]);
    });

    it('draws no mask without the option', () => {
      const ctx = makeCtx();

      drawPolarChart(ctx as never, pass, { labels: { sensorName: 'S', satLabel: 'X' } });

      expect(ctx.fill).not.toHaveBeenCalledWith('evenodd');
    });
  });
});
