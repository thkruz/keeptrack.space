# Orbit-line diagnostics

Ad-hoc harnesses for investigating how orbit lines are drawn - built while chasing
the ECF orbit-line jitter (the shiver that appeared on geostationary satellites and
missiles when zoomed in). They drive the **real** KeepTrack app (they don't
re-implement the pipeline), so what they measure is what actually renders.

The durable regression protection lives elsewhere - see **Regression tests** below.
These scripts are the *investigation* tools: reach for them when a new precision or
alignment issue shows up and you need to see the actual numbers.

## Prerequisites

A warm dev server on `:5544` (the probes attach to it; they do not spin one up):

```
npm run start:pro
```

Screenshot-based probes also need the catalog on (real satellites); they set it
themselves. Set `BASE_URL` to point at a different origin if needed.

## The tools

| Script | What it measures | Output |
|---|---|---|
| `probe-jitter.ts` | Reads each frame's GL orbit buffer + gmst + worldShift + dot position, re-computes the shader transform in float64, and reports per-frame **perpendicular** vertex motion (the visible jitter) in metres, plus head-vs-dot gap. | console |
| `inspect-jitter.ts` | Burst of consecutive canvas frames + per-scanline sub-pixel centroid of the red orbit line; reports frame-to-frame line displacement per vertical band. `NO_REDRAW=1` disables constant-redraw. | PNGs under `test-results/visual-inspect/jitter-*` + console |
| `probe-dot-lag.ts` | Whether the selected sat's `positionData` is time-consistent frame to frame or rewinds when position-cruncher messages land (dead-reckoning sawtooth). | console |
| `probe-camera.ts` | Per-frame camera-state deltas (zoom/pitch/yaw), to rule out camera hunting reading as scene jitter. | console |
| `probe-earth-shift.ts` | Cross-correlates an Earth background patch between saved burst frames, to separate camera/scene motion from line motion. | console |
| `specs/*.spec.json` | `scripts/inspect.ts` specs for the ECF flat-map / polar / planets alignment checks. | PNGs |

## Usage

```bash
# Numeric probe: perpendicular jitter for GOES-16 (SCC 41866) in ECF at 1x
npx tsx scripts/orbit-diagnostics/probe-jitter.ts 41866 ecf 1
npx tsx scripts/orbit-diagnostics/probe-jitter.ts 41866 eci 1   # ECI control

# Pixel burst (writes frames + diffs); NO_REDRAW=1 to disable constant redraw
npx tsx scripts/orbit-diagnostics/inspect-jitter.ts 41866 30 ecf 1

# Supporting probes
npx tsx scripts/orbit-diagnostics/probe-dot-lag.ts 41866 1
npx tsx scripts/orbit-diagnostics/probe-camera.ts 41866 15
npx tsx scripts/orbit-diagnostics/probe-earth-shift.ts test-results/visual-inspect/jitter-ecf-r1 400 300

# Visual alignment specs (flat map / polar / planets in ECF)
npx tsx scripts/inspect.ts scripts/orbit-diagnostics/specs/flatmap-ecf.spec.json
```

## Known-good baselines (post anchor-relative fix)

Measured with the fix in place, GEO sat + ECF + 1x, zoomed in:

- **`probe-jitter` perpendicular per-frame motion**: sub-pixel (dominated by the real
  smooth sweep of the curve, not jitter). ECF is within a few metres of the ECI control.
- **`inspect-jitter` line displacement**: `med=0.00`, `p95|dx| <~ 1 px`. With
  `NO_REDRAW=1` it is exactly `0.00` (no resample), confirming the residual is the
  constant-redraw resample, not float precision.
- **`probe-dot-lag`**: dot dead-reckoning residual `< ~3 m` (float32 `positionData += v*dt`).
- **`probe-camera`**: zoom deltas `~1e-8`, pitch/yaw `0` when idle.

If a change makes any of these regress into the metres, the anchor-relative buffers,
the float64 `cos/sin(gmst)` uniforms, or the timeslice-quantized resample likely broke.

## Regression tests (the durable guard)

The scripts above are exploratory. The automated protection is:

- **Unit**: `src/engine/math/__tests__/orbit-anchor-math.test.ts` - locks the precision
  properties of the anchor math (`rebaseToAnchor`, `rotateEcefToEciZ`) with no browser.
- **E2E**: `src/app/rendering/__tests__/orbit-line-stability.spec.ts` - boots a GEO sat in
  ECF and asserts the buffer is anchor-relative and the line head stays glued to the dot.

The rationale for the fix (three stacked precision causes) is in the memory note
`orbit-line-anchor-relative`.
