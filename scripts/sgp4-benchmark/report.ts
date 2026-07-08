/**
 * Self-contained HTML report generator for the SGP4 benchmark. Follows the
 * dataviz reference palette (validated: light-mode aqua/yellow are sub-3:1 on
 * the surface, so every bar carries a direct label and the full metrics table
 * doubles as the accessible view).
 */

export interface Stats {
  n: number;
  mean: number;
  std: number;
  min: number;
  median: number;
  p95: number;
  max: number;
}

export interface BenchmarkRow {
  /** Scenario group, e.g. 'Full catalog frame' */
  scenario: string;
  /** Engine family: 'sgp4' | 'sgp4-wasm' | 'sgp4-xp-wasm' */
  engine: string;
  /** Call mode, e.g. 'loop', 'seam', 'fast call', 'batch (api)', 'batch (prebuilt)' */
  mode: string;
  /** Unit for the stats values, e.g. 'ms/frame', 'us/call', 'ms' */
  unit: string;
  stats: Stats;
}

export interface BenchmarkReport {
  generatedAt: string;
  node: string;
  cpu: string;
  catalogFile: string;
  catalogSize: number;
  commonSats: number;
  singleSatName: string;
  frames: number;
  warmupFrames: number;
  singleIters: number;
  /** Median elset age at the propagation target (drives the cruncher's validation path). */
  medianElsetAgeDays: number;
  maxPositionDeltaKm: number;
  parologySampleSize: number;
  enginesSkipped: string[];
  rows: BenchmarkRow[];
}

const ENGINE_COLOR: Record<string, string> = {
  'sgp4': 'var(--series-1)',
  'sgp4-wasm': 'var(--series-2)',
  'sgp4-xp-wasm': 'var(--series-3)',
};

const esc = (s: string): string => s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

const fmt = (v: number, digits = 2): string => v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const barChart = (title: string, subtitle: string, rows: BenchmarkRow[], unitLabel: string): string => {
  if (rows.length === 0) {
    return '';
  }

  const maxVal = Math.max(...rows.map((r) => r.stats.mean));
  const bars = rows.map((r) => {
    const pct = Math.max((r.stats.mean / maxVal) * 100, 0.5);
    const label = `${r.engine} · ${r.mode}`;
    const tip = `n=${r.stats.n} · mean ${fmt(r.stats.mean)} · std ${fmt(r.stats.std)} · median ${fmt(r.stats.median)} · p95 ${fmt(r.stats.p95)} · min ${fmt(r.stats.min)} · max ${fmt(r.stats.max)} ${r.unit}`;

    return `
      <div class="bar-row" data-tip="${esc(tip)}">
        <div class="bar-label">${esc(label)}</div>
        <div class="bar-track">
          <div class="bar" style="width:${pct.toFixed(2)}%;background:${ENGINE_COLOR[r.engine] ?? 'var(--series-1)'}"></div>
          <div class="bar-value">${fmt(r.stats.mean)} ± ${fmt(r.stats.std)} ${esc(unitLabel)}</div>
        </div>
      </div>`;
  }).join('');

  const legendEngines = [...new Set(rows.map((r) => r.engine))];
  const legend = legendEngines.length > 1
    ? `<div class="legend">${legendEngines.map((e) => `<span class="legend-item"><span class="swatch" style="background:${ENGINE_COLOR[e]}"></span>${esc(e)}</span>`).join('')}</div>`
    : '';

  return `
  <section class="card">
    <h2>${esc(title)}</h2>
    <p class="subtitle">${esc(subtitle)}</p>
    ${legend}
    <div class="chart">${bars}</div>
  </section>`;
};

const statTile = (label: string, value: string, detail: string): string => `
  <div class="tile">
    <div class="tile-label">${esc(label)}</div>
    <div class="tile-value">${value}</div>
    <div class="tile-detail">${esc(detail)}</div>
  </div>`;

