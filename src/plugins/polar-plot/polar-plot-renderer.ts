/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * polar-plot-renderer.ts - Pure canvas renderer for the Polar Plot. Given a 2D
 * context, a sampled {@link PolarPass}, and pre-localized labels, it draws a
 * classic azimuth/elevation sky chart: north at the top, the horizon at the outer
 * ring, zenith at the center. It touches only the passed context, so it runs
 * identically against an on-screen canvas, an OffscreenCanvas, or a test double,
 * which is what lets the same chart be generated head-less for social media.
 *
 * https://keeptrack.space
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

import { PolarPass, PolarSample } from './polar-plot-pass';

const DEG2RAD = Math.PI / 180;
/** Elevation rings (degrees above the horizon) drawn behind the track. */
const ELEVATION_RINGS = [0, 15, 30, 45, 60, 75] as const;

export interface PolarChartLabels {
  /** Sensor name, top-left of the header. */
  sensorName: string;
  /** Satellite label, e.g. "Satellite 25544". */
  satLabel: string;
  /** Optional "Pass 1 of 4" caption, top-right of the header. */
  passLabel?: string;
}

export interface PolarChartOptions {
  labels: PolarChartLabels;
  /** Fill color drawn before the chart; omit/`'transparent'` to leave the canvas clear. */
  backgroundColor?: string;
  /** Draw per-minute tick dots along the track (default true). */
  showTimeTicks?: boolean;
  /** Draw the culmination (max-elevation) marker and label (default true). */
  showCulmination?: boolean;
  /** Optional branding text stamped in the lower-right corner (e.g. for social export). */
  watermark?: string;
}

interface Geometry {
  size: number;
  centerX: number;
  centerY: number;
  /** Pixels per degree of (90 - elevation) from the center. */
  distanceUnit: number;
}

/** HH:MM:SS in UTC. */
const formatTime = (date: Date): string => date.toISOString().slice(11, 19);

/** Projects an az/el look angle onto chart pixel coordinates (zenith center, horizon rim). */
const project = (geom: Geometry, azDeg: number, elDeg: number): { x: number; y: number } => {
  const radians = DEG2RAD * (azDeg - 90);
  const radius = (90 - elDeg) * geom.distanceUnit;

  return {
    x: geom.centerX + radius * Math.cos(radians),
    y: geom.centerY + radius * Math.sin(radians),
  };
};

const computeGeometry = (ctx: CanvasRenderingContext2D): Geometry => {
  const { width, height } = ctx.canvas;
  const size = Math.min(width, height);

  return {
    size,
    centerX: width / 2,
    centerY: height / 2,
    // 90 deg of elevation span maps to 0.9 of the half-size, leaving a label margin.
    distanceUnit: (size / (2.5 * 90)) * 0.9,
  };
};

const drawElevationRings = (ctx: CanvasRenderingContext2D, geom: Geometry): void => {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;

  for (const el of ELEVATION_RINGS) {
    const radius = (90 - el) * geom.distanceUnit;

    ctx.beginPath();
    ctx.arc(geom.centerX, geom.centerY, radius, 0, 2 * Math.PI, false);
    ctx.stroke();
  }
};

const drawAxes = (ctx: CanvasRenderingContext2D, geom: Geometry): void => {
  const radius = 90 * geom.distanceUnit;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(geom.centerX, geom.centerY - radius);
  ctx.lineTo(geom.centerX, geom.centerY + radius);
  ctx.moveTo(geom.centerX - radius, geom.centerY);
  ctx.lineTo(geom.centerX + radius, geom.centerY);
  ctx.stroke();
};

const labelAzimuthAxis = (ctx: CanvasRenderingContext2D, geom: Geometry): void => {
  const radius = 92 * geom.distanceUnit;

  ctx.font = `${geom.size * 0.03}px serif`;
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('0°', geom.centerX, geom.centerY - radius);
  ctx.textBaseline = 'top';
  ctx.fillText('180°', geom.centerX, geom.centerY + radius);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('270°', geom.centerX - radius, geom.centerY);
  ctx.textAlign = 'left';
  ctx.fillText('90°', geom.centerX + radius, geom.centerY);
};

/**
 * Labels the elevation rings along the upper-right diagonal, deriving each label's
 * position from the same projection the rings and track use, so labels and rings
 * never drift apart.
 */