export const renderHtmlReport = (r: BenchmarkReport): string => {
  const frameRows = r.rows.filter((row) => row.scenario === 'Full catalog frame');
  const crunchRows = r.rows.filter((row) => row.scenario === 'Cruncher frame sim');
  const singleRows = r.rows.filter((row) => row.scenario === 'Single TLE');
  const loadRows = r.rows.filter((row) => row.scenario === 'Catalog load');

  const tsFrame = frameRows.find((row) => row.engine === 'sgp4');
  const seamFrame = frameRows.find((row) => row.engine === 'sgp4-wasm' && row.mode === 'seam (app path)');
  const batchFrame = frameRows.find((row) => row.engine === 'sgp4-wasm' && row.mode === 'batch (prebuilt)');
  const speedup = tsFrame && batchFrame ? tsFrame.stats.mean / batchFrame.stats.mean : 0;

  const tiles = [
    tsFrame ? statTile('sgp4 (TypeScript)', `${fmt(tsFrame.stats.mean, 1)} ms`, 'full catalog, per frame') : '',
    seamFrame ? statTile('sgp4-wasm · app path', `${fmt(seamFrame.stats.mean, 1)} ms`, 'per-satellite calls, per frame') : '',
    batchFrame ? statTile('sgp4-wasm · batch', `${fmt(batchFrame.stats.mean, 1)} ms`, 'one wasm call, per frame') : '',
    speedup ? statTile('Batch speedup vs TypeScript', `${fmt(speedup, 1)}×`, 'full catalog frame') : '',
  ].join('');

  const tableRows = r.rows.map((row) => `
      <tr>
        <td>${esc(row.scenario)}</td>
        <td><span class="swatch" style="background:${ENGINE_COLOR[row.engine] ?? 'var(--series-1)'}"></span>${esc(row.engine)}</td>
        <td>${esc(row.mode)}</td>
        <td class="num">${row.stats.n}</td>
        <td class="num">${fmt(row.stats.mean, 3)}</td>
        <td class="num">${fmt(row.stats.std, 3)}</td>
        <td class="num">${fmt(row.stats.min, 3)}</td>
        <td class="num">${fmt(row.stats.median, 3)}</td>
        <td class="num">${fmt(row.stats.p95, 3)}</td>
        <td class="num">${fmt(row.stats.max, 3)}</td>
        <td>${esc(row.unit)}</td>
      </tr>`).join('');

  const skippedNote = r.enginesSkipped.length > 0
    ? `<p class="note">Skipped engines (artifacts not found): ${esc(r.enginesSkipped.join(', '))}.</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SGP4 Propagator Benchmark</title>
<style>
  :root {
    --surface-1: #fcfcfb;
    --page: #f9f9f7;
    --text-primary: #0b0b0b;
    --text-secondary: #52514e;
    --text-muted: #898781;
    --grid: #e1e0d9;
    --baseline: #c3c2b7;
    --border: rgba(11,11,11,0.10);
    --series-1: #2a78d6;
    --series-2: #1baf7a;
    --series-3: #eda100;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --surface-1: #1a1a19;
      --page: #0d0d0d;
      --text-primary: #ffffff;
      --text-secondary: #c3c2b7;
      --text-muted: #898781;
      --grid: #2c2c2a;
      --baseline: #383835;
      --border: rgba(255,255,255,0.10);
      --series-1: #3987e5;
      --series-2: #199e70;
      --series-3: #c98500;
    }
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    color: var(--text-primary);
    padding: 32px 24px 64px;
    line-height: 1.45;
  }
  main { max-width: 980px; margin: 0 auto; display: grid; gap: 20px; }
  h1 { font-size: 22px; font-weight: 650; }
  h2 { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
  .meta { color: var(--text-secondary); font-size: 13px; }
  .card {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 20px;
  }
  .subtitle { color: var(--text-muted); font-size: 12.5px; margin-bottom: 12px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  .tile {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
  }
  .tile-label { font-size: 12px; color: var(--text-secondary); }
  .tile-value { font-size: 26px; font-weight: 650; margin: 2px 0; }
  .tile-detail { font-size: 12px; color: var(--text-muted); }
  .legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
  .legend-item { display: inline-flex; align-items: center; gap: 6px; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: baseline; }
  .legend-item .swatch { margin-right: 0; }
  .chart { display: grid; gap: 9px; }
  .bar-row { display: grid; grid-template-columns: 220px 1fr; align-items: center; gap: 10px; }
  .bar-label { font-size: 12.5px; color: var(--text-secondary); text-align: right; }
  .bar-track {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    border-left: 2px solid var(--baseline);
    padding-left: 2px;
    min-height: 20px;
  }
  .bar { height: 14px; border-radius: 0 4px 4px 0; min-width: 2px; }
  .bar-value { font-size: 12px; color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--grid); }
  th { color: var(--text-muted); font-weight: 550; font-size: 11.5px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .table-wrap { overflow-x: auto; }
  .note { font-size: 12.5px; color: var(--text-secondary); margin-top: 8px; }
  #tooltip {
    position: fixed;
    pointer-events: none;
    background: var(--text-primary);
    color: var(--surface-1);
    font-size: 11.5px;
    padding: 6px 9px;
    border-radius: 6px;
    max-width: 420px;
    opacity: 0;
    transition: opacity 80ms;
    z-index: 10;
  }
</style>
</head>
<body>
<main>
  <header>
    <h1>SGP4 Propagator Benchmark</h1>
    <p class="meta">${esc(r.generatedAt)} · Node ${esc(r.node)} · ${esc(r.cpu)}</p>
    <p class="meta">${esc(r.catalogFile)} — ${r.catalogSize.toLocaleString('en-US')} objects, ${r.commonSats.toLocaleString('en-US')} propagated by every engine ·
      ${r.frames} measured frames (${r.warmupFrames} warmup) · single-TLE ${r.singleIters.toLocaleString('en-US')} calls (${esc(r.singleSatName)})</p>
    ${skippedNote}
  </header>

  <div class="tiles">${tiles}</div>

  ${barChart('Full catalog frame', `Propagate all ${r.commonSats.toLocaleString('en-US')} satellites to one instant — mean of ${r.frames} frames`, frameRows, 'ms')}
  ${barChart(
    'Position cruncher frame simulation',
    `Full updateSatellite work per satellite (propagate + NaN/energy checks + writes + altitude band validation) — median elset age ${fmt(r.medianElsetAgeDays, 1)} days`,
    crunchRows, 'ms',
  )}
  ${barChart('Single TLE latency', `One satellite, ${r.singleIters.toLocaleString('en-US')} individual calls at varying times since epoch`, singleRows, 'µs')}
  ${barChart('Catalog load', 'Parse + initialize every TLE once (TypeScript: createSatrec; wasm: batch add + init)', loadRows, 'ms')}

  <section class="card">
    <h2>All metrics</h2>
    <p class="subtitle">Complete statistics for every scenario, engine, and call mode</p>
    <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Scenario</th><th>Engine</th><th>Mode</th>
        <th class="num">n</th><th class="num">mean</th><th class="num">std</th>
        <th class="num">min</th><th class="num">median</th><th class="num">p95</th><th class="num">max</th><th>unit</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    </div>
  </section>

  <section class="card">
    <h2>Methodology</h2>
    <p class="note">
      All engines propagate the identical ${r.commonSats.toLocaleString('en-US')} satellites (TLEs accepted by every engine) to the same target instant.
      Timing uses <code>process.hrtime.bigint()</code>. “seam (app path)” is <code>Sgp4.propagate</code> with the wasm backend installed — exactly what
      KeepTrack executes when <code>propagatorBackend</code> is set. “fast call” is the direct <code>propagateOnePosVelFast</code> scratch-buffer call.
      “batch (api)” is one <code>propagateDs50UtcPosVel</code> call per frame including per-frame key marshalling; “batch (prebuilt)” reuses key/result
      buffers across frames and reads positions out, modeling an optimized cruncher. Cross-engine agreement was verified on ${r.parologySampleSize}
      random satellites: max position delta ${r.maxPositionDeltaKm.toExponential(2)} km. Loop outputs allocate one record per satellite (inherent to the
      per-call APIs); batch modes copy positions into preallocated arrays inside the timed region.
    </p>
  </section>
</main>
<div id="tooltip" role="status"></div>
<script>
  const tip = document.getElementById('tooltip');

  document.querySelectorAll('.bar-row').forEach((row) => {
    row.addEventListener('mousemove', (e) => {
      tip.textContent = row.dataset.tip;
      tip.style.opacity = '1';
      tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 440) + 'px';
      tip.style.top = (e.clientY + 14) + 'px';
    });
    row.addEventListener('mouseleave', () => {
      tip.style.opacity = '0';
    });
  });
</script>
</body>
</html>
`;
};