const labelElevationAxis = (ctx: CanvasRenderingContext2D, geom: Geometry): void => {
  ctx.font = `${geom.size * 0.026}px serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Diagonal toward the upper-right (azimuth 45 deg) so labels sit clear of the axes.
  for (const el of [...ELEVATION_RINGS, 90]) {
    const { x, y } = project(geom, 45, el);

    ctx.fillText(`${el}°`, x, y);
  }
};

const drawTrack = (ctx: CanvasRenderingContext2D, geom: Geometry, samples: PolarSample[]): void => {
  if (samples.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = 'rgb(255, 40, 39)';
  ctx.lineWidth = 2;

  samples.forEach((s, i) => {
    const { x, y } = project(geom, s.az, s.el);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
};

const drawDot = (ctx: CanvasRenderingContext2D, geom: Geometry, sample: PolarSample, color: string, radius: number): void => {
  const { x, y } = project(geom, sample.az, sample.el);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
};

/** Marks each whole-UTC-minute crossing along the track with a small tick dot. */
const drawTimeTicks = (ctx: CanvasRenderingContext2D, geom: Geometry, samples: PolarSample[]): void => {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  let prevMinute = NaN;

  for (const s of samples) {
    const minute = Math.floor(s.t.getTime() / 60000);

    if (minute !== prevMinute && !Number.isNaN(prevMinute)) {
      const { x, y } = project(geom, s.az, s.el);

      ctx.beginPath();
      ctx.arc(x, y, geom.size * 0.006, 0, 2 * Math.PI, false);
      ctx.fill();
    }
    prevMinute = minute;
  }
};

/** Finds the sample nearest the culmination time so the max-el marker lands on the track. */
const sampleNearest = (samples: PolarSample[], when: Date): PolarSample | null => {
  if (samples.length === 0) {
    return null;
  }
  const targetMs = when.getTime();

  return samples.reduce((best, s) => {
    if (Math.abs(s.t.getTime() - targetMs) < Math.abs(best.t.getTime() - targetMs)) {
      return s;
    }

    return best;
  });
};

const drawCulmination = (ctx: CanvasRenderingContext2D, geom: Geometry, pass: PolarPass): void => {
  const sample = sampleNearest(pass.samples, pass.culmination);

  if (!sample) {
    return;
  }
  const { x, y } = project(geom, sample.az, sample.el);

  ctx.beginPath();
  ctx.arc(x, y, geom.size * 0.014, 0, 2 * Math.PI, false);
  ctx.strokeStyle = 'rgb(255, 213, 79)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `${geom.size * 0.026}px consolas`;
  ctx.fillStyle = 'rgb(255, 213, 79)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${pass.maxEl.toFixed(0)}°`, x, y - geom.size * 0.018);
};

const drawHeader = (ctx: CanvasRenderingContext2D, geom: Geometry, pass: PolarPass, labels: PolarChartLabels): void => {
  const lineHeight = geom.size * 0.035;

  ctx.font = `${lineHeight}px consolas`;
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(labels.sensorName, 10, 10);
  ctx.fillText(labels.satLabel, 10, lineHeight + 15);

  if (labels.passLabel) {
    ctx.textAlign = 'right';
    ctx.fillText(labels.passLabel, ctx.canvas.width - 10, 10);
  }

  const timeRange = `${formatTime(pass.aos)} - ${formatTime(pass.los)}`;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(timeRange, ctx.canvas.width / 2, ctx.canvas.height - 10);
};

const drawWatermark = (ctx: CanvasRenderingContext2D, geom: Geometry, text: string): void => {
  ctx.font = `${geom.size * 0.026}px consolas`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, 10, ctx.canvas.height - 10);
};

/**
 * Draws the full polar plot for a single pass onto `ctx`. The context's canvas
 * size drives the chart dimensions, so callers control resolution by sizing the
 * canvas before calling.
 */
export const drawPolarChart = (ctx: CanvasRenderingContext2D, pass: PolarPass, options: PolarChartOptions): void => {
  const geom = computeGeometry(ctx);

  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  drawElevationRings(ctx, geom);
  drawAxes(ctx, geom);
  labelAzimuthAxis(ctx, geom);
  labelElevationAxis(ctx, geom);

  drawTrack(ctx, geom, pass.samples);

  if (options.showTimeTicks !== false) {
    drawTimeTicks(ctx, geom, pass.samples);
  }
  if (options.showCulmination !== false) {
    drawCulmination(ctx, geom, pass);
  }

  // Start (rise) and end (set) markers drawn last so they sit above the track.
  drawDot(ctx, geom, pass.samples[0], 'lightgreen', geom.size * 0.015);
  drawDot(ctx, geom, pass.samples[pass.samples.length - 1], 'red', geom.size * 0.015);

  drawHeader(ctx, geom, pass, options.labels);

  if (options.watermark) {
    drawWatermark(ctx, geom, options.watermark);
  }
};
